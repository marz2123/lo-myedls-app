/**
 * Script pour importer le fichier dtc.csv dans Supabase
 * 
 * Utilisation:
 * 1. Installer les dépendances: npm install @supabase/supabase-js node-fetch
 * 2. Configurer les variables d'environnement dans .env.local
 * 3. Exécuter: node import_dtc.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erreur: VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY doivent être définis dans .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction pour parser le rendement
function parseRendement(rendement) {
  if (!rendement) return null;
  const cleaned = rendement.replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Fonction pour normaliser l'unité
function normalizeUnite(unite) {
  if (!unite) return null;
  const normalized = unite.trim().toLowerCase();
  const mapping = {
    'lot': 'lot',
    'u': 'u',
    'm²': 'm2',
    'm2': 'm2',
    'ml': 'ml',
    'm': 'm',
    'kg': 'kg',
    'l': 'l',
  };
  return mapping[normalized] || normalized;
}

async function importDTC() {
  console.log('🚀 Début de l\'import DTC...\n');

  try {
    // Lire le fichier CSV
    const csvPath = join(__dirname, 'public', 'data', 'dtc.csv');
    console.log(`📂 Lecture du fichier: ${csvPath}`);
    
    const csvContent = readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`📊 ${lines.length - 1} lignes à traiter (sans l'en-tête)\n`);

    // Structures pour stocker les données uniques
    const familles = new Map();
    const categories = new Map();
    const sousCategories = new Map();
    const taches = [];

    // Parser le CSV
    console.log('📝 Parsing du CSV...');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(';').map(v => v.trim());
      
      const t_code = values[0] || '';
      const ft_code = values[1] || '';
      const ft_label = values[2] || '';
      const commentaire = values[3] || '';
      const ct_code = values[4] || '';
      const ct_label = values[5] || '';
      const sc_code = values[6] || '';
      const sc_label = values[7] || '';
      const t_label = values[8] || '';
      const description = values[9] || '';
      const unite = values[10] || '';
      const rendement = values[11] || '';
      const controle = values[12] || '';
      const normes = values[13] || '';

      if (!ft_code || !ct_code || !sc_code || !t_code) {
        console.warn(`⚠️  Ligne ${i + 1} ignorée: données incomplètes`);
        continue;
      }

      // Ajouter famille
      if (!familles.has(ft_code)) {
        familles.set(ft_code, {
          ft_code,
          ft_label,
          commentaire_type_equipe: commentaire
        });
      }

      // Ajouter catégorie
      if (!categories.has(ct_code)) {
        categories.set(ct_code, {
          ct_code,
          ft_code,
          ct_label
        });
      }

      // Ajouter sous-catégorie
      if (!sousCategories.has(sc_code)) {
        sousCategories.set(sc_code, {
          sc_code,
          ct_code,
          ft_code,
          sc_label
        });
      }

      // Ajouter tâche
      if (!taches.some(t => t.t_code === t_code)) {
        taches.push({
          t_code,
          sc_code,
          ct_code,
          ft_code,
          t_label,
          description_detaillee: description,
          unite: normalizeUnite(unite),
          rendement_h_par_unite: parseRendement(rendement),
          commentaire_type_equipe: commentaire,
          controle_qualite: controle,
          normes_references: normes
        });
      }

      if (i % 1000 === 0) {
        console.log(`  ✓ ${i} lignes traitées...`);
      }
    }

    console.log(`\n✅ Parsing terminé:`);
    console.log(`   - ${familles.size} familles uniques`);
    console.log(`   - ${categories.size} catégories uniques`);
    console.log(`   - ${sousCategories.size} sous-catégories uniques`);
    console.log(`   - ${taches.length} tâches uniques\n`);

    // Insérer dans Supabase par batch
    const batchSize = 500;

    // 1. Insérer les familles
    console.log('💾 Insertion des familles...');
    const famillesArray = Array.from(familles.values());
    for (let i = 0; i < famillesArray.length; i += batchSize) {
      const batch = famillesArray.slice(i, i + batchSize);
      const { error } = await supabase
        .from('ft_familles')
        .upsert(batch, { onConflict: 'ft_code' });
      
      if (error) {
        throw new Error(`Erreur insertion familles: ${error.message}`);
      }
      console.log(`   ✓ ${Math.min(i + batchSize, famillesArray.length)}/${famillesArray.length} familles`);
    }

    // 2. Insérer les catégories
    console.log('\n💾 Insertion des catégories...');
    const categoriesArray = Array.from(categories.values());
    for (let i = 0; i < categoriesArray.length; i += batchSize) {
      const batch = categoriesArray.slice(i, i + batchSize);
      const { error } = await supabase
        .from('ct_categories')
        .upsert(batch, { onConflict: 'ct_code' });
      
      if (error) {
        throw new Error(`Erreur insertion catégories: ${error.message}`);
      }
      console.log(`   ✓ ${Math.min(i + batchSize, categoriesArray.length)}/${categoriesArray.length} catégories`);
    }

    // 3. Insérer les sous-catégories
    console.log('\n💾 Insertion des sous-catégories...');
    const scArray = Array.from(sousCategories.values());
    for (let i = 0; i < scArray.length; i += batchSize) {
      const batch = scArray.slice(i, i + batchSize);
      const { error } = await supabase
        .from('sc_sous_categories')
        .upsert(batch, { onConflict: 'sc_code' });
      
      if (error) {
        throw new Error(`Erreur insertion sous-catégories: ${error.message}`);
      }
      console.log(`   ✓ ${Math.min(i + batchSize, scArray.length)}/${scArray.length} sous-catégories`);
    }

    // 4. Insérer les tâches
    console.log('\n💾 Insertion des tâches...');
    for (let i = 0; i < taches.length; i += batchSize) {
      const batch = taches.slice(i, i + batchSize);
      const { error } = await supabase
        .from('t_taches')
        .upsert(batch, { onConflict: 't_code' });
      
      if (error) {
        throw new Error(`Erreur insertion tâches: ${error.message}`);
      }
      console.log(`   ✓ ${Math.min(i + batchSize, taches.length)}/${taches.length} tâches`);
    }

    console.log('\n🎉 Import terminé avec succès !');
    console.log(`\n📊 Résumé:`);
    console.log(`   - ${familles.size} familles (FT)`);
    console.log(`   - ${categories.size} catégories (CT)`);
    console.log(`   - ${sousCategories.size} sous-catégories (SC)`);
    console.log(`   - ${taches.length} tâches (T)`);

  } catch (error) {
    console.error('\n❌ Erreur lors de l\'import:', error);
    process.exit(1);
  }
}

// Exécuter l'import
importDTC();
