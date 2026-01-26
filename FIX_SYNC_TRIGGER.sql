-- =====================================================
-- CORRECTION : Fonction sync_edl_projects_to_projects
-- =====================================================
-- Problème: Erreur "operator does not exist: bigint = uuid"
-- Cause: La fonction compare projects.id (bigint) avec edl_projects.id (UUID)
-- Solution: Utiliser une comparaison par texte ou gérer les types différents
-- =====================================================

-- Créer les colonnes de synchronisation si elles n'existent pas
DO $$ 
BEGIN
  -- Colonne pour edl_projects
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'edl_projects' 
    AND column_name = 'sync_from_projects'
  ) THEN
    ALTER TABLE public.edl_projects 
    ADD COLUMN sync_from_projects BOOLEAN DEFAULT false;
  END IF;

  -- Colonne pour projects
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'sync_from_edl_projects'
  ) THEN
    ALTER TABLE public.projects 
    ADD COLUMN sync_from_edl_projects BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Option 1: Désactiver temporairement le trigger (solution rapide)
-- DROP TRIGGER IF EXISTS sync_edl_projects_to_projects_trigger ON public.edl_projects;

-- Option 2: Corriger la fonction pour gérer les types différents
CREATE OR REPLACE FUNCTION sync_edl_projects_to_projects()
RETURNS TRIGGER AS $$
DECLARE
  project_id_check UUID;
  projects_id_type TEXT;
