import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  Plus,
  Search,
  Filter,
  Clock,
  FileCheck,
  Home,
  Car,
  Warehouse
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useMultiSites, 
  Site, 
  Edl,
  CompanyType,
  COMPANY_LABELS, 
  COMPANY_COLORS,
  EDL_TYPE_LABELS,
  EDL_STATUS_LABELS
} from '@/hooks/useMultiSites';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProjectPickerProps {
  onSelectSite: (site: Site) => void;
  onSelectEdl: (edl: Edl) => void;
  onCreateNew: () => void;
}

const BUILDING_TYPE_ICONS: Record<string, React.ElementType> = {
  immeuble: Building2,
  maison: Home,
  appartement: Home,
  parking: Car,
  cave: Warehouse,
  local: Warehouse,
};

export function ProjectPicker({ onSelectSite, onSelectEdl, onCreateNew }: ProjectPickerProps) {
  const { sites, recentEdls, isLoading, selectedCompany, setSelectedCompany } = useMultiSites();
  const [searchQuery, setSearchQuery] = useState('');
  const [buildingTypeFilter, setBuildingTypeFilter] = useState<string | null>(null);

  const filteredSites = sites.filter(site => {
    const matchesSearch = !searchQuery || 
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.city?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCompany = !selectedCompany || site.company === selectedCompany;
    const matchesType = !buildingTypeFilter || site.building_type === buildingTypeFilter;

    return matchesSearch && matchesCompany && matchesType;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mes Projets & Biens</h1>
          <p className="text-muted-foreground">Sélectionnez un bien pour créer ou consulter un EDL</p>
        </div>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau Bien
        </Button>
      </div>

      {/* Company Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCompany === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCompany(null)}
        >
          Tous
        </Button>
        {(Object.keys(COMPANY_LABELS) as CompanyType[]).map(company => (
          <Button
            key={company}
            variant={selectedCompany === company ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCompany(company)}
            className="gap-2"
          >
            <div className={`w-2 h-2 rounded-full ${COMPANY_COLORS[company]}`} />
            {COMPANY_LABELS[company]}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="recent" className="gap-1">
            <Clock className="w-4 h-4" />
            Récents
          </TabsTrigger>
          <TabsTrigger value="sites" className="gap-1">
            <Building2 className="w-4 h-4" />
            Sites
          </TabsTrigger>
          <TabsTrigger value="edls" className="gap-1">
            <FileCheck className="w-4 h-4" />
            EDLs
          </TabsTrigger>
        </TabsList>

        {/* Recent EDLs */}
        <TabsContent value="recent" className="mt-4">
          <div className="space-y-3">
            {recentEdls.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun EDL récent</p>
                <Button variant="outline" className="mt-4" onClick={onCreateNew}>
                  Créer votre premier EDL
                </Button>
              </Card>
            ) : (
              recentEdls.map((edl, index) => (
                <motion.div
                  key={edl.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                    onClick={() => onSelectEdl(edl)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${edl.company ? COMPANY_COLORS[edl.company] : 'bg-muted'} bg-opacity-20`}>
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">
                              {edl.site?.name || 'Site non défini'}
                            </h3>
                            <Badge variant="outline" className="shrink-0">
                              {EDL_TYPE_LABELS[edl.edl_type]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {edl.site?.address || 'Adresse non renseignée'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {EDL_STATUS_LABELS[edl.status]}
                            </Badge>
                            {edl.score !== null && (
                              <span className="text-xs text-muted-foreground">
                                Score: {edl.score}%
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(edl.updated_at), { addSuffix: true, locale: fr })}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Sites List */}
        <TabsContent value="sites" className="mt-4">
          <div className="space-y-4">
            {/* Search & Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un site..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={buildingTypeFilter || 'all'}
                onValueChange={(v) => setBuildingTypeFilter(v === 'all' ? null : v)}
              >
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="immeuble">Immeuble</SelectItem>
                  <SelectItem value="maison">Maison</SelectItem>
                  <SelectItem value="appartement">Appartement</SelectItem>
                  <SelectItem value="parking">Parking</SelectItem>
                  <SelectItem value="cave">Cave</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sites Grid */}
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredSites.length === 0 ? (
                  <Card className="col-span-full p-8 text-center">
                    <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun site trouvé</p>
                    <Button variant="outline" className="mt-4" onClick={onCreateNew}>
                      Créer un nouveau site
                    </Button>
                  </Card>
                ) : (
                  filteredSites.map((site, index) => {
                    const Icon = BUILDING_TYPE_ICONS[site.building_type || 'immeuble'] || Building2;
                    
                    return (
                      <motion.div
                        key={site.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Card
                          className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                          onClick={() => onSelectSite(site)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${COMPANY_COLORS[site.company]} bg-opacity-20`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold truncate">{site.name}</h3>
                                  <div className={`w-2 h-2 rounded-full ${COMPANY_COLORS[site.company]}`} />
                                </div>
                                {site.address && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    {site.address}, {site.city}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {site.building_type && (
                                    <Badge variant="outline" className="text-xs">
                                      {site.building_type}
                                    </Badge>
                                  )}
                                  {site.rooms_count && (
                                    <Badge variant="secondary" className="text-xs">
                                      {site.rooms_count} pièces
                                    </Badge>
                                  )}
                                  {site.surface_m2 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {site.surface_m2} m²
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* All EDLs */}
        <TabsContent value="edls" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Sélectionnez un site pour voir ses EDLs associés.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
