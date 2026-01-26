import React, { useState } from 'react';
import { 
  Mail, 
  MessageSquare, 
  Link2, 
  Download,
  Send,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { AutoStoryVideo } from '@/types/autostory';

interface AutoStoryShareDialogProps {
  video: AutoStoryVideo | null;
  onClose: () => void;
  onShare: (videoId: string, type: 'email' | 'sms' | 'whatsapp' | 'link', recipient?: string) => Promise<any>;
}

export function AutoStoryShareDialog({ video, onClose, onShare }: AutoStoryShareDialogProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (!video) return null;

  const handleShare = async (type: 'email' | 'sms' | 'whatsapp' | 'link') => {
    setIsSending(true);
    try {
      const recipient = type === 'email' ? email : type === 'link' ? undefined : phone;
      await onShare(video.id, type, recipient);
      
      if (type === 'link') {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      } else {
        onClose();
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={!!video} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Partager le film</DialogTitle>
          <DialogDescription>
            Partagez "{video.title}" avec vos contacts
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="link">
              <Link2 className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageSquare className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="download">
              <Download className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Copiez le lien de partage pour l'envoyer à qui vous voulez
            </p>
            <Button
              onClick={() => handleShare('link')}
              className="w-full"
              disabled={isSending}
            >
              {linkCopied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Lien copié !
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copier le lien
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@email.com"
              />
            </div>
            <Button
              onClick={() => handleShare('email')}
              className="w-full"
              disabled={!email || isSending}
            >
              <Send className="w-4 h-4 mr-2" />
              Envoyer par email
            </Button>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Numéro WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+33 6 12 34 56 78"
              />
            </div>
            <Button
              onClick={() => handleShare('whatsapp')}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={!phone || isSending}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Envoyer sur WhatsApp
            </Button>
          </TabsContent>

          <TabsContent value="download" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Téléchargez le film pour le partager manuellement
            </p>
            <Button
              onClick={() => {
                if (video.video_url) {
                  const link = document.createElement('a');
                  link.href = video.video_url;
                  link.download = `${video.title}.mp4`;
                  link.click();
                }
                onClose();
              }}
              className="w-full"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger le fichier
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
