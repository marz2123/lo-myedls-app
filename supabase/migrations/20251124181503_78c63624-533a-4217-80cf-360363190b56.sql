-- Create a view for detailed DSC category statistics
CREATE OR REPLACE VIEW public.dsc_category_stats AS
SELECT 
  tc.id as category_id,
  tc.code as category_code,
  tc.name as category_name,
  tf.code as family_code,
  tf.name as family_name,
  COUNT(dcl.id) as total_classifications,
  COUNT(CASE WHEN dcl.category_match_type = 'exact' THEN 1 END) as exact_matches,
  COUNT(CASE WHEN dcl.category_match_type = 'fuzzy' THEN 1 END) as fuzzy_matches,
  COUNT(CASE WHEN dcl.category_match_type = 'fallback' THEN 1 END) as fallback_matches,
  COUNT(CASE WHEN dcl.category_match_type = 'none' THEN 1 END) as no_matches,
  ROUND(
    (COUNT(CASE WHEN dcl.category_match_type IN ('exact', 'fuzzy') THEN 1 END)::numeric / 
    NULLIF(COUNT(dcl.id), 0) * 100), 
    1
  ) as success_rate,
  COUNT(CASE WHEN dcl.needs_review = true AND dcl.reviewed = false THEN 1 END) as pending_reviews
FROM public.task_categories tc
JOIN public.task_families tf ON tc.family_id = tf.id
LEFT JOIN public.dsc_classification_logs dcl ON dcl.matched_category_id = tc.id
GROUP BY tc.id, tc.code, tc.name, tf.code, tf.name
HAVING COUNT(dcl.id) > 0
ORDER BY total_classifications DESC;

-- Create a view for detailed DSC subcategory statistics
CREATE OR REPLACE VIEW public.dsc_subcategory_stats AS
SELECT 
  ts.id as subcategory_id,
  ts.code as subcategory_code,
  ts.name as subcategory_name,
  tc.code as category_code,
  tc.name as category_name,
  tf.code as family_code,
  tf.name as family_name,
  COUNT(dcl.id) as total_classifications,
  COUNT(CASE WHEN dcl.subcategory_match_type = 'exact' THEN 1 END) as exact_matches,
  COUNT(CASE WHEN dcl.subcategory_match_type = 'fuzzy' THEN 1 END) as fuzzy_matches,
  COUNT(CASE WHEN dcl.subcategory_match_type = 'fallback' THEN 1 END) as fallback_matches,
  COUNT(CASE WHEN dcl.subcategory_match_type = 'none' THEN 1 END) as no_matches,
  ROUND(
    (COUNT(CASE WHEN dcl.subcategory_match_type IN ('exact', 'fuzzy') THEN 1 END)::numeric / 
    NULLIF(COUNT(dcl.id), 0) * 100), 
    1
  ) as success_rate,
  COUNT(CASE WHEN dcl.needs_review = true AND dcl.reviewed = false THEN 1 END) as pending_reviews
FROM public.task_subcategories ts
JOIN public.task_categories tc ON ts.category_id = tc.id
JOIN public.task_families tf ON tc.family_id = tf.id
LEFT JOIN public.dsc_classification_logs dcl ON dcl.matched_subcategory_id = ts.id
GROUP BY ts.id, ts.code, ts.name, tc.code, tc.name, tf.code, tf.name
HAVING COUNT(dcl.id) > 0
ORDER BY total_classifications DESC;