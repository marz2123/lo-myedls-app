-- ============================================
-- Vérification des tables DTC dans Supabase
-- ============================================

-- 1. Vérifier le nombre de familles (FT)
SELECT COUNT(*) as nombre_familles FROM ft_familles;

-- 2. Vérifier le nombre de catégories (CT)
SELECT COUNT(*) as nombre_categories FROM ct_categories;

-- 3. Vérifier le nombre de sous-catégories (SC)
SELECT COUNT(*) as nombre_sous_categories FROM sc_sous_categories;

-- 4. Vérifier le nombre de tâches (T) - LE PLUS IMPORTANT
SELECT COUNT(*) as nombre_taches FROM t_taches;

-- 5. Aperçu des premières familles
SELECT ft_code, ft_label, commentaire_type_equipe 
FROM ft_familles 
ORDER BY ft_code 
LIMIT 10;

-- 6. Aperçu des premières catégories
SELECT ct_code, ct_label, ft_code 
FROM ct_categories 
ORDER BY ct_code 
LIMIT 10;

-- 7. Aperçu des premières sous-catégories
SELECT sc_code, sc_label, ct_code, ft_code 
FROM sc_sous_categories 
ORDER BY sc_code 
LIMIT 10;

-- 8. Aperçu des premières tâches avec détails
SELECT 
  t_code, 
  t_label, 
  sc_code, 
  ct_code, 
  ft_code,
  unite,
  rendement_h_par_unite,
  controle_qualite
FROM t_taches 
ORDER BY t_code 
LIMIT 10;

-- 9. Statistiques complètes par niveau
SELECT 
  'Familles (FT)' as niveau,
  COUNT(*) as total
FROM ft_familles
UNION ALL
SELECT 
  'Catégories (CT)' as niveau,
  COUNT(*) as total
FROM ct_categories
UNION ALL
SELECT 
  'Sous-catégories (SC)' as niveau,
  COUNT(*) as total
FROM sc_sous_categories
UNION ALL
SELECT 
  'Tâches (T)' as niveau,
  COUNT(*) as total
FROM t_taches;

-- 10. Vérifier si les tables existent (si erreur = table n'existe pas)
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = t.table_name) as existe
FROM (VALUES 
  ('ft_familles'),
  ('ct_categories'),
  ('sc_sous_categories'),
  ('t_taches')
) AS t(table_name);
