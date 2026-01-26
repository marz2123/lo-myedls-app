// MyAladin Full Experience Component
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  Send, 
  Mic, 
  MicOff, 
  Loader2,
  FileText,
  MapPin,
  CheckCircle2,
  Building2,
  Plus,
  MessageSquare,
  Trash2,
  Menu,
  ChevronRight,
  AudioLines,
  Camera,
  MoreHorizontal,
  X,
  FolderPlus,
  Home,
  Share,
  Pencil,
  Archive,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { ProjectCreationWizard } from "@/components/project/ProjectCreationWizard";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  images?: string[];
  type?: 'text' | 'task' | 'report' | 'location';
  metadata?: {
    tasks?: Array<{ title: string; location: string; description: string }>;
    location?: string;
    projectId?: string;
  };
}

interface ConversationContextData {
  projectId?: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  context_data?: ConversationContextData | null;
}

interface MyAladinFullExperienceProps {
  onBack: () => void;
}

const SUGGESTIONS = [
  { title: "Créer un EDL", subtitle: "Démarrer une visite terrain", action: 'edl' },
  { title: "Créer un projet", subtitle: "d'un immeuble ou appartement", action: 'create' },
  { title: "Analyser des photos", subtitle: "pour extraire les tâches", action: 'photos' },
  { title: "Générer un rapport", subtitle: "EDL complet", action: 'report' },
];

export const MyAladinFullExperience = ({ onBack }: MyAladinFullExperienceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentProject, setCurrentProject] = useState<{ id: string; address: string } | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<Array<{ title: string; location: string; description: string }>>([]);
  
  // Conversation management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  
  // Rename dialog
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameConversationId, setRenameConversationId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  // Project creation wizard
  const [showProjectWizard, setShowProjectWizard] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const navigate = useNavigate();


  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('myaladin_conversations')
        .select('id, title, updated_at, context_data')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setConversations(data.map(conv => ({
          id: conv.id,
          title: conv.title,
          updated_at: conv.updated_at,
          context_data: conv.context_data as ConversationContextData | null,
        })));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('myaladin_conversations')
        .insert({
          user_id: user.id,
          title: 'Nouvelle conversation',
          context_type: 'general',
        })
        .select()
        .single();

      if (!error && data) {
        const newConv: Conversation = {
          id: data.id,
          title: data.title,
          updated_at: data.updated_at,
          context_data: data.context_data as ConversationContextData | null,
        };
        setConversations(prev => [newConv, ...prev]);
        setCurrentConversationId(data.id);
        setMessages([]);
        setCurrentProject(null);
        setExtractedTasks([]);
        return data.id;
      }
      return null;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error("Erreur lors de la création de la conversation");
      return null;
    }
  };

  const startNewChat = async () => {
    setCurrentConversationId(null);
    setMessages([]);
    setCurrentProject(null);
    setExtractedTasks([]);
    setSidebarOpen(false);
  };

  const loadConversation = async (conversationId: string) => {
    try {
      setCurrentConversationId(conversationId);
      setIsLoading(true);
      setSidebarOpen(false);

      const { data, error } = await supabase
        .from('myaladin_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        setMessages(data.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
        })));
      } else {
        setMessages([]);
      }

      setCurrentProject(null);
      setExtractedTasks([]);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string, projectId?: string) => {
    try {
      // Delete associated project if exists
      if (projectId) {
        // Delete tasks associated with project
        await supabase
          .from('extracted_tasks')
          .delete()
          .eq('project_id', projectId);
        
        // Delete the project
        await supabase
          .from('projects')
          .delete()
          .eq('id', projectId);
      }

      await supabase
        .from('myaladin_messages')
        .delete()
        .eq('conversation_id', conversationId);

      await supabase
        .from('myaladin_conversations')
        .delete()
        .eq('id', conversationId);

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
        setCurrentProject(null);
      }
      
      toast.success(projectId ? "Projet et conversation supprimés" : "Conversation supprimée");
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const updateConversationTitle = async (conversationId: string, title: string) => {
    try {
      await supabase
        .from('myaladin_conversations')
        .update({ title: title.slice(0, 50), updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      setConversations(prev => prev.map(c => 
        c.id === conversationId ? { ...c, title: title.slice(0, 50) } : c
      ));
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  };

  const openRenameDialog = (conversationId: string, currentTitle: string) => {
    setRenameConversationId(conversationId);
    setRenameValue(currentTitle);
    setRenameDialogOpen(true);
  };

  const handleRename = async () => {
    if (!renameConversationId || !renameValue.trim()) return;
    
    await updateConversationTitle(renameConversationId, renameValue.trim());
    setRenameDialogOpen(false);
    setRenameConversationId(null);
    setRenameValue('');
    toast.success("Conversation renommée");
  };

  const shareConversation = async (conversationId: string) => {
    try {
      // Get conversation messages
      const { data: messagesData } = await supabase
        .from('myaladin_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      const conversation = conversations.find(c => c.id === conversationId);
      
      if (messagesData && messagesData.length > 0) {
        const shareText = `Conversation: ${conversation?.title || 'Conversation MyAladin'}\n\n${messagesData.map(m => 
          `${m.role === 'user' ? 'User' : 'MyAladin'}: ${m.content}`
        ).join('\n\n')}`;
        
        if (navigator.share) {
          await navigator.share({
            title: conversation?.title || 'Conversation MyAladin',
            text: shareText,
          });
        } else {
          await navigator.clipboard.writeText(shareText);
          toast.success("Conversation copiée dans le presse-papiers");
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error("Erreur lors du partage");
    }
  };

  const archiveConversation = async (conversationId: string) => {
    try {
      // Update conversation title to mark as archived
      const conversation = conversations.find(c => c.id === conversationId);
      const newTitle = conversation?.title.startsWith('📦') 
        ? conversation.title 
        : `📦 ${conversation?.title || 'Conversation'}`;
      
      await updateConversationTitle(conversationId, newTitle);
      toast.success("Conversation archivée");
    } catch (error) {
      console.error('Error archiving:', error);
      toast.error("Erreur lors de l'archivage");
    }
  };

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const saveMessageToDb = async (conversationId: string, role: 'user' | 'assistant', content: string) => {
    await supabase.from('myaladin_messages').insert({
      conversation_id: conversationId,
      role,
      content,
    });
  };

  const handleSendMessage = async (customMessage?: string) => {
    const messageText = customMessage || input.trim();
    if (!messageText || isLoading) return;

    // Check for EDL-related commands first
    const edlTriggers = ['créer un edl', 'creer un edl', 'démarrer edl', 'demarrer edl', 'nouveau edl', 'visite edl', 'lancer edl', 'faire un edl'];
    const isEDLRequest = edlTriggers.some(trigger => messageText.toLowerCase().includes(trigger));
    
    if (isEDLRequest) {
      setInput('');
      addMessage({ role: 'user', content: messageText });
      
      // Conversational EDL launch
      handleStartEDLCapture();
      return;
    }

    // Create conversation if none exists
    let convId = currentConversationId;
    if (!convId) {
      convId = await createNewConversation();
      if (!convId) return;
    }

    setInput('');
    addMessage({ role: 'user', content: messageText });
    await saveMessageToDb(convId, 'user', messageText);
    setIsLoading(true);

    // Update conversation title with first user message
    if (messages.length === 0) {
      await updateConversationTitle(convId, messageText);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Veuillez vous connecter");
        setIsLoading(false);
        return;
      }

      const context = {
        currentProject,
        extractedTasks,
        messageHistory: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      };

      const systemPrompt = `Tu es MyAladin, un assistant IA expert en états des lieux immobiliers.
      
Contexte actuel:
- Projet en cours: ${currentProject ? `${currentProject.address} (ID: ${currentProject.id})` : 'Aucun'}
- Tâches extraites: ${extractedTasks.length}

Tu dois:
1. Aider l'utilisateur à créer/gérer ses visites d'inspection
2. Analyser les photos envoyées pour extraire des tâches (défauts, travaux à faire)
3. Guider l'utilisateur naturellement dans son inspection
4. Générer des rapports EDL sur demande

Si l'utilisateur mentionne une adresse ou veut démarrer une visite, propose de créer un nouveau projet.
Si l'utilisateur envoie des photos, analyse-les et extrais les tâches visibles.
Si l'utilisateur demande un rapport, génère un résumé structuré.

Réponds de manière concise, professionnelle et bienveillante. Utilise le markdown pour formater.`;

      const response = await supabase.functions.invoke('myaladin-chat', {
        body: {
          messages: [
            ...context.messageHistory,
            { role: 'user', content: messageText }
          ],
          systemPrompt,
        }
      });

      if (response.error) throw response.error;

      const aiResponse = response.data?.message || "Je n'ai pas pu traiter votre demande.";
      
      const addressMatch = messageText.match(/(?:au|à|sur|devant)\s+(.+?)(?:\s*,|\s*$)/i);
      if (addressMatch && !currentProject && messageText.toLowerCase().includes('visite')) {
        const address = addressMatch[1].trim();
        const { data: project, error } = await supabase
          .from('projects')
          .insert({
            address,
            property_type: 'building',
            user_id: user.id,
          })
          .select()
          .single();

        if (!error && project) {
          setCurrentProject({ id: project.id, address: project.address });
          const responseContent = `✅ **Projet créé !**\n\n📍 **Adresse:** ${address}\n\nVous pouvez maintenant:\n- 📸 M'envoyer des photos pour extraire les tâches\n- 🎤 Me dicter vos observations\n- 📝 Me demander de générer le rapport EDL\n\n${aiResponse}`;
          addMessage({ 
            role: 'assistant', 
            content: responseContent,
            type: 'location',
            metadata: { projectId: project.id, location: address }
          });
          await saveMessageToDb(convId, 'assistant', responseContent);
          setIsLoading(false);
          return;
        }
      }

      addMessage({ role: 'assistant', content: aiResponse });
      await saveMessageToDb(convId, 'assistant', aiResponse);

    } catch (error) {
      console.error('Error:', error);
      const errorMsg = "Désolé, une erreur s'est produite. Veuillez réessayer.";
      addMessage({ role: 'assistant', content: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let convId = currentConversationId;
    if (!convId) {
      convId = await createNewConversation();
      if (!convId) return;
    }

    const imageUrls: string[] = [];
    
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      imageUrls.push(base64);
    }

    addMessage({ 
      role: 'user', 
      content: `📸 ${files.length} photo(s) envoyée(s) pour analyse`,
      images: imageUrls 
    });

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      const response = await supabase.functions.invoke('myaladin-chat', {
        body: {
          messages: [
            { role: 'user', content: "Analyse ces photos d'inspection immobilière et extrais les tâches/défauts visibles." }
          ],
          systemPrompt: `Tu es un expert en inspection immobilière. Analyse les images et extrais les défauts, travaux nécessaires ou observations importantes.`,
          images: imageUrls
        }
      });

      if (response.error) throw response.error;

      const analysis = response.data?.message || "Analyse des photos terminée.";
      const newTasks = extractTasksFromAnalysis(analysis);
      setExtractedTasks(prev => [...prev, ...newTasks]);

      addMessage({ 
        role: 'assistant', 
        content: `📋 **Analyse terminée !**\n\n${analysis}\n\n${newTasks.length > 0 ? `✅ **${newTasks.length} tâche(s) extraite(s)**` : ''}`,
        type: 'task',
        metadata: { tasks: newTasks }
      });

      if (currentProject && newTasks.length > 0) {
        for (const task of newTasks) {
          await supabase.from('extracted_tasks').insert({
            project_id: currentProject.id,
            user_id: user.id,
            title: task.title,
            location: task.location,
            description: task.description,
            source_type: 'photo',
          });
        }
      }

    } catch (error) {
      console.error('Error analyzing images:', error);
      addMessage({ 
        role: 'assistant', 
        content: "Désolé, je n'ai pas pu analyser les photos. Veuillez réessayer." 
      });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const extractTasksFromAnalysis = (analysis: string): Array<{ title: string; location: string; description: string }> => {
    const tasks: Array<{ title: string; location: string; description: string }> = [];
    const lines = analysis.split('\n');
    
    let currentTask: { title: string; location: string; description: string } | null = null;
    
    for (const line of lines) {
      if (line.includes('**') && line.includes(':')) {
        if (currentTask && currentTask.title) {
          tasks.push(currentTask);
        }
        currentTask = { title: '', location: '', description: '' };
        const titleMatch = line.match(/\*\*(.+?)\*\*/);
        if (titleMatch) currentTask.title = titleMatch[1];
      } else if (currentTask && line.toLowerCase().includes('local')) {
        currentTask.location = line.replace(/.*:\s*/, '').trim();
      } else if (currentTask && line.trim()) {
        currentTask.description += line.trim() + ' ';
      }
    }
    
    if (currentTask && currentTask.title) {
      tasks.push(currentTask);
    }
    
    return tasks.slice(0, 5);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          
          const reader = new FileReader();
          reader.onload = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            setIsLoading(true);
            
            try {
              const response = await supabase.functions.invoke('transcribe-visit-audio', {
                body: { audio: base64Audio }
              });
              
              if (response.data?.transcription) {
                setInput(response.data.transcription);
                toast.success("Transcription terminée");
              }
            } catch (error) {
              console.error('Transcription error:', error);
              toast.error("Erreur de transcription");
            } finally {
              setIsLoading(false);
            }
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorder.start();
        setIsRecording(true);
        toast.info("Enregistrement en cours...");
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast.error("Impossible d'accéder au microphone");
      }
    }
  };

  const generateReport = async () => {
    if (!currentProject) {
      toast.error("Aucun projet en cours");
      return;
    }

    setIsLoading(true);
    addMessage({ role: 'user', content: "Génère le rapport EDL complet" });

    try {
      const response = await supabase.functions.invoke('myaladin-chat', {
        body: {
          messages: [
            { role: 'user', content: `Génère un rapport EDL structuré pour le projet à l'adresse: ${currentProject.address}. Tâches extraites: ${JSON.stringify(extractedTasks)}` }
          ],
          systemPrompt: `Tu es un expert en états des lieux. Génère un rapport EDL professionnel et structuré.`
        }
      });

      if (response.error) throw response.error;

      addMessage({ 
        role: 'assistant', 
        content: `📄 **Rapport EDL généré**\n\n${response.data?.message}`,
        type: 'report'
      });

    } catch (error) {
      console.error('Error generating report:', error);
      addMessage({ 
        role: 'assistant', 
        content: "Erreur lors de la génération du rapport." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: typeof SUGGESTIONS[0]) => {
    if (suggestion.action === 'edl') {
      // Direct EDL capture in conversational mode - launch immediate capture
      handleStartEDLCapture();
      return;
    }
    
    if (suggestion.action === 'create') {
      // Show the project creation wizard
      setShowProjectWizard(true);
      return;
    }
    
    if (suggestion.action === 'photos') {
      fileInputRef.current?.click();
      return;
    }
    
    if (suggestion.action === 'report') {
      handleSendMessage("Génère le rapport EDL complet");
      return;
    }
    
    handleSendMessage(suggestion.title);
  };

  // MyAladin EDL shortcut - conversational capture mode using orchestrator
  const handleStartEDLCapture = async () => {
    // Add AI message explaining what's happening
    addMessage({
      role: 'assistant',
      content: `🎬 **Mode EDL MyAladin activé !**\n\nJe lance la capture automatique. Filmez en parlant naturellement :\n\n✅ Décrivez ce que vous voyez\n✅ Mentionnez la pièce/zone (ex: "Dans la cuisine...")\n✅ Signalez les problèmes (ex: "Je vois une fissure sur le mur")\n\n**Une phrase = Un EDL complet.**\n\nJe m'occupe de tout : transcription, segmentation, extraction des tâches, rapport.\n\n📹 **Redirection vers la capture...**`
    });
    
    // Navigate to the instant capture interface
    setTimeout(() => {
      navigate('/visit-workflow?mode=aladin');
    }, 1500);
  };

  const createNewProject = () => {
    // Show the project creation wizard
    setShowProjectWizard(true);
    setSidebarOpen(false);
  };

  const handleProjectWizardComplete = async (projectId: string) => {
    setShowProjectWizard(false);
    
    try {
      // Fetch the project details
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create a conversation linked to this project
      const { data: convData, error: convError } = await supabase
        .from('myaladin_conversations')
        .insert({
          user_id: user.id,
          title: `📁 ${project.address || 'Nouveau projet'}`,
          context_type: 'project',
          context_data: { projectId: project.id },
        })
        .select()
        .single();

      if (convError) throw convError;

      const newConv: Conversation = {
        id: convData.id,
        title: convData.title,
        updated_at: convData.updated_at,
        context_data: { projectId: project.id },
      };
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversationId(convData.id);
      setCurrentProject({ id: project.id, address: project.address });
      setMessages([]);
      setExtractedTasks([]);
      
      // Add welcome message for project
      const welcomeMsg = `📁 **Projet créé !**\n\n📍 **Adresse:** ${project.address}\n${project.city ? `📮 ${project.postal_code} ${project.city}\n` : ''}\n🏢 **Type:** ${project.property_type}\n\nVous pouvez maintenant:\n- 🚀 Démarrer la visite terrain\n- 📸 M'envoyer des photos du bien\n- 🎤 Me dicter vos observations`;
      addMessage({ role: 'assistant', content: welcomeMsg });
      await saveMessageToDb(convData.id, 'assistant', welcomeMsg);
      
    } catch (error) {
      console.error('Error setting up project:', error);
    }
  };

  // Sidebar content (shared between mobile and desktop)
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card">
      {/* Header with close button */}
      <div className="flex items-center justify-between p-3 border-b">
        <button 
          onClick={() => {
            startNewChat();
            setSidebarOpen(false);
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors flex-1"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">Nouvelle discussion</span>
        </button>
        <button 
          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Create project button */}
      <div className="p-3 border-b space-y-2">
        <button 
          onClick={createNewProject}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-primary"
        >
          <FolderPlus className="w-5 h-5" />
          <span className="text-sm font-medium">Créer un projet / visite</span>
        </button>
        
        {/* Start Visit Workflow button - only if project is selected */}
        {currentProject && (
          <button 
            onClick={() => {
              navigate(`/visit/${currentProject.id}`);
              setSidebarOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors text-green-600 dark:text-green-400 border border-green-500/30"
          >
            <Camera className="w-5 h-5" />
            <span className="text-sm font-medium">🚀 Démarrer la visite terrain</span>
          </button>
        )}
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune discussion
            </p>
          ) : (
            conversations.map((conversation) => {
              const isProject = !!conversation.context_data?.projectId;
              return (
                <div
                  key={conversation.id}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${
                    currentConversationId === conversation.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => loadConversation(conversation.id)}
                >
                  {isProject ? (
                    <FolderPlus className="w-4 h-4 flex-shrink-0 text-primary" />
                  ) : (
                    <MessageSquare className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 text-sm truncate">{conversation.title}</span>
                  
                  {/* Direct Delete Button - X visible on hover */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteConversation(conversation.id, conversation.context_data?.projectId);
                    }}
                    className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 sm:opacity-100 transition-all"
                    title={isProject ? 'Supprimer projet' : 'Supprimer'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  {/* Dropdown Menu - GPT style */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded hover:bg-accent opacity-0 group-hover:opacity-100 sm:opacity-100 transition-all"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      className="w-48 z-[99999]"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDownOutside={(e) => e.preventDefault()}
                    >
                      <DropdownMenuItem 
                        onSelect={(e) => {
                          e.preventDefault();
                          shareConversation(conversation.id);
                        }}
                      >
                        <Share className="w-4 h-4 mr-2" />
                        Partager
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onSelect={(e) => {
                          e.preventDefault();
                          openRenameDialog(conversation.id, conversation.title);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Renommer
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onSelect={(e) => {
                          e.preventDefault();
                          archiveConversation(conversation.id);
                        }}
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Archiver
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onSelect={(e) => {
                          e.preventDefault();
                          deleteConversation(conversation.id, conversation.context_data?.projectId);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isProject ? 'Supprimer projet' : 'Supprimer'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Bottom actions */}
      <div className="p-3 border-t space-y-1">
        <button 
          onClick={onBack}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors text-muted-foreground"
        >
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm">Changer de mode</span>
        </button>
        <button 
          onClick={() => {
            navigate('/');
            setSidebarOpen(false);
          }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors text-muted-foreground"
        >
          <Home className="w-4 h-4" />
          <span className="text-sm">Accueil</span>
        </button>
      </div>
    </div>
  );

  const isNewChat = messages.length === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Custom Sidebar - ChatGPT style */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div 
        className={`fixed left-0 top-0 h-full w-80 bg-card border-r z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </div>

      {/* Header - ChatGPT style */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background">
        {/* Left: Hamburger menu */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </Button>

        {/* Center: Title */}
        <button className="flex items-center gap-1 hover:bg-accent/50 px-3 py-1.5 rounded-lg transition-colors">
          <span className="font-semibold text-foreground">MyAladin</span>
          <Sparkles className="w-5 h-5 text-purple-600" />
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Right: New chat */}
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={startNewChat}>
          <Plus className="w-6 h-6" />
        </Button>
      </header>

      {/* Current project indicator */}
      {currentProject && (
        <div className="px-4 py-2 bg-primary/5 border-b">
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-primary truncate">
                {currentProject.address}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="flex-shrink-0 gap-1.5 bg-green-500/10 border-green-500/30 text-green-600 hover:bg-green-500/20 hover:text-green-700"
              onClick={() => navigate(`/visit/${currentProject.id}`)}
            >
              <Camera className="w-4 h-4" />
              <span>Visite terrain</span>
            </Button>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isNewChat ? (
          /* Empty state with suggestions */
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">MyAladin</h2>
            <p className="text-muted-foreground text-center mb-8 max-w-sm">
              Votre assistant IA pour les etats des lieux immobiliers
            </p>
          </div>
        ) : (
          /* Messages */
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border'
                    }`}
                  >
                    {message.images && message.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {message.images.map((img, i) => (
                          <img 
                            key={i} 
                            src={img} 
                            alt={`Photo ${i + 1}`}
                            className="rounded-lg w-full h-32 object-cover"
                          />
                        ))}
                      </div>
                    )}
                    <div 
                      className={`text-sm whitespace-pre-wrap ${
                        message.role === 'assistant' ? 'prose prose-sm dark:prose-invert max-w-none' : ''
                      }`}
                      dangerouslySetInnerHTML={{ 
                        __html: message.role === 'assistant' 
                          ? message.content
                              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.+?)\*/g, '<em>$1</em>')
                              .replace(/\n/g, '<br/>')
                          : message.content 
                      }}
                    />
                    {message.metadata?.tasks && message.metadata.tasks.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.metadata.tasks.map((task, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 bg-background/50 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-sm">{task.title}</p>
                              <p className="text-xs text-muted-foreground">{task.location}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-card border rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">MyAladin réfléchit...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Suggestions - only show on new chat */}
        {isNewChat && (
          <div className="px-4 pb-4">
            <div className="flex gap-3 overflow-x-auto pb-2 max-w-3xl mx-auto">
              {SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="flex-shrink-0 bg-card hover:bg-accent/50 border rounded-2xl px-4 py-3 text-left transition-colors min-w-[180px]"
                >
                  <p className="font-medium text-sm text-foreground">{suggestion.title}</p>
                  <p className="text-xs text-muted-foreground">{suggestion.subtitle}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions when project active */}
        {currentProject && (
          <div className="px-4 py-2 border-t bg-card/50">
            <div className="max-w-3xl mx-auto flex gap-2 overflow-x-auto pb-1">
              <Button 
                variant="default"
                size="sm" 
                onClick={() => navigate(`/visit/${currentProject.id}`)}
                className="whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
              >
                <Camera className="w-4 h-4 mr-1" />
                🚀 Visite terrain
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                className="whitespace-nowrap"
              >
                <Camera className="w-4 h-4 mr-1" />
                Ajouter photos
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={generateReport}
                className="whitespace-nowrap"
              >
                <FileText className="w-4 h-4 mr-1" />
                Générer rapport
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="whitespace-nowrap"
              >
                <Building2 className="w-4 h-4 mr-1" />
                {extractedTasks.length} tâche(s)
              </Button>
            </div>
          </div>
        )}

        {/* Input Area - ChatGPT style */}
        <div className="p-4 bg-background">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 bg-card border rounded-full px-2 py-1">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
              
              {/* Plus button for attachments */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Plus className="w-5 h-5" />
              </Button>
              
              {/* Text input */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Poser une question"
                className="flex-1 bg-transparent border-0 outline-none text-sm py-2 placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />

              {/* Microphone button */}
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 rounded-full flex-shrink-0 ${isRecording ? 'text-destructive' : ''}`}
                onClick={toggleRecording}
                disabled={isLoading}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              {/* Send/Voice button */}
              {input.trim() ? (
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-full flex-shrink-0"
                  onClick={() => handleSendMessage()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-full flex-shrink-0 bg-foreground text-background hover:bg-foreground/90"
                  onClick={toggleRecording}
                  disabled={isLoading}
                >
                  <AudioLines className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Renommer la conversation</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Nouveau nom"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleRename}>
              Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Creation Wizard */}
      {showProjectWizard && (
        <div className="fixed inset-0 bg-background z-[60]">
          <ProjectCreationWizard
            onComplete={handleProjectWizardComplete}
            onCancel={() => setShowProjectWizard(false)}
          />
        </div>
      )}

    </div>
  );
};
