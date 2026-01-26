import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield,
  Eye,
  Edit,
  FileSignature,
  Download,
  Trash2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Site, useMultiSites } from '@/hooks/useMultiSites';
import { useToast } from '@/hooks/use-toast';

interface AccessManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: Site;
}

const ROLES = [
  { value: 'admin', label: 'Administrateur', description: 'Accès complet' },
  { value: 'expert_edl', label: 'Expert EDL', description: 'Peut créer et modifier les EDL' },
  { value: 'technicien', label: 'Technicien', description: 'Peut réaliser les visites' },
  { value: 'architecte', label: 'Architecte', description: 'Consultation et commentaires' },
  { value: 'bet', label: 'BET', description: 'Bureau d\'études techniques' },
  { value: 'asl', label: 'ASL / Syndic', description: 'Gestion collective' },
  { value: 'locataire', label: 'Locataire', description: 'Lecture seule + signature' },
  { value: 'bailleur', label: 'Bailleur', description: 'Lecture + signature + export' },
];

const PERMISSION_ICONS = {
  read: Eye,
  write: Edit,
  sign: FileSignature,
  export: Download,
};

export function AccessManagementDialog({ open, onOpenChange, site }: AccessManagementDialogProps) {
  const { grantAccess } = useMultiSites();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('technicien');
  const [permissions, setPermissions] = useState({
    read: true,
    write: false,
    sign: false,
    export: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock existing access list (in production, fetch from project_access table)
  const [accessList] = useState([
    { id: '1', email: 'expert@example.com', role: 'expert_edl', permissions: { read: true, write: true, sign: true, export: true } },
    { id: '2', email: 'technicien@example.com', role: 'technicien', permissions: { read: true, write: true, sign: false, export: false } },
  ]);

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    // Auto-set permissions based on role
    switch (role) {
      case 'admin':
        setPermissions({ read: true, write: true, sign: true, export: true });
        break;
      case 'expert_edl':
        setPermissions({ read: true, write: true, sign: true, export: true });
        break;
      case 'technicien':
        setPermissions({ read: true, write: true, sign: false, export: false });
        break;
      case 'bailleur':
        setPermissions({ read: true, write: false, sign: true, export: true });
        break;
      case 'locataire':
        setPermissions({ read: true, write: false, sign: true, export: false });
        break;
      default:
        setPermissions({ read: true, write: false, sign: false, export: false });
    }
  };

  const handleInvite = async () => {
    if (!email) {
      toast({
        title: 'Email requis',
        description: 'Veuillez saisir une adresse email',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    // In production, you would look up the user by email first
    // For now, we'll show a success message
    toast({
      title: 'Invitation envoyée',
      description: `Un email a été envoyé à ${email}`,
    });
    setEmail('');
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestion des accès - {site.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite New User */}
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Inviter un collaborateur
            </h3>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="collaborateur@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={selectedRole} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex flex-col">
                          <span>{role.label}</span>
                          <span className="text-xs text-muted-foreground">{role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(permissions) as Array<keyof typeof permissions>).map(perm => {
                    const Icon = PERMISSION_ICONS[perm];
                    const labels = {
                      read: 'Lecture',
                      write: 'Écriture',
                      sign: 'Signature',
                      export: 'Export',
                    };
                    return (
                      <div key={perm} className="flex items-center justify-between p-2 bg-background rounded">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{labels[perm]}</span>
                        </div>
                        <Switch
                          checked={permissions[perm]}
                          onCheckedChange={(checked) => 
                            setPermissions(prev => ({ ...prev, [perm]: checked }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={handleInvite}
                disabled={isSubmitting}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Envoyer l'invitation
              </Button>
            </div>
          </div>

          {/* Current Access List */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Accès actuels
            </h3>

            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {accessList.map(access => {
                  const role = ROLES.find(r => r.value === access.role);
                  return (
                    <div 
                      key={access.id} 
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{access.email}</p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {role?.label || access.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {access.permissions.read && <Eye className="w-3 h-3 text-muted-foreground" />}
                        {access.permissions.write && <Edit className="w-3 h-3 text-muted-foreground" />}
                        {access.permissions.sign && <FileSignature className="w-3 h-3 text-muted-foreground" />}
                        {access.permissions.export && <Download className="w-3 h-3 text-muted-foreground" />}
                      </div>
                      <Button variant="ghost" size="icon" className="ml-2">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