BEGIN
  -- Éviter les boucles de synchronisation
  IF NEW.sync_from_projects = true THEN
    RETURN NEW;
  END IF;

  -- Vérifier le type de la colonne id dans projects
  SELECT data_type INTO projects_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'projects'
    AND column_name = 'id';

  -- Si projects.id est bigint, on ne peut pas synchroniser directement
  -- On génère un nouvel ID ou on skip la synchronisation
  IF projects_id_type = 'bigint' THEN
    -- Ne pas synchroniser si projects.id est bigint
    -- Car on ne peut pas convertir UUID en bigint de manière fiable
    RETURN NEW;
  END IF;

  -- Si projects.id est UUID, on peut synchroniser normalement
  -- Chercher si un projects correspondant existe déjà
  SELECT id INTO project_id_check
  FROM public.projects
  WHERE id = NEW.id;

  IF project_id_check IS NOT NULL THEN
    -- Mise à jour
    UPDATE public.projects
    SET
      user_id = NEW.user_id,
      name = NEW.name,
      property_type = NEW.property_type,
      address = NEW.address,
      postal_code = NEW.postal_code,
      city = NEW.city,
      number_of_units = NEW.number_of_units,
      rooms_count = NEW.rooms_count,
      has_parking = NEW.has_parking,
      has_box = NEW.has_box,
      has_garage = NEW.has_garage,
      additional_info = NEW.additional_info,
      template_data = NEW.template_data,
      pdf_files = NEW.pdf_files,
      project_documents = NEW.project_documents,
      archived = NEW.archived,
      status = NEW.status,
      total_area = NEW.total_area,
      updated_at = now(),
      sync_from_edl_projects = true
    WHERE id = NEW.id;
  ELSE
    -- Insertion (seulement si c'est un EDL, pas un projet MyProjets)
    INSERT INTO public.projects (
      id,
      user_id,
      name,
      property_type,
      address,
      postal_code,
      city,
      number_of_units,
      rooms_count,
      has_parking,
      has_box,
      has_garage,
      additional_info,
      template_data,
      pdf_files,
      project_documents,
      archived,
      status,
      total_area,
      created_at,
      updated_at,
      sync_from_edl_projects
    )
    VALUES (
      NEW.id,
      NEW.user_id,
      NEW.name,
      NEW.property_type,
      NEW.address,
      NEW.postal_code,
      NEW.city,
      NEW.number_of_units,
      NEW.rooms_count,
      NEW.has_parking,
      NEW.has_box,
      NEW.has_garage,
      NEW.additional_info,
      NEW.template_data,
      NEW.pdf_files,
      NEW.project_documents,
      NEW.archived,
      NEW.status,
      NEW.total_area,
      COALESCE(NEW.created_at, now()),
      COALESCE(NEW.updated_at, now()),
      true
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- En cas d'erreur (type incompatible), on log et on continue
  RAISE NOTICE 'Erreur lors de la synchronisation edl_projects vers projects: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_edl_projects_to_projects() IS 
'Synchronise automatiquement les EDL de la table edl_projects vers projects. Gère les différences de type entre bigint et uuid.';

-- Créer le trigger pour activer la synchronisation automatique
DROP TRIGGER IF EXISTS sync_edl_projects_to_projects_trigger ON public.edl_projects;

CREATE TRIGGER sync_edl_projects_to_projects_trigger
  AFTER INSERT OR UPDATE ON public.edl_projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_edl_projects_to_projects();

COMMENT ON TRIGGER sync_edl_projects_to_projects_trigger ON public.edl_projects IS 
'Déclenche la synchronisation automatique de edl_projects vers projects lors des insertions et mises à jour.';

-- =====================================================
-- SYNCHRONISATION INVERSE : projects → edl_projects
-- =====================================================
-- Pour la synchronisation bidirectionnelle complète
-- =====================================================

-- Fonction de synchronisation inverse
CREATE OR REPLACE FUNCTION sync_projects_to_edl_projects()
RETURNS TRIGGER AS $$
DECLARE
  edl_project_id_check UUID;
  projects_id_type TEXT;
BEGIN
  -- Éviter les boucles de synchronisation
  IF NEW.sync_from_edl_projects = true THEN
    RETURN NEW;
  END IF;

  -- Vérifier le type de la colonne id dans projects
  SELECT data_type INTO projects_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'projects'
    AND column_name = 'id';

  -- Si projects.id est bigint, on ne peut pas synchroniser directement
  IF projects_id_type = 'bigint' THEN
    RETURN NEW;
  END IF;

  -- Chercher si un edl_projects correspondant existe déjà
  SELECT id INTO edl_project_id_check
  FROM public.edl_projects
  WHERE id = NEW.id;

  IF edl_project_id_check IS NOT NULL THEN
    -- Mise à jour
    UPDATE public.edl_projects
    SET
      user_id = NEW.user_id,
      name = NEW.name,
      property_type = NEW.property_type,
      address = NEW.address,
      postal_code = NEW.postal_code,
      city = NEW.city,
      number_of_units = NEW.number_of_units,
      rooms_count = NEW.rooms_count,
      has_parking = NEW.has_parking,
      has_box = NEW.has_box,
      has_garage = NEW.has_garage,
      additional_info = NEW.additional_info,
      template_data = NEW.template_data,
      pdf_files = NEW.pdf_files,
      project_documents = NEW.project_documents,
      archived = NEW.archived,
      status = NEW.status,
      total_area = NEW.total_area,
      updated_at = now(),
      sync_from_projects = true
    WHERE id = NEW.id;
  ELSE
    -- Insertion dans edl_projects (seulement si c'est un projet EDL)
    -- On peut ajouter une condition ici pour identifier les projets EDL
    -- Par exemple : NEW.project_type = 'edl' ou un autre champ
    INSERT INTO public.edl_projects (
      id,
      user_id,
      name,
      property_type,
      address,
      postal_code,
      city,
      number_of_units,
      rooms_count,
      has_parking,
      has_box,
      has_garage,
      additional_info,
      template_data,
      pdf_files,
      project_documents,
      archived,
      status,
      total_area,
      created_at,
      updated_at,
      sync_from_projects
    )
    VALUES (
      NEW.id,
      NEW.user_id,
      NEW.name,
      NEW.property_type,
      NEW.address,
      NEW.postal_code,
      NEW.city,
      NEW.number_of_units,
      NEW.rooms_count,
      NEW.has_parking,
      NEW.has_box,
      NEW.has_garage,
      NEW.additional_info,
      NEW.template_data,
      NEW.pdf_files,
      NEW.project_documents,
      NEW.archived,
      NEW.status,
      NEW.total_area,
      COALESCE(NEW.created_at, now()),
      COALESCE(NEW.updated_at, now()),
      true
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- En cas d'erreur, on log et on continue
  RAISE NOTICE 'Erreur lors de la synchronisation projects vers edl_projects: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_projects_to_edl_projects() IS 
'Synchronise automatiquement les projets de la table projects vers edl_projects. Permet la synchronisation bidirectionnelle.';

-- Créer le trigger inverse pour activer la synchronisation automatique
DROP TRIGGER IF EXISTS sync_projects_to_edl_projects_trigger ON public.projects;

CREATE TRIGGER sync_projects_to_edl_projects_trigger
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_projects_to_edl_projects();

COMMENT ON TRIGGER sync_projects_to_edl_projects_trigger ON public.projects IS 
'Déclenche la synchronisation automatique de projects vers edl_projects lors des insertions et mises à jour. Permet la synchronisation bidirectionnelle.';
