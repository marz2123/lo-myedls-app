-- Add UPDATE policy for extracted_frames so users can assign frames to blocks/albums
CREATE POLICY "Users can update frames from their sessions" 
ON public.extracted_frames 
FOR UPDATE 
USING (EXISTS ( 
  SELECT 1 FROM visit_sessions 
  WHERE visit_sessions.id = extracted_frames.visit_session_id 
  AND visit_sessions.user_id = auth.uid()
));