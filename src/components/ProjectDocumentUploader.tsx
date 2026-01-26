import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, X, Loader2, FileCheck, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedAt: string;
}

export interface ProjectDocumentUploaderProps {
  projectId?: string;
  documents: Document[];
  onDocumentsChange: (documents: Document[]) => void;
  documentType?: string;
}

const documentTypes: Record<string, { label: string; labelEn: string; icon: any }> = {
  plan: { label: "Plans", labelEn: "Plans", icon: FileText },
  diagnostic: { label: "Diagnostics", labelEn: "Diagnostics", icon: FileCheck },
  bet: { label: "Rapport BET", labelEn: "BET Report", icon: FileCheck },
  preconisation: { label: "Préconisations", labelEn: "Recommendations", icon: FileCheck },
  permis: { label: "Permis", labelEn: "Permits", icon: FileCheck },
  arrete: { label: "Arrêtés de péril", labelEn: "Danger Orders", icon: FileCheck },
  autres: { label: "Autres", labelEn: "Others", icon: FileText },
};

export const ProjectDocumentUploader = ({ 
  projectId, 
  documents, 
  onDocumentsChange,
  documentType
}: ProjectDocumentUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Check if project has document analysis
  useEffect(() => {
    if (projectId && documents.length > 0) {
      checkAnalysisStatus();
    }
  }, [projectId, documents]);

  const checkAnalysisStatus = async () => {
    if (!projectId) return;
    
    const { data } = await supabase
      .from('projects')
      .select('template_data')
      .eq('id', projectId)
      .single();
    
    if (data?.template_data && typeof data.template_data === 'object') {
      const templateData = data.template_data as any;
      if (templateData.document_analysis) {
        setHasAnalysis(true);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 10 MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${docType}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-documents')
        .getPublicUrl(fileName);

      const newDoc: Document = {
        id: crypto.randomUUID(),
        name: file.name,
        type: docType,
        url: publicUrl,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };

      const updatedDocs = [...documents, newDoc];
      onDocumentsChange(updatedDocs);

      // Update project in database if projectId exists
      if (projectId) {
        await supabase
          .from('projects')
          .update({ project_documents: updatedDocs as any })
          .eq('id', projectId);

        // Trigger AI analysis of documents
        toast({
          title: "🤖 Analyse IA en cours...",
          description: "Analyse des documents pour l'extraction des tâches",
        });

        const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
          'analyze-project-documents',
          {
            body: { projectId, documents: updatedDocs }
          }
        );

        if (analysisError) {
          console.error('Document analysis error:', analysisError);
          toast({
            title: "⚠️ Analyse partiellement réussie",
            description: "Document ajouté mais analyse IA échouée",
            variant: "destructive",
          });
        } else {
          toast({
            title: "✅ Document analysé",
            description: "Contexte enrichi pour l'extraction des tâches",
          });
          setHasAnalysis(true);
        }
      } else {
        toast({
          title: "✅ Document ajouté",
          description: `${file.name} a été téléchargé`,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur d'upload",
        description: error instanceof Error ? error.message : "Impossible de télécharger le fichier",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    try {
      const updatedDocs = documents.filter(d => d.id !== doc.id);
      onDocumentsChange(updatedDocs);

      // Delete from storage
      const fileName = doc.url.split('/').pop();
      if (fileName) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.storage
            .from('project-documents')
            .remove([`${user.id}/${fileName}`]);
        }
      }

      // Update project in database if projectId exists
      if (projectId) {
        await supabase
          .from('projects')
          .update({ project_documents: updatedDocs as any })
          .eq('id', projectId);
      }

      toast({
        title: "Document supprimé",
        description: `${doc.name} a été retiré`,
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {!documentType && (
        <div>
          <Label className="text-base font-semibold">
            Documents de préparation
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Plans, rapports BET, diagnostics, DTG, préconisations...
          </p>
        </div>
      )}

      {hasAnalysis && documents.length > 0 && !documentType && (
        <Alert className="bg-primary/5 border-primary/20">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>🤖 IA enrichie :</strong> Les documents ont été analysés pour améliorer l'extraction des tâches
          </AlertDescription>
        </Alert>
      )}

      {documentType ? (
        // Single document type upload
        <div className="relative">
          <input
            type="file"
            id={`upload-${documentType}`}
            className="hidden"
            accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
            onChange={(e) => handleFileUpload(e, documentType)}
            disabled={isUploading}
          />
          <Button
            variant="outline"
            className="w-full justify-center gap-2"
            onClick={() => document.getElementById(`upload-${documentType}`)?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>Ajouter un document</span>
          </Button>
        </div>
      ) : (
        // All document types grid
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(documentTypes).map(([key, { label, icon: Icon }]) => (
            <div key={key} className="relative">
              <input
                type="file"
                id={`upload-${key}`}
                className="hidden"
                accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e, key)}
                disabled={isUploading}
              />
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => document.getElementById(`upload-${key}`)?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4 mr-2" />
                )}
                <span className="truncate">{label}</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      {!documentType && documents.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Documents ajoutés ({documents.length})</Label>
          <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
            {documents.map((doc) => {
              const docTypeInfo = documentTypes[doc.type as keyof typeof documentTypes];
              const Icon = docTypeInfo?.icon || FileText;
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className="w-4 h-4 flex-shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {docTypeInfo?.label || doc.type} • {formatFileSize(doc.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => handleDeleteDocument(doc)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};