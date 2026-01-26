# 🚀 Intégration des Modules - En Cours

**Date:** 8 janvier 2026  
**Statut:** ✅ Export CSV séquences terminé | Autres en attente

---

## ✅ Fonctionnalités Intégrées

### 1. Export CSV pour Séquences ✅
- **Fichier modifié:** `src/components/visit/VisitSequencesList.tsx`
- **Fonctionnalités:**
  - Bouton d'export CSV dans la barre de filtres
  - Export de toutes les séquences filtrées
  - Colonnes incluses:
    - ID, Date, Partie, Lieu, Endroit, Zone
    - Description, Transcription
    - Mode de capture, Vidéo URL, Nombre de photos
    - États (utilisateur, détecté)
    - Statut (localisé, orpheline)
  - Compatible Excel (BOM UTF-8)
  - Nom de fichier avec date: `sequences_{projectId}_{date}.csv`

---

## 🔄 Fonctionnalités En Attente (Priorité HAUTE)

### 2. Export Word/Excel pour Rapports
- **Fichiers à modifier:**
  - `src/components/visit/EDLReportEditorSplitView.tsx`
  - `src/components/edl-report/EDLReportViewer.tsx`
- **À implémenter:**
  - Export Word (.docx) avec formatage
  - Export Excel (.xlsx) avec onglets par section
  - Bibliothèque: `docx` et `xlsx` ou `exceljs`

### 3. Templates Personnalisés pour Rapports
- **Fichiers à créer/modifier:**
  - Nouveau: `src/components/edl-report/TemplateManager.tsx`
  - Nouveau: `src/components/edl-report/TemplateEditor.tsx`
  - Modifier: `src/components/visit/EDLReportEditorSplitView.tsx`
- **À implémenter:**
  - Création de templates
  - Sauvegarde dans Supabase (`edl_templates` table)
  - Application de template à un projet
  - Import/export de templates

### 4. Assignation Utilisateurs sur Tâches
- **Fichiers à modifier:**
  - `src/components/TaskList.tsx`
  - `src/components/kanban/KanbanTaskCard.tsx`
- **À implémenter:**
  - Champ `assigned_to` dans `extracted_tasks`
  - Sélecteur d'utilisateur dans l'interface
  - Filtre par utilisateur assigné
  - Notifications pour assignation

### 5. Dates d'Échéance sur Tâches
- **Fichiers à modifier:**
  - `src/components/TaskList.tsx`
  - `src/components/kanban/KanbanTaskCard.tsx`
- **À implémenter:**
  - Champ `due_date` dans `extracted_tasks`
  - Date picker dans l'interface
  - Filtre par date d'échéance
  - Alertes pour tâches en retard

---

## 📋 Prochaines Étapes

1. ✅ Export CSV séquences - **TERMINÉ**
2. ⏳ Export Word/Excel rapports - **À FAIRE**
3. ⏳ Templates personnalisés - **À FAIRE**
4. ⏳ Assignation utilisateurs - **À FAIRE**
5. ⏳ Dates d'échéance - **À FAIRE**

---

## 🔧 Notes Techniques

### Export CSV Séquences
- Utilise `\ufeff` (BOM UTF-8) pour compatibilité Excel
- Échappement des guillemets dans les valeurs CSV
- Export des séquences filtrées (respecte les filtres actifs)
- Format de date: `formatDate()` existant

### Prochaines intégrations
- **Word/Excel:** Nécessite installation de bibliothèques (`docx`, `xlsx`)
- **Templates:** Nécessite table Supabase `edl_templates`
- **Assignation:** Nécessite table `users` ou `team_members`
- **Dates:** Nécessite migration DB pour ajouter `due_date`

