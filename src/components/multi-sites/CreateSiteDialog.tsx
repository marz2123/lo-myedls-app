import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  Home,
  Car,
  Warehouse,
  Check
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useMultiSites,
  CompanyType,
  COMPANY_LABELS,
  COMPANY_COLORS
} from '@/hooks/useMultiSites';

interface CreateSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (siteId: string) => void;
}

const BUILDING_TYPES = [
  { value: 'immeuble', label: 'Immeuble', icon: Building2 },
  { value: 'maison', label: 'Maison', icon: Home },
  { value: 'appartement', label: 'Appartement', icon: Home },
  { value: 'parking', label: 'Parking', icon: Car },
  { value: 'cave', label: 'Cave', icon: Warehouse },
  { value: 'local', label: 'Local commercial', icon: Warehouse },
];

export function CreateSiteDialog({ open, onOpenChange, onSuccess }: CreateSiteDialogProps) {
  const { createSite } = useMultiSites();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: 'bati_home' as CompanyType,
    building_type: 'appartement',
    address: '',
    city: '',
    postal_code: '',
    surface_m2: '',
    rooms_count: '',
    building_identifier: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const site = await createSite({
      name: formData.name,
      company: formData.company,
      building_type: formData.building_type,
      address: formData.address || null,
      city: formData.city || null,
      postal_code: formData.postal_code || null,
      surface_m2: formData.surface_m2 ? parseFloat(formData.surface_m2) : null,
      rooms_count: formData.rooms_count ? parseInt(formData.rooms_count) : null,
      building_identifier: formData.building_identifier || null,
    });

    setIsSubmitting(false);

    if (site) {
      onSuccess(site.id);
      onOpenChange(false);
      // Reset form
      setFormData({
        name: '',
        company: 'bati_home',
        building_type: 'appartement',
        address: '',
        city: '',
        postal_code: '',
        surface_m2: '',
        rooms_count: '',
        building_identifier: '',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Nouveau Bien / Site
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Selection */}
          <div className="space-y-2">
            <Label>Société</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(COMPANY_LABELS) as CompanyType[]).map(company => (
                <Button
                  key={company}
                  type="button"
                  variant={formData.company === company ? 'default' : 'outline'}
                  className="justify-start gap-2"
                  onClick={() => setFormData(prev => ({ ...prev, company }))}
                >
                  <div className={`w-3 h-3 rounded-full ${COMPANY_COLORS[company]}`} />
                  {COMPANY_LABELS[company]}
                  {formData.company === company && (
                    <Check className="w-4 h-4 ml-auto" />
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Building Type */}
          <div className="space-y-2">
            <Label>Type de bien</Label>
            <div className="grid grid-cols-3 gap-2">
              {BUILDING_TYPES.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant={formData.building_type === value ? 'default' : 'outline'}
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => setFormData(prev => ({ ...prev, building_type: value }))}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nom du bien *</Label>
            <Input
              id="name"
              placeholder="Ex: Appartement 203, Immeuble Le Clos..."
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          {/* Address */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                placeholder="123 rue de la Paix"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Code postal</Label>
              <Input
                id="postal_code"
                placeholder="75001"
                value={formData.postal_code}
                onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                placeholder="Paris"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="surface">Surface (m²)</Label>
              <Input
                id="surface"
                type="number"
                placeholder="65"
                value={formData.surface_m2}
                onChange={(e) => setFormData(prev => ({ ...prev, surface_m2: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rooms">Nb. pièces</Label>
              <Input
                id="rooms"
                type="number"
                placeholder="3"
                value={formData.rooms_count}
                onChange={(e) => setFormData(prev => ({ ...prev, rooms_count: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="identifier">Identifiant</Label>
              <Input
                id="identifier"
                placeholder="Lot 23"
                value={formData.building_identifier}
                onChange={(e) => setFormData(prev => ({ ...prev, building_identifier: e.target.value }))}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name}>
              {isSubmitting ? 'Création...' : 'Créer le bien'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
