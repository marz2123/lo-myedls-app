import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';

export interface LibraryCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  parent_id: string | null;
  order_index: number;
  company_access: string[];
}

export interface LibraryDocument {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  document_type: string;
  file_url: string | null;
  content_md: string | null;
  tags: string[];
  company_access: string[];
  ft_family_code: string | null;
  metadata: Record<string, unknown>;
  is_template: boolean;
  is_norm: boolean;
  norm_reference: string | null;
  created_at: string;
  category?: LibraryCategory;
  is_favorite?: boolean;
}

export interface LibrarySearchResult {
  document: LibraryDocument;
  relevance: number;
  matchedTags: string[];
  matchedContent: string | null;
}

export function useLibrary() {
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('library_categories')
      .select('*')
      .order('order_index');

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
    return data as LibraryCategory[];
  }, []);

  const fetchDocuments = useCallback(async (categorySlug?: string) => {
    let query = supabase
      .from('library_documents')
      .select(`
        *,
        category:library_categories(*)
      `)
      .order('created_at', { ascending: false });

    if (categorySlug) {
      const { data: cat } = await supabase
        .from('library_categories')
        .select('id')
        .eq('slug', categorySlug)
        .single();
      
      if (cat) {
        query = query.eq('category_id', cat.id);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
    return data as LibraryDocument[];
  }, []);

  const fetchFavorites = useCallback(async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('library_favorites')
      .select('document_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching favorites:', error);
      return [];
    }
    return data.map(f => f.document_id);
  }, [user]);

  const toggleFavorite = useCallback(async (documentId: string) => {
    if (!user) {
      toast.error('Connectez-vous pour ajouter aux favoris');
      return;
    }

    const isFavorite = favorites.includes(documentId);

    if (isFavorite) {
      const { error } = await supabase
        .from('library_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('document_id', documentId);

      if (error) {
        toast.error('Erreur lors de la suppression du favori');
        return;
      }
      setFavorites(prev => prev.filter(id => id !== documentId));
      toast.success('Retiré des favoris');
    } else {
      const { error } = await supabase
        .from('library_favorites')
        .insert({ user_id: user.id, document_id: documentId });

      if (error) {
        toast.error('Erreur lors de l\'ajout aux favoris');
        return;
      }
      setFavorites(prev => [...prev, documentId]);
      toast.success('Ajouté aux favoris');
    }
  }, [user, favorites]);

  const searchDocuments = useCallback(async (query: string): Promise<LibrarySearchResult[]> => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    const terms = lowerQuery.split(/\s+/).filter(t => t.length > 2);

    const { data, error } = await supabase
      .from('library_documents')
      .select(`
        *,
        category:library_categories(*)
      `);

    if (error || !data) return [];

    const results: LibrarySearchResult[] = [];

    for (const doc of data) {
      let relevance = 0;
      const matchedTags: string[] = [];
      let matchedContent: string | null = null;

      // Title match (highest weight)
      if (doc.title.toLowerCase().includes(lowerQuery)) {
        relevance += 10;
      }
      terms.forEach(term => {
        if (doc.title.toLowerCase().includes(term)) {
          relevance += 3;
        }
      });

      // Description match
      if (doc.description?.toLowerCase().includes(lowerQuery)) {
        relevance += 5;
      }

      // Tags match
      const docTags = doc.tags || [];
      docTags.forEach((tag: string) => {
        if (tag.toLowerCase().includes(lowerQuery) || terms.some(t => tag.toLowerCase().includes(t))) {
          relevance += 4;
          matchedTags.push(tag);
        }
      });

      // Content match
      if (doc.content_md?.toLowerCase().includes(lowerQuery)) {
        relevance += 2;
        const idx = doc.content_md.toLowerCase().indexOf(lowerQuery);
        matchedContent = doc.content_md.substring(Math.max(0, idx - 50), idx + 100);
      }

      // FT family match
      if (doc.ft_family_code?.toLowerCase().includes(lowerQuery)) {
        relevance += 6;
      }

      // Norm reference match
      if (doc.norm_reference?.toLowerCase().includes(lowerQuery)) {
        relevance += 8;
      }

      if (relevance > 0) {
        results.push({
          document: doc as LibraryDocument,
          relevance,
          matchedTags,
          matchedContent
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance).slice(0, 20);
  }, []);

  const getDocumentById = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('library_documents')
      .select(`
        *,
        category:library_categories(*)
      `)
      .eq('id', id)
      .single();

    if (error) return null;
    return data as LibraryDocument;
  }, []);

  const getDocumentsByFT = useCallback(async (ftCode: string) => {
    const { data, error } = await supabase
      .from('library_documents')
      .select(`
        *,
        category:library_categories(*)
      `)
      .eq('ft_family_code', ftCode);

    if (error) return [];
    return data as LibraryDocument[];
  }, []);

  const getDocumentsByTags = useCallback(async (tags: string[]) => {
    const { data, error } = await supabase
      .from('library_documents')
      .select(`
        *,
        category:library_categories(*)
      `)
      .overlaps('tags', tags);

    if (error) return [];
    return data as LibraryDocument[];
  }, []);

  const getFavoriteDocuments = useCallback(async () => {
    if (!user || favorites.length === 0) return [];

    const { data, error } = await supabase
      .from('library_documents')
      .select(`
        *,
        category:library_categories(*)
      `)
      .in('id', favorites);

    if (error) return [];
    return data as LibraryDocument[];
  }, [user, favorites]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [cats, docs, favs] = await Promise.all([
        fetchCategories(),
        fetchDocuments(),
        fetchFavorites()
      ]);
      setCategories(cats);
      setDocuments(docs);
      setFavorites(favs);
      setLoading(false);
    };
    loadData();
  }, [fetchCategories, fetchDocuments, fetchFavorites]);

  return {
    categories,
    documents,
    favorites,
    loading,
    toggleFavorite,
    searchDocuments,
    getDocumentById,
    getDocumentsByFT,
    getDocumentsByTags,
    getFavoriteDocuments,
    fetchDocuments,
    isFavorite: (id: string) => favorites.includes(id)
  };
}
