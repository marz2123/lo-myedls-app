import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Sparkles, Mic, History, Plus, Image as ImageIcon, Lightbulb, GraduationCap, ThumbsUp, ThumbsDown, Brain } from "lucide-react";
import { SimpleAudioRecorder } from "@/utils/audioRecorder";
import { Badge } from "@/components/ui/badge";
import { useMyAladinLearning } from "@/hooks/useMyAladinLearning";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MyAladinChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyType?: string;
  contextType?: 'template' | 'general' | 'project' | 'task';
  contextData?: any;
  onApplyTemplate?: (content: string) => void;
}

export const MyAladinChat = ({
  open,
  onOpenChange,
  propertyType,
  contextType = 'general',
  contextData,
  onApplyTemplate
}: MyAladinChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [tutorialMode, setTutorialMode] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [proactiveSuggestions, setProactiveSuggestions] = useState<string[]>([]);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, 'positive' | 'negative'>>({});
  const { t } = useLanguage();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRecorderRef = useRef<SimpleAudioRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const language = t('cancel') === 'Annuler' ? 'fr' : 'en';
  const { submitFeedback, trackAction } = useMyAladinLearning();

  // Load conversations history and generate suggestions
  useEffect(() => {
    if (open) {
      loadConversations();
      generateProactiveSuggestions();
    }
  }, [open]);

  // Initialize or load conversation
  useEffect(() => {
    if (open && !currentConversationId) {
      startNewConversation();
    } else if (open && currentConversationId) {
      loadConversationMessages(currentConversationId);
    }
  }, [open, currentConversationId]);

  const loadConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('myaladin_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setConversations(data);
    }
  };

  const startNewConversation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('myaladin_conversations')
      .insert({
        user_id: user.id,
        title: language === 'fr' ? 'Nouvelle conversation' : 'New conversation',
        context_type: contextType,
        context_data: contextData || { propertyType }
      })
      .select()
      .single();

    if (!error && data) {
      setCurrentConversationId(data.id);
      
      const welcomeMessage: Message = {
        role: 'assistant',
        content: getWelcomeMessage(),
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      
      await supabase.from('myaladin_messages').insert({
        conversation_id: data.id,
        role: 'assistant',
        content: welcomeMessage.content
      });
    }
  };

  const generateProactiveSuggestions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's usage patterns
    const { data: projects } = await supabase
      .from('projects')
      .select('property_type, template_data, created_at, archived')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: tasks } = await supabase
      .from('extracted_tasks')
      .select('source_type, category_id, family_id')
      .eq('user_id', user.id)
      .limit(50);

    const suggestions = [];

    // Project creation suggestions
    if (projects && projects.length === 0) {
      suggestions.push(language === 'fr' 
        ? "Creez votre premier projet d'inspection pour commencer"
        : "Create your first inspection project to get started"
      );
    }

    // Task extraction method suggestions
    if (tasks && tasks.length > 0) {
      const audioTasks = tasks.filter(t => t.source_type === 'audio').length;
      const photoTasks = tasks.filter(t => t.source_type === 'photo').length;
      const pdfTasks = tasks.filter(t => t.source_type === 'pdf').length;
      
      if (audioTasks < 3) {
        suggestions.push(language === 'fr'
          ? "Essayez l'extraction vocale pour plus de rapidite sur site"
          : "Try voice extraction for faster on-site work"
        );
      }
      
      if (photoTasks < 3) {
        suggestions.push(language === 'fr'
          ? "Ajoutez des photos pour documenter visuellement les defauts"
          : "Add photos to visually document defects"
        );
      }
      
      if (pdfTasks === 0 && projects && projects.length > 2) {
        suggestions.push(language === 'fr'
          ? "Importez des rapports PDF pour gagner du temps"
          : "Import PDF reports to save time"
        );
      }
    }

    // Classification suggestions
    if (tasks && tasks.length > 5) {
      const unclassifiedTasks = tasks.filter(t => !t.category_id || !t.family_id).length;
      if (unclassifiedTasks > 0) {
        suggestions.push(language === 'fr'
          ? "Classifiez vos taches selon la structure DSC pour l'automatisation"
          : "Classify your tasks according to DSC structure for automation"
        );
      }
    }

    // Archive suggestions
    if (projects && projects.length > 5) {
      const archivedCount = projects.filter(p => p.archived).length;
      const activeCount = projects.filter(p => !p.archived).length;
      
      if (archivedCount === 0 && activeCount > 5) {
        suggestions.push(language === 'fr'
          ? "Archivez vos projets termines pour mieux organiser votre liste"
          : "Archive completed projects to better organize your list"
        );
      }
    }

    // Dashboard exploration
    if (projects && projects.length > 3 && tasks && tasks.length > 10) {
      suggestions.push(language === 'fr'
        ? "Consultez votre tableau de bord pour analyser vos tendances"
        : "Check your dashboard to analyze your trends"
      );
    }

    setProactiveSuggestions(suggestions.slice(0, 4)); // Limit to 4 suggestions
  };

  const getWelcomeMessage = () => {
    if (tutorialMode) {
      return language === 'fr'
        ? `Bienvenue dans le tutoriel MyEDLs ! Je suis MyAladin, votre guide !\n\nJe vais vous accompagner etape par etape pour decouvrir l'application.\n\nEtape 1: Comprendre les projets\n\nDans MyEDLs, vous creez des "EDL" (Etats Des Lieux) - ce sont vos projets d'inspection. Chaque EDL represente un bien immobilier que vous inspectez.\n\nVoulez-vous que je vous montre comment creer votre premier EDL ?`
        : `Welcome to the MyEDLs tutorial! I'm MyAladin, your guide!\n\nI'll guide you step by step through the application.\n\nStep 1: Understanding Projects\n\nIn MyEDLs, you create "EDL" (Property Reports) - these are your inspection projects. Each EDL represents a property you inspect.\n\nWould you like me to show you how to create your first EDL?`;
    }

    if (contextType === 'template' && propertyType) {
      return language === 'fr'
        ? `Bonjour ! Je suis MyAladin, votre genie personnel !\n\nAstuce: Vous pouvez m'envoyer une photo du bien pour que j'analyse et suggere des champs de template adaptes !\n\nJe vais vous guider pour creer un template d'inspection pour votre ${propertyType}.\n\nQue souhaitez-vous collecter lors de vos inspections ?`
        : `Hello! I'm MyAladin, your personal genie!\n\nTip: You can send me a photo of the property and I'll analyze it to suggest relevant template fields!\n\nI'll guide you to create an inspection template for your ${propertyType}.\n\nWhat do you want to collect during your inspections?`;
    }
    
    return language === 'fr'
      ? `Bonjour ! Je suis MyAladin, votre genie et coach personnel !\n\nJe suis la pour vous accompagner dans TOUTES vos actions :\n\n**Questions & Aide**\n- Repondre a toutes vos questions\n- Expliquer chaque fonctionnalite\n- Resoudre vos problemes\n\n**Coaching personnalise**\n- Creer et optimiser vos projets\n- Extraire des taches (texte, audio, photos, PDF)\n- Classifier selon la structure DSC\n- Gerer et archiver vos EDL\n\n**Analyse intelligente**\n- Analyser vos photos de biens\n- Suggerer des ameliorations\n- Detecter des opportunites d'optimisation\n\n**Accompagnement proactif**\n- Conseils sur vos workflows\n- Bonnes pratiques d'inspection\n- Suggestions basees sur votre utilisation\n\n**Mode tutoriel** pour les debutants\n\nComment puis-je vous aider aujourd'hui ?`
      : `Hello! I'm MyAladin, your personal genie and coach!\n\nI'm here to help you with ALL your actions:\n\n**Questions & Help**\n- Answer all your questions\n- Explain every feature\n- Solve your problems\n\n**Personalized Coaching**\n- Create and optimize your projects\n- Extract tasks (text, audio, photos, PDF)\n- Classify according to DSC structure\n- Manage and archive your EDL\n\n**Smart Analysis**\n- Analyze your property photos\n- Suggest improvements\n- Detect optimization opportunities\n\n**Proactive Support**\n- Workflow advice\n- Inspection best practices\n- Usage-based suggestions\n\n**Tutorial mode** for beginners\n\nHow can I help you today?`;
  };

  const loadConversationMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('myaladin_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at)
      })));
    }
  };

  const saveConversationTitle = async (conversationId: string, firstUserMessage: string) => {
    const title = firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? '...' : '');
    await supabase
      .from('myaladin_conversations')
      .update({ title })
      .eq('id', conversationId);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const imageUrls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      const base64 = await base64Promise;
      imageUrls.push(base64);
    }

    setUploadedImages(prev => [...prev, ...imageUrls]);
    
    toast({
      title: language === 'fr' ? '📸 Images ajoutées' : '📸 Images added',
      description: language === 'fr' 
        ? 'Envoyez votre message pour que MyAladin analyse les images'
        : 'Send your message for MyAladin to analyze the images',
    });
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if ((!messageText && uploadedImages.length === 0) || isLoading || !currentConversationId) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Save user message
      await supabase.from('myaladin_messages').insert({
        conversation_id: currentConversationId,
        role: 'user',
        content: messageText
      });

      // Update conversation title with first user message
      if (messages.length === 1) {
        await saveConversationTitle(currentConversationId, messageText);
      }

      const conversationHistory = [...messages, userMessage];
      
      // Get user's usage statistics for context
      const { data: { user } } = await supabase.auth.getUser();
      let userStats = null;
      
      if (user) {
        const { data: projectCount } = await supabase
          .from('projects')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id);
          
        const { data: taskCount } = await supabase
          .from('extracted_tasks')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id);
          
        const { data: templateCount } = await supabase
          .from('custom_templates')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id);
        
        userStats = {
          projectCount: projectCount?.length || 0,
          taskCount: taskCount?.length || 0,
          templateCount: templateCount?.length || 0
        };
      }
      
      let systemPrompt = '';
      
      const baseSystemContext = language === 'fr'
        ? `Tu es MyAladin, le genie intelligent et coach personnel de MyEDLs !

## TES ROLES PRINCIPAUX

**Reponse a Toute Question**
- Reponds a TOUTES les questions sur l'application
- Explique CHAQUE fonctionnalite en detail
- Aide a resoudre TOUS les problemes techniques
- Guide l'utilisateur dans TOUTES ses actions

**Coach Personnel sur TOUTES les Actions**
- Conseille sur la creation et gestion de projets
- Guide sur l'extraction de taches (texte, audio, photos, PDF)
- Aide a la classification DSC
- Optimise les workflows d'inspection
- Suggere des ameliorations pour CHAQUE action
- Identifie les bonnes pratiques pour TOUTES les fonctionnalites

**Analyse Intelligente**
- Photos de biens: identifie type, elements, defauts
- Projets: analyse structure et organisation
- Taches: evalue classification et pertinence
- Workflows: detecte les opportunites d'optimisation

**Accompagnement Proactif**
- Analyse l'utilisation globale de l'utilisateur
- Propose des ameliorations personnalisees sur TOUTES les actions
- Suggere des prochaines etapes pertinentes
- Commente et conseille sur chaque decision
- Identifie les fonctionnalites sous-utilisees

**Guide Tutoriel**
- Mode debutant: guide etape par etape
- Explique clairement chaque concept
- Donne des exemples concrets
- Encourage et felicite les progres

## L'APPLICATION MyEDLs - TOUTES LES FONCTIONNALITES

**Gestion de Projets (EDL):**
- Creer des projets d'inspection avec infos du bien
- Types de biens: building, house, apartment, commercial
- Informations: adresse, nombre d'unites, parking, garage, box
- Templates personnalises pour structurer les inspections
- Archivage des projets termines

**Extraction de Taches Multi-Sources:**
- Texte: descriptions manuelles de defauts
- Audio: enregistrement vocal sur site
- Photos: documentation visuelle
- Videos: extraction de frames cles
- PDF: import de rapports tiers

**Classification DSC:**
- Structure hierarchique: Famille > Categorie > Sous-categorie
- Classification automatique par IA
- Permet l'automatisation dans MyChantiers

**Dashboard & Statistiques:**
- Projets actifs vs archives
- Tendances mensuelles d'extraction
- Repartition par type de bien
- Projets les plus productifs

**Workflow Complet:**
1. Creer un EDL avec infos du bien
2. Choisir/creer un template d'inspection
3. Ajouter informations (texte, audio, photos)
4. Extraire et classifier les taches
5. Consulter les statistiques
6. Archiver les projets termines

## TON APPROCHE DE COACHING

- Commente et conseille sur CHAQUE action de l'utilisateur
- Ne te limite PAS aux templates, couvre TOUTES les fonctionnalites
- Propose des ameliorations pour TOUTES les etapes du workflow
- Analyse l'utilisation globale et suggere des optimisations
- Sois precis, utile et enthousiaste !
- Adapte ton niveau d'explication selon l'utilisateur
- Suggere TOUJOURS des prochaines etapes concretes`
        : `You are MyAladin, the smart genie and personal coach of MyEDLs!

## YOUR MAIN ROLES

**Answer Every Question**
- Answer ALL questions about the application
- Explain EVERY feature in detail
- Help solve ALL technical problems
- Guide user in ALL their actions

**Personal Coach on ALL Actions**
- Advise on project creation and management
- Guide on task extraction (text, audio, photos, PDF)
- Help with DSC classification
- Optimize inspection workflows
- Suggest improvements for EVERY action
- Identify best practices for ALL features

**Smart Analysis**
- Property photos: identify type, elements, defects
- Projects: analyze structure and organization
- Tasks: evaluate classification and relevance
- Workflows: detect optimization opportunities

**Proactive Support**
- Analyze user's overall usage
- Propose personalized improvements on ALL actions
- Suggest relevant next steps
- Comment and advise on every decision
- Identify underutilized features

**Tutorial Guide**
- Beginner mode: step-by-step guidance
- Clearly explain each concept
- Give concrete examples
- Encourage and celebrate progress

## THE MyEDLs APPLICATION - ALL FEATURES

**Project Management (EDL):**
- Create inspection projects with property info
- Property types: building, house, apartment, commercial
- Information: address, number of units, parking, garage, box
- Custom templates to structure inspections
- Archive completed projects

**Multi-Source Task Extraction:**
- Text: manual defect descriptions
- Audio: voice recording on site
- Photos: visual documentation
- Videos: key frame extraction
- PDF: import third-party reports

**DSC Classification:**
- Hierarchical structure: Family > Category > Subcategory
- Automatic AI classification
- Enables automation in MyChantiers

**Dashboard & Statistics:**
- Active vs archived projects
- Monthly extraction trends
- Distribution by property type
- Most productive projects

**Complete Workflow:**
1. Create EDL with property info
2. Choose/create inspection template
3. Add information (text, audio, photos)
4. Extract and classify tasks
5. Review statistics
6. Archive completed projects

## YOUR COACHING APPROACH

- Comment and advise on EVERY user action
- Don't limit yourself to templates, cover ALL features
- Propose improvements for ALL workflow steps
- Analyze overall usage and suggest optimizations
- Be precise, helpful and enthusiastic!
- Adapt your explanation level to the user
- ALWAYS suggest concrete next steps`;

      if (tutorialMode) {
        systemPrompt = baseSystemContext + (language === 'fr'
          ? `\n\n## MODE TUTORIEL ACTIF\n\nTu es en mode guide pour débutant. Procède étape par étape:\n1. Explique les concepts de base\n2. Donne des exemples concrets\n3. Pose des questions pour vérifier la compréhension\n4. Félicite les progrès\n5. Propose la prochaine étape\n\nNe surcharge pas d'informations, reste simple et clair.`
          : `\n\n## TUTORIAL MODE ACTIVE\n\nYou're in beginner guide mode. Proceed step by step:\n1. Explain basic concepts\n2. Give concrete examples\n3. Ask questions to verify understanding\n4. Celebrate progress\n5. Suggest the next step\n\nDon't overload with information, stay simple and clear.`);
      } else if (contextType === 'template') {
        systemPrompt = baseSystemContext + (language === 'fr'
          ? `\n\n## CONTEXTE: Création de Template\n\nFormat du template:\n- Sections: "Nom de section:"\n- Champs: "- Nom du champ: (exemple)"\n\nSi l'utilisateur envoie une photo, analyse-la et suggère automatiquement les sections et champs pertinents pour ce type de bien.`
          : `\n\n## CONTEXT: Template Creation\n\nTemplate format:\n- Sections: "Section name:"\n- Fields: "- Field name: (example)"\n\nIf user sends a photo, analyze it and automatically suggest relevant sections and fields for this property type.`);
      } else {
        systemPrompt = baseSystemContext;
      }
      
      // Add user stats context
      if (userStats) {
        systemPrompt += language === 'fr'
          ? `\n\n## STATISTIQUES UTILISATEUR\n\nL'utilisateur a:\n- ${userStats.projectCount} projet(s)\n- ${userStats.taskCount} tâche(s) extraite(s)\n- ${userStats.templateCount} template(s) personnalisé(s)\n\nUtilise ces informations pour personnaliser tes suggestions et conseils.`
          : `\n\n## USER STATISTICS\n\nThe user has:\n- ${userStats.projectCount} project(s)\n- ${userStats.taskCount} extracted task(s)\n- ${userStats.templateCount} custom template(s)\n\nUse this information to personalize your suggestions and advice.`;
      }

      const { data, error } = await supabase.functions.invoke('myaladin-chat', {
        body: {
          messages: conversationHistory,
          systemPrompt,
          contextType,
          contextData: contextData || { propertyType },
          language,
          images: uploadedImages.length > 0 ? uploadedImages : undefined,
          tutorialMode
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Clear uploaded images after sending
      setUploadedImages([]);

      // Save assistant message
      await supabase.from('myaladin_messages').insert({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: data.message
      });

      // Update conversation timestamp
      await supabase
        .from('myaladin_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentConversationId);
      
      // Regenerate suggestions after interaction
      generateProactiveSuggestions();

      // Check if response contains a template
      if (data.message.includes('```') || data.message.includes(':') && data.message.includes('-')) {
        // Show apply button after a short delay
        setTimeout(() => {
          const applyMessage: Message = {
            role: 'assistant',
            content: language === 'fr'
              ? 'Voila ! J\'ai cree ce template pour vous ! Voulez-vous l\'appliquer maintenant ?'
              : 'There you go! I\'ve created this template for you! Would you like to apply it now?',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, applyMessage]);
        }, 1000);
      }

    } catch (error) {
      console.error('Error in MyAladin chat:', error);
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: error instanceof Error ? error.message : 'Failed to get response',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTemplate = () => {
    // Extract template from last assistant messages
    const lastMessages = messages.filter(m => m.role === 'assistant').slice(-3);
    let templateContent = '';
    
    for (const msg of lastMessages) {
      // Look for code blocks or structured content
      const codeBlockMatch = msg.content.match(/```(?:template)?\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        templateContent = codeBlockMatch[1];
        break;
      }
      
      // Look for content with sections and fields
      if (msg.content.includes(':') && msg.content.includes('-')) {
        const lines = msg.content.split('\n');
        const structuredLines = lines.filter(line => {
          const trimmed = line.trim();
          return trimmed.endsWith(':') || trimmed.startsWith('-');
        });
        
        if (structuredLines.length > 0) {
          templateContent = structuredLines.join('\n');
          break;
        }
      }
    }

    if (templateContent && onApplyTemplate) {
      onApplyTemplate(templateContent);
      toast({
        title: language === 'fr' ? 'Template applique !' : 'Template applied!',
        description: language === 'fr'
          ? 'MyAladin a applique votre template avec succes !'
          : 'MyAladin successfully applied your template!',
      });
      onOpenChange(false);
    } else {
      toast({
        title: language === 'fr' ? 'Aucun template detecte' : 'No template detected',
        description: language === 'fr'
          ? 'Continuez la conversation pour que MyAladin cree votre template'
          : 'Continue the conversation for MyAladin to create your template',
      });
    }
  };

  const handleVoiceRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (audioRecorderRef.current) {
        const audioBlob = await audioRecorderRef.current.stop();
        setIsRecording(false);
        
        // Transcribe audio
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          try {
            const { data, error } = await supabase.functions.invoke('transcribe-and-extract', {
              body: { audio: base64Audio }
            });

            if (error) throw error;
            
            if (data.text) {
              handleSendMessage(data.text);
            }
          } catch (error) {
            console.error('Transcription error:', error);
            toast({
              title: language === 'fr' ? '❌ Erreur' : '❌ Error',
              description: language === 'fr' 
                ? 'Erreur lors de la transcription'
                : 'Error during transcription',
              variant: "destructive",
            });
          }
        };
        reader.readAsDataURL(audioBlob);
      }
    } else {
      // Start recording
      try {
        audioRecorderRef.current = new SimpleAudioRecorder();
        await audioRecorderRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error starting recording:', error);
        toast({
          title: language === 'fr' ? '❌ Erreur' : '❌ Error',
          description: language === 'fr' 
            ? 'Impossible d\'accéder au microphone'
            : 'Cannot access microphone',
          variant: "destructive",
        });
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="pr-14">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-purple-600" />
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent font-bold">
                MyAladin
              </span>
              <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTutorialMode(!tutorialMode)}
                title={language === 'fr' ? 'Mode tutoriel' : 'Tutorial mode'}
                className={tutorialMode ? 'bg-purple-100 dark:bg-purple-900' : ''}
              >
                <GraduationCap className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHistory(!showHistory)}
                title={language === 'fr' ? 'Historique' : 'History'}
              >
                <History className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={startNewConversation}
                title={language === 'fr' ? 'Nouvelle conversation' : 'New conversation'}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {proactiveSuggestions.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              <span>{language === 'fr' ? 'Suggestions pour vous' : 'Suggestions for you'}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {proactiveSuggestions.map((suggestion, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleSendMessage(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {showHistory && (
          <ScrollArea className="h-32 mb-4 border rounded-lg p-2">
            <div className="space-y-2">
              {conversations.map((conv) => (
                <Button
                  key={conv.id}
                  variant="ghost"
                  className="w-full justify-start text-left"
                  onClick={() => {
                    setCurrentConversationId(conv.id);
                    setShowHistory(false);
                  }}
                >
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium">{conv.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}

        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border border-purple-200 dark:border-purple-800'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                          MyAladin
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-50 dark:bg-purple-900/50 border-purple-300">
                          Deep Learning
                        </Badge>
                      </div>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    {message.role === 'assistant' && index > 0 && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-6 w-6 ${feedbackGiven[index] === 'positive' ? 'bg-green-100 dark:bg-green-900' : ''}`}
                          onClick={() => {
                            if (currentConversationId) {
                              submitFeedback({
                                conversationId: currentConversationId,
                                messageContent: message.content,
                                feedbackType: 'positive'
                              });
                              setFeedbackGiven(prev => ({ ...prev, [index]: 'positive' }));
                              toast({
                                title: '🧠 Merci !',
                                description: 'J\'apprends de votre feedback positif',
                              });
                            }
                          }}
                          disabled={!!feedbackGiven[index]}
                        >
                          <ThumbsUp className={`h-3 w-3 ${feedbackGiven[index] === 'positive' ? 'text-green-600' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-6 w-6 ${feedbackGiven[index] === 'negative' ? 'bg-red-100 dark:bg-red-900' : ''}`}
                          onClick={() => {
                            if (currentConversationId) {
                              submitFeedback({
                                conversationId: currentConversationId,
                                messageContent: message.content,
                                feedbackType: 'negative'
                              });
                              setFeedbackGiven(prev => ({ ...prev, [index]: 'negative' }));
                              toast({
                                title: '🧠 Noté !',
                                description: 'Je m\'améliorerai pour la prochaine fois',
                              });
                            }
                          }}
                          disabled={!!feedbackGiven[index]}
                        >
                          <ThumbsDown className={`h-3 w-3 ${feedbackGiven[index] === 'negative' ? 'text-red-600' : ''}`} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border border-purple-200 dark:border-purple-800 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs text-muted-foreground">
                      {language === 'fr' ? 'MyAladin reflechit...' : 'MyAladin is thinking...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-2 pt-4 border-t">
          {uploadedImages.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {uploadedImages.map((img, idx) => (
                <div key={idx} className="relative">
                  <img src={img} alt="" className="h-16 w-16 object-cover rounded" />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                    onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              multiple
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              size="icon"
              variant="outline"
              title={language === 'fr' ? 'Ajouter des photos' : 'Add photos'}
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleVoiceRecording}
              disabled={isLoading}
              size="icon"
              variant={isRecording ? "destructive" : "outline"}
              title={language === 'fr' 
                ? (isRecording ? 'Arrêter l\'enregistrement' : 'Enregistrer un message vocal')
                : (isRecording ? 'Stop recording' : 'Record a voice message')
              }
            >
              <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={language === 'fr' ? 'Tapez votre message...' : 'Type your message...'}
              disabled={isLoading || isRecording}
              className="flex-1"
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={isLoading || (!input.trim() && uploadedImages.length === 0) || isRecording}
              size="icon"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          
          {messages.some(m => m.role === 'assistant' && (m.content.includes('```') || (m.content.includes(':') && m.content.includes('-')))) && (
            <Button
              onClick={handleApplyTemplate}
              variant="outline"
              className="w-full gap-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 hover:from-purple-600 hover:to-blue-600"
            >
              <Sparkles className="w-4 h-4" />
              {language === 'fr' ? 'Appliquer ce template magique' : 'Apply this magic template'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};