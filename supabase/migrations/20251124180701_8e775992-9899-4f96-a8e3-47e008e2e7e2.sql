-- Create a view for detailed DSC family statistics
CREATE OR REPLACE VIEW public.dsc_family_stats AS
SELECT 
  tf.id as family_id,
  tf.code as family_code,
  tf.name as family_name,
  COUNT(dcl.id) as total_classifications,
  COUNT(CASE WHEN dcl.family_match_type = 'exact' THEN 1 END) as exact_matches,
  COUNT(CASE WHEN dcl.family_match_type = 'fuzzy' THEN 1 END) as fuzzy_matches,
  COUNT(CASE WHEN dcl.family_match_type = 'fallback' THEN 1 END) as fallback_matches,
  COUNT(CASE WHEN dcl.family_match_type = 'none' THEN 1 END) as no_matches,
  ROUND(
    (COUNT(CASE WHEN dcl.family_match_type IN ('exact', 'fuzzy') THEN 1 END)::numeric / 
    NULLIF(COUNT(dcl.id), 0) * 100), 
    1
  ) as success_rate,
  COUNT(CASE WHEN dcl.needs_review = true AND dcl.reviewed = false THEN 1 END) as pending_reviews
FROM public.task_families tf
LEFT JOIN public.dsc_classification_logs dcl ON dcl.matched_family_id = tf.id
GROUP BY tf.id, tf.code, tf.name
HAVING COUNT(dcl.id) > 0
ORDER BY total_classifications DESC;