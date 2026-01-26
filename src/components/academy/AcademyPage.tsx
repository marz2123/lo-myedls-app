import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  GraduationCap, BookOpen, FileText, Video, Award,
  Sparkles, ArrowLeft, Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAcademy, AcademyModule, QuizQuestion } from '@/hooks/useAcademy';
import { AcademyStats } from './AcademyStats';
import { ModuleCard } from './ModuleCard';
import { CertificatesSection } from './CertificatesSection';
import { ModuleViewerDialog } from './ModuleViewerDialog';

export const AcademyPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    modules, 
    userStats, 
    certificates,
    isLoading,
    fetchQuizQuestions,
    updateProgress,
    issueCertificate,
    getModuleProgress,
    isModuleCompleted
  } = useAcademy();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedModule, setSelectedModule] = useState<AcademyModule | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [showViewer, setShowViewer] = useState(false);

  const completedCount = useMemo(() => 
    modules.filter(m => isModuleCompleted(m.id)).length,
    [modules, isModuleCompleted]
  );

  const filteredModules = useMemo(() => {
    return modules.filter(m => {
      const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || m.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [modules, searchQuery, activeCategory]);

  const categories = [
    { id: 'all', label: 'Tout', icon: BookOpen },
    { id: 'quick_module', label: 'Modules rapides', icon: Sparkles },
    { id: 'norms', label: 'Normes', icon: FileText },
    { id: 'video', label: 'Vidéos', icon: Video },
    { id: 'advanced', label: 'Avancé', icon: Award }
  ];

  const handleStartModule = async (module: AcademyModule) => {
    setSelectedModule(module);
    const questions = await fetchQuizQuestions(module.id);
    setQuizQuestions(questions);
    setShowViewer(true);
  };

  const handleModuleComplete = (moduleId: string, score?: number) => {
    updateProgress(moduleId, 100, score);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">MyAladin Academy</h1>
                <p className="text-sm text-muted-foreground">Formation & Certification</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AcademyStats 
            stats={userStats}
            modulesCompleted={completedCount}
            totalModules={modules.length}
          />
        </motion.div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un module..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {categories.map(cat => (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id}
                className="flex items-center gap-2"
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeCategory} className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredModules.map((module, index) => (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ModuleCard
                    module={module}
                    progress={getModuleProgress(module.id)}
                    isCompleted={isModuleCompleted(module.id)}
                    onStart={handleStartModule}
                  />
                </motion.div>
              ))}
            </div>

            {filteredModules.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun module trouvé</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Certificates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CertificatesSection
            certificates={certificates}
            modulesCompleted={completedCount}
            totalModules={modules.length}
            onClaimCertificate={issueCertificate}
          />
        </motion.div>
      </div>

      {/* Module Viewer */}
      <ModuleViewerDialog
        open={showViewer}
        onOpenChange={setShowViewer}
        module={selectedModule}
        progress={selectedModule ? getModuleProgress(selectedModule.id) : 0}
        quizQuestions={quizQuestions}
        onComplete={handleModuleComplete}
      />
    </div>
  );
};
