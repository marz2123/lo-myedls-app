import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Comment {
  id: string;
  author_type: 'inspector' | 'client';
  author_name: string;
  comment_text: string;
  is_resolved: boolean;
  created_at: string;
  parent_comment_id: string | null;
}

interface TaskCommentsPanelProps {
  taskId: string;
}

export const TaskCommentsPanel = ({ taskId }: TaskCommentsPanelProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorType, setAuthorType] = useState<'inspector' | 'client'>('inspector');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [taskId]);

  const loadComments = async () => {
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading comments:', error);
      return;
    }

    setComments((data || []) as Comment[]);
  };

  const submitComment = async () => {
    if (!newComment.trim() || !authorName.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          author_type: authorType,
          author_name: authorName,
          comment_text: newComment,
          is_resolved: false
        });

      if (error) throw error;

      toast.success("Commentaire ajouté");
      setNewComment("");
      loadComments();
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error("Erreur lors de l'ajout du commentaire");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleResolved = async (commentId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('task_comments')
      .update({ is_resolved: !currentStatus })
      .eq('id', commentId);

    if (error) {
      console.error('Error updating comment:', error);
      toast.error("Erreur lors de la mise à jour");
      return;
    }

    toast.success(currentStatus ? "Commentaire marqué non résolu" : "Commentaire résolu");
    loadComments();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Commentaires ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 rounded-lg border ${
                comment.is_resolved ? 'bg-muted/50' : 'bg-background'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{comment.author_name}</span>
                  <Badge variant={comment.author_type === 'inspector' ? 'default' : 'secondary'}>
                    {comment.author_type === 'inspector' ? 'Inspecteur' : 'Client'}
                  </Badge>
                  {comment.is_resolved && (
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Résolu
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
                </span>
              </div>
              <p className="text-sm mb-2">{comment.comment_text}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleResolved(comment.id, comment.is_resolved)}
              >
                {comment.is_resolved ? 'Marquer non résolu' : 'Marquer résolu'}
              </Button>
            </div>
          ))}
        </div>

        {/* New Comment Form */}
        <div className="space-y-3 pt-4 border-t">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="authorName">Votre nom</Label>
              <Input
                id="authorName"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Nom"
              />
            </div>
            <div>
              <Label htmlFor="authorType">Type</Label>
              <select
                id="authorType"
                value={authorType}
                onChange={(e) => setAuthorType(e.target.value as 'inspector' | 'client')}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="inspector">Inspecteur</option>
                <option value="client">Client</option>
              </select>
            </div>
          </div>
          <div>
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ajouter un commentaire..."
              rows={3}
            />
          </div>
          <Button
            onClick={submitComment}
            disabled={isSubmitting}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Envoi..." : "Envoyer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};