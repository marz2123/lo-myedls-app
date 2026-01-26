-- Create table for MyAladin conversations
CREATE TABLE IF NOT EXISTS public.myaladin_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  context_type TEXT, -- 'template', 'general', 'project', etc.
  context_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for MyAladin messages
CREATE TABLE IF NOT EXISTS public.myaladin_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.myaladin_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.myaladin_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.myaladin_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations"
ON public.myaladin_conversations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
ON public.myaladin_conversations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
ON public.myaladin_conversations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
ON public.myaladin_conversations
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages from their conversations"
ON public.myaladin_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.myaladin_conversations
    WHERE id = myaladin_messages.conversation_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their conversations"
ON public.myaladin_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.myaladin_conversations
    WHERE id = myaladin_messages.conversation_id
    AND user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_myaladin_conversations_updated_at
BEFORE UPDATE ON public.myaladin_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_myaladin_conversations_user_id ON public.myaladin_conversations(user_id);
CREATE INDEX idx_myaladin_messages_conversation_id ON public.myaladin_messages(conversation_id);