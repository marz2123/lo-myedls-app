-- Fix security definer views by recreating them with SECURITY INVOKER
DROP VIEW IF EXISTS public.taches_completes;
DROP VIEW IF EXISTS public.timeline_sequences;

-- Recreate view with SECURITY INVOKER for tasks
CREATE VIEW public.taches_completes 
WITH (security_invoker = on) AS
SELECT 
  t.id as tache_id,
  t.title as titre_tache,
  t.description as description_tache,
  t.quantity as quantite,
  t.unit as unite,
  t.condition as etat,
  t.priority as priorite,
  t.status as statut,
  t.etat_validation,
  t.estimated_cost_min,
  t.estimated_cost_max,
  t.work_type as type_travaux,
  t.corps_metier,
  t.difficulte,
  t.created_at,
  ip.id as probleme_id,
  ip.title as titre_probleme,
  ip.severity as severite_probleme,
  ip.urgence,
  ip.origine as origine_probleme,
  lz.id as zone_id,
  lz.zone_type as type_zone,
  lz.custom_name as nom_zone,
  lz.condition as etat_zone,
  lz.mesures_ar,
  pl.id as lieu_id,
  pl.name as nom_lieu,
  pl.location_type as type_lieu,
  pl.floor_level as etage,
  pl.overall_condition as etat_lieu,
  pp.id as partie_id,
  pp.name as nom_partie,
  pp.part_type as type_partie,
  p.id as bien_id,
  p.address as adresse_bien,
  p.property_type as type_bien,
  p.city as ville,
  tf.code as famille_code,
  tf.name as famille_nom,
  tc.code as categorie_code,
  tc.name as categorie_nom,
  ts.code as sous_categorie_code,
  ts.name as sous_categorie_nom
FROM public.problem_tasks t
LEFT JOIN public.identified_problems ip ON t.problem_id = ip.id
LEFT JOIN public.location_zones lz ON t.zone_id = lz.id OR ip.zone_id = lz.id
LEFT JOIN public.property_locations pl ON t.location_id = pl.id OR ip.location_id = pl.id
LEFT JOIN public.property_parts pp ON t.part_id = pp.id OR pl.part_id = pp.id
LEFT JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.task_families tf ON t.family_id = tf.id
LEFT JOIN public.task_categories tc ON t.category_id = tc.id
LEFT JOIN public.task_subcategories ts ON t.subcategory_id = ts.id;

-- Recreate view with SECURITY INVOKER for timeline
CREATE VIEW public.timeline_sequences 
WITH (security_invoker = on) AS
SELECT 
  vs.id as sequence_id,
  vs.started_at,
  vs.ended_at,
  vs.duration_seconds,
  vs.status,
  vs.detected_condition as etat_detecte,
  vs.user_condition as etat_confirme,
  vs.detected_zones as zones_detectees,
  vs.transcription,
  vs.ordre_visite,
  (SELECT COUNT(*) FROM public.identified_problems WHERE sequence_id = vs.id) as nb_problemes,
  (SELECT COUNT(*) FROM public.problem_tasks WHERE problem_id IN (SELECT id FROM public.identified_problems WHERE sequence_id = vs.id)) as nb_taches,
  (SELECT COUNT(*) FROM public.visit_medias WHERE sequence_id = vs.id) as nb_medias,
  pl.id as lieu_id,
  pl.name as nom_lieu,
  pl.location_type as type_lieu,
  pp.id as partie_id,
  pp.name as nom_partie,
  pp.part_type as type_partie,
  p.id as bien_id,
  p.address as adresse
FROM public.visit_sequences vs
LEFT JOIN public.property_locations pl ON vs.location_id = pl.id
LEFT JOIN public.property_parts pp ON vs.part_id = pp.id
LEFT JOIN public.projects p ON vs.project_id = p.id;