import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ProjectInfoWizard } from "@/components/project/ProjectInfoWizard";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";

interface ProjectDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedAt: string;
}

interface PartieCommune {
  id: string;
  name: string;
  type: string;
}

interface PartiePrivative {
  id: string;
  name: string;
  type: string;
  numero?: string;
  pieces?: Array<{id: string; type: string; name: string}>;
}

const ProjectNewPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(true);
  
  // Form state
  const [propertyType, setPropertyType] = useState<string>("building");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);
  const [partiesCommunes, setPartiesCommunes] = useState<PartieCommune[]>([]);
  const [partiesPrivatives, setPartiesPrivatives] = useState<PartiePrivative[]>([]);

  // Fake project object for wizard (required prop)
  const draftProject = {
    id: 'new',
    property_type: propertyType,
    address: address,
    postal_code: postalCode,
    city: city,
    additional_info: additionalInfo,
    project_documents: projectDocuments,
  };

  // Check authentication
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setCheckingAuth(false);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSave = async () => {
    if (!address) {
      toast.error("L'adresse est obligatoire");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Générer un nom pour le projet
      const projectName = address 
        ? `${address}${city ? `, ${city}` : ''}${postalCode ? ` ${postalCode}` : ''}`
        : `Projet EDL - ${new Date().toLocaleDateString()}`;

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('edl_projects')
        .insert([{
          user_id: user.id,
          name: projectName,
          address: address,
          postal_code: postalCode,
          city: city,
          property_type: propertyType,
          additional_info: additionalInfo,
          project_documents: projectDocuments as any,
        }])
        .select()
        .single();

      if (projectError) {
        console.error('[ProjectNewPage] Project creation error:', JSON.stringify(projectError, null, 2));
        throw projectError;
      }

      // Create composition (parties communes et privatives)
      if (partiesCommunes.length > 0 || partiesPrivatives.length > 0) {
        // Create commune part container
        if (partiesCommunes.length > 0) {
          const { data: communePart } = await supabase
            .from('property_parts')
            .insert([{
              project_id: project.id,
              name: 'Parties Communes',
              part_type: 'commune',
              order_index: 0
            }])
            .select()
            .single();

          if (communePart) {
            // Create locations for each partie commune
            for (const pc of partiesCommunes) {
              await supabase
                .from('property_locations')
                .insert([{
                  project_id: project.id,
                  part_id: communePart.id,
                  name: pc.name,
                  location_type: pc.type,
                }]);
            }
          }
        }

        // Create privative part container
        if (partiesPrivatives.length > 0) {
          const { data: privativePart } = await supabase
            .from('property_parts')
            .insert([{
              project_id: project.id,
              name: 'Parties Privatives',
              part_type: 'privative',
              order_index: 1
            }])
            .select()
            .single();

          if (privativePart) {
            // Create locations for each partie privative
            for (const pp of partiesPrivatives) {
              await supabase
                .from('property_locations')
                .insert([{
                  project_id: project.id,
                  part_id: privativePart.id,
                  name: pp.name,
                  location_type: pp.type,
                  numero_lot: pp.numero,
                  pieces_json: pp.pieces ? JSON.stringify(pp.pieces) : null,
                }]);
            }
          }
        }
      }

      toast.success("Projet créé avec succès");
      navigate(`/project/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error("Erreur lors de la création du projet");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-y-auto pb-safe">
      <Navbar />
      
      {/* Header */}
      <div className="sticky top-16 z-40 bg-background border-b p-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Nouveau EDL</h1>
      </div>

      {/* Wizard Sheet */}
      <Sheet open={wizardOpen} onOpenChange={(open) => {
        if (!open) handleCancel();
      }}>
        <SheetContent side="bottom" className="h-[95vh] p-0 overflow-hidden" hideCloseButton>
          <ProjectInfoWizard
            project={draftProject}
            onSave={handleSave}
            onCancel={handleCancel}
            propertyType={propertyType}
            setPropertyType={setPropertyType}
            address={address}
            setAddress={setAddress}
            postalCode={postalCode}
            setPostalCode={setPostalCode}
            city={city}
            setCity={setCity}
            additionalInfo={additionalInfo}
            setAdditionalInfo={setAdditionalInfo}
            projectDocuments={projectDocuments}
            setProjectDocuments={setProjectDocuments}
            partiesCommunes={partiesCommunes}
            setPartiesCommunes={setPartiesCommunes}
            partiesPrivatives={partiesPrivatives}
            setPartiesPrivatives={setPartiesPrivatives}
            isSaving={isSaving}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ProjectNewPage;
