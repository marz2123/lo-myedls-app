-- Academy Modules table
CREATE TABLE public.academy_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'quick_module', 'norms', 'video', 'advanced'
  content JSONB NOT NULL DEFAULT '{}',
  video_url TEXT,
  duration_minutes INTEGER DEFAULT 5,
  difficulty TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Academy Quiz Questions table
CREATE TABLE public.academy_quiz (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice', -- 'multiple_choice', 'true_false', 'image_recognition'
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  image_url TEXT,
  points INTEGER DEFAULT 10,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Progress table
CREATE TABLE public.academy_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_id UUID REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  progress_percent INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  quiz_score INTEGER,
  time_spent_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- User Certificates table
CREATE TABLE public.academy_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  certificate_level TEXT NOT NULL, -- 'level_1', 'level_2', 'level_3'
  certificate_name TEXT NOT NULL,
  pdf_url TEXT,
  badge_url TEXT,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- User XP and Stats table
CREATE TABLE public.academy_user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  modules_completed INTEGER DEFAULT 0,
  quizzes_passed INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  badges JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.academy_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_quiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for modules (public read)
CREATE POLICY "Anyone can view active modules" ON public.academy_modules
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage modules" ON public.academy_modules
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for quiz
CREATE POLICY "Anyone can view quiz questions" ON public.academy_quiz
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage quiz" ON public.academy_quiz
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for progress
CREATE POLICY "Users can view their own progress" ON public.academy_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own progress" ON public.academy_progress
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for certificates
CREATE POLICY "Users can view their own certificates" ON public.academy_certificates
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own certificates" ON public.academy_certificates
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for user stats
CREATE POLICY "Users can view their own stats" ON public.academy_user_stats
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own stats" ON public.academy_user_stats
  FOR ALL USING (user_id = auth.uid());

-- Insert default modules
INSERT INTO public.academy_modules (title, description, category, content, duration_minutes, difficulty, order_index) VALUES
('Comment faire un EDL', 'Apprenez les bases de la réalisation d''un état des lieux professionnel', 'quick_module', '{"steps": ["Préparation", "Capture", "Validation", "Export"]}', 5, 'beginner', 1),
('Prendre des photos correctes', 'Techniques pour capturer des photos EDL de qualité professionnelle', 'quick_module', '{"tips": ["Éclairage", "Cadrage", "Angles", "Détails"]}', 4, 'beginner', 2),
('Détecter les anomalies', 'Identifier et documenter les défauts et anomalies', 'quick_module', '{"types": ["Fissures", "Humidité", "Usure", "Dégradations"]}', 6, 'intermediate', 3),
('Utiliser la Smart Checklist', 'Maîtrisez la checklist intelligente pour des EDL complets', 'quick_module', '{"features": ["Auto-validation", "Suggestions IA", "Complétude"]}', 4, 'beginner', 4),
('Export DPGF / Notice Descriptive', 'Générer des exports professionnels', 'quick_module', '{"formats": ["PDF", "Excel", "DPGF", "ND"]}', 5, 'intermediate', 5),
('Comparatif Entrée / Sortie', 'Analyser les différences entre deux EDL', 'quick_module', '{"analysis": ["Photos", "États", "Anomalies", "Tâches"]}', 6, 'advanced', 6),
('Normes état des lieux', 'Réglementation et obligations légales', 'norms', '{"laws": ["Loi ALUR", "Décret 2016", "SPQL"]}', 10, 'intermediate', 7),
('RT/RE2020 Essentiel', 'Comprendre les normes thermiques', 'norms', '{"topics": ["Isolation", "Ventilation", "Chauffage"]}', 8, 'advanced', 8),
('DTU Plomberie & Électricité', 'Normes techniques essentielles', 'norms', '{"standards": ["NF C 15-100", "DTU 60.1", "DTU 65.10"]}', 12, 'advanced', 9),
('Mode Expert Review', 'Validation avancée par experts', 'advanced', '{"features": ["Review", "Annotations", "Validation"]}', 8, 'advanced', 10);

-- Insert default quiz questions
INSERT INTO public.academy_quiz (module_id, question, question_type, options, correct_answer, explanation, points, order_index)
SELECT 
  m.id,
  'Quelle est la première étape d''un EDL ?',
  'multiple_choice',
  '["Prendre des photos", "Préparer le dossier et vérifier l''adresse", "Signer le document", "Envoyer le rapport"]',
  'Préparer le dossier et vérifier l''adresse',
  'La préparation est essentielle pour un EDL réussi. Vérifiez toujours l''adresse et les informations du bien avant de commencer.',
  10,
  1
FROM public.academy_modules m WHERE m.title = 'Comment faire un EDL';

INSERT INTO public.academy_quiz (module_id, question, question_type, options, correct_answer, explanation, points, order_index)
SELECT 
  m.id,
  'Pour une photo EDL de qualité, quel éclairage est préférable ?',
  'multiple_choice',
  '["Flash uniquement", "Lumière naturelle + flash d''appoint si nécessaire", "Aucun éclairage", "Lumière artificielle forte"]',
  'Lumière naturelle + flash d''appoint si nécessaire',
  'La lumière naturelle révèle les vrais défauts. Le flash peut être utilisé en complément dans les zones sombres.',
  10,
  1
FROM public.academy_modules m WHERE m.title = 'Prendre des photos correctes';

INSERT INTO public.academy_quiz (module_id, question, question_type, options, correct_answer, explanation, points, order_index)
SELECT 
  m.id,
  'Une fissure horizontale sur un mur porteur indique généralement :',
  'multiple_choice',
  '["Un problème esthétique mineur", "Un tassement différentiel potentiel", "Une erreur de peinture", "Rien de grave"]',
  'Un tassement différentiel potentiel',
  'Les fissures horizontales sur murs porteurs peuvent indiquer des mouvements de structure et doivent être signalées comme anomalie importante.',
  15,
  1
FROM public.academy_modules m WHERE m.title = 'Détecter les anomalies';

INSERT INTO public.academy_quiz (module_id, question, question_type, options, correct_answer, explanation, points, order_index)
SELECT 
  m.id,
  'La loi ALUR impose un état des lieux :',
  'true_false',
  '["Vrai", "Faux"]',
  'Vrai',
  'La loi ALUR de 2014 rend obligatoire l''état des lieux d''entrée et de sortie pour toute location.',
  10,
  1
FROM public.academy_modules m WHERE m.title = 'Normes état des lieux';