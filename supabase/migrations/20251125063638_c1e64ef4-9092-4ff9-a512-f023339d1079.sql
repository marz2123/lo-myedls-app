-- Add performance tracking fields to prediction_strategies for rollback
ALTER TABLE prediction_strategies
ADD COLUMN previous_performance jsonb,
ADD COLUMN last_optimization_at timestamp with time zone,
ADD COLUMN rollback_threshold numeric DEFAULT 0.15;

-- Add comments
COMMENT ON COLUMN prediction_strategies.previous_performance IS 'Stores performance metrics before last optimization for rollback comparison';
COMMENT ON COLUMN prediction_strategies.last_optimization_at IS 'Timestamp of last optimization to track monitoring period';
COMMENT ON COLUMN prediction_strategies.rollback_threshold IS 'Percentage drop threshold that triggers automatic rollback (default 15%)';

-- Create function to check if rollback is needed
CREATE OR REPLACE FUNCTION check_strategy_performance_degradation(
  p_strategy_id uuid,
  p_current_acceptance_rate numeric,
  p_monitoring_window_hours integer DEFAULT 24
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_rate numeric;
  v_threshold numeric;
  v_optimization_time timestamp with time zone;
BEGIN
  -- Get previous performance and threshold
  SELECT 
    (previous_performance->>'acceptance_rate')::numeric,
    rollback_threshold,
    last_optimization_at
  INTO v_previous_rate, v_threshold, v_optimization_time
  FROM prediction_strategies
  WHERE id = p_strategy_id;
  
  -- If no previous performance or too recent, don't rollback
  IF v_previous_rate IS NULL OR 
     v_optimization_time IS NULL OR
     v_optimization_time > now() - (p_monitoring_window_hours || ' hours')::interval THEN
    RETURN false;
  END IF;
  
  -- Check if performance degraded beyond threshold
  IF v_previous_rate > 0 THEN
    RETURN ((v_previous_rate - p_current_acceptance_rate) / v_previous_rate) > v_threshold;
  END IF;
  
  RETURN false;
END;
$$;