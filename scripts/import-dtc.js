/**
 * Script d'import DTC depuis le fichier local vers Supabase
 * 
 * Usage: node scripts/import-dtc.js
 * 
 * Prérequis:
 * - Le fichier public/data/dtc.csv doit exister
 * - Les variables VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY doivent être dans .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement depuis .env.local manuellement
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value;
      }
    }
  });
}

// Récupérer les variables d'environnement
const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Pour l'import, utiliser la clé service_role qui bypass RLS
// Sinon, utiliser la clé anon (mais nécessite des politiques RLS permissives)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erreur: VITE_SUPABASE_URL doit être défini dans .env.local');
  console.error('\nPour l\'import, vous avez 2 options:');
  console.error('\nOption 1 (Recommandé): Utiliser la clé SERVICE_ROLE (bypass RLS)');
  console.error('  Ajoutez dans .env.local:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role');
  console.error('  (Récupérez-la dans Supabase Dashboard > Settings > API > service_role key)');
  console.error('\nOption 2: Utiliser la clé anon (nécessite des politiques RLS permissives)');
  console.error('  VITE_SUPABASE_PUBLISHABLE_KEY=votre_clé_anon');
  process.exit(1);
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('🔑 Utilisation de la clé SERVICE_ROLE (bypass RLS)');
} else {
  console.log('⚠️  Utilisation de la clé anon - Vérifiez que les politiques RLS permettent l\'insertion');
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
  console.log(`📡 Connexion à Supabase: ${supabaseUrl}\n`);

  try {
    // Chemin vers le fichier CSV - accepter un argument en ligne de commande ou utiliser le chemin par défaut
    let csvPath;
    if (process.argv[2]) {
      // Chemin fourni en argument
      csvPath = process.argv[2];
    } else {
      // Chercher dans plusieurs emplacements possibles
      const possiblePaths = [
        join(__dirname, '..', 'public', 'data', 'dtc.csv'),
        join(process.env.USERPROFILE || process.env.HOME || '', 'Documents', 'dtc.csv'),
        join(process.env.USERPROFILE || process.env.HOME || '', 'Desktop', 'dtc.csv'),
        'dtc.csv', // Dans le répertoire courant
      ];
      
      // Trouver le premier fichier qui existe
      csvPath = possiblePaths.find(path => {
        try {
          return existsSync(path);
        } catch {
          return false;
        }
      });
      
      if (!csvPath) {
        console.error('\n❌ Fichier dtc.csv introuvable dans les emplacements suivants:');
        possiblePaths.forEach(p => console.error(`   - ${p}`));
        console.error('\n💡 Utilisation: node scripts/import-dtc.js <chemin-vers-dtc.csv>');
        console.error('   Exemple: node scripts/import-dtc.js "C:\\Users\\VotreNom\\Documents\\dtc.csv"');
        process.exit(1);
      }
    }
    
    console.log(`📂 Lecture du fichier: ${csvPath}`);

    // Vérifier si le fichier existe
    try {
      const csvContent = readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());

      if (lines.length <= 1) {
        throw new Error('Le fichier CSV est vide ou ne contient que l\'en-tête');
      }

      console.log(`📊 ${lines.length - 1} lignes à traiter (sans l'en-tête)\n`);

      // Structures pour stocker les données uniques
      const familles = new Map();
      const categories = new Map();
      const sousCategories = new Map();
      const taches = [];

      // Parser le CSV
      console.log('📝 Parsing du CSV...');
      let processedLines = 0;

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
          if (i < 10) { // Afficher seulement les 10 premières erreurs
            console.warn(`⚠️  Ligne ${i + 1} ignorée: données incomplètes`);
          }
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

        processedLines++;
        if (processedLines % 1000 === 0) {
          process.stdout.write(`\r  ✓ ${processedLines} lignes traitées...`);
        }
      }

      console.log(`\r  ✓ ${processedLines} lignes traitées complètement\n`);

      console.log(`✅ Parsing terminé:`);
      console.log(`   - ${familles.size} familles uniques`);
      console.log(`   - ${categories.size} catégories uniques`);
      console.log(`   - ${sousCategories.size} sous-catégories uniques`);
      console.log(`   - ${taches.length} tâches uniques\n`);

      // Insérer dans Supabase par batch
      const batchSize = 500;

      // 1. Insérer les familles
      console.log('💾 Insertion des familles dans Supabase...');
      const famillesArray = Array.from(familles.values());
      for (let i = 0; i < famillesArray.length; i += batchSize) {
        const batch = famillesArray.slice(i, i + batchSize);
        const { error } = await supabase
          .from('ft_familles')
          .upsert(batch, { onConflict: 'ft_code' });

        if (error) {
          throw new Error(`Erreur insertion familles: ${error.message}`);
        }
        process.stdout.write(`\r   ✓ ${Math.min(i + batchSize, famillesArray.length)}/${famillesArray.length} familles`);
      }
      console.log('\n');

      // 2. Insérer les catégories
      console.log('💾 Insertion des catégories dans Supabase...');
      const categoriesArray = Array.from(categories.values());
      for (let i = 0; i < categoriesArray.length; i += batchSize) {
        const batch = categoriesArray.slice(i, i + batchSize);
        const { error } = await supabase
          .from('ct_categories')
          .upsert(batch, { onConflict: 'ct_code' });

        if (error) {
          throw new Error(`Erreur insertion catégories: ${error.message}`);
        }
        process.stdout.write(`\r   ✓ ${Math.min(i + batchSize, categoriesArray.length)}/${categoriesArray.length} catégories`);
      }
      console.log('\n');

      // 3. Insérer les sous-catégories
      console.log('💾 Insertion des sous-catégories dans Supabase...');
      const scArray = Array.from(sousCategories.values());
      for (let i = 0; i < scArray.length; i += batchSize) {
        const batch = scArray.slice(i, i + batchSize);
        const { error } = await supabase
          .from('sc_sous_categories')
          .upsert(batch, { onConflict: 'sc_code' });

        if (error) {
          throw new Error(`Erreur insertion sous-catégories: ${error.message}`);
        }
        process.stdout.write(`\r   ✓ ${Math.min(i + batchSize, scArray.length)}/${scArray.length} sous-catégories`);
      }
      console.log('\n');

      // 4. Insérer les tâches
      console.log('💾 Insertion des tâches dans Supabase...');
      console.log('   (Cela peut prendre 2-5 minutes pour 16 992 tâches)');
      for (let i = 0; i < taches.length; i += batchSize) {
        const batch = taches.slice(i, i + batchSize);
        const { error } = await supabase
          .from('t_taches')
          .upsert(batch, { onConflict: 't_code' });

        if (error) {
          throw new Error(`Erreur insertion tâches: ${error.message}`);
        }
        process.stdout.write(`\r   ✓ ${Math.min(i + batchSize, taches.length)}/${taches.length} tâches`);
      }
      console.log('\n');

      console.log('\n🎉 Import terminé avec succès !');
      console.log(`\n📊 Résumé final:`);
      console.log(`   - ${familles.size} familles (FT)`);
      console.log(`   - ${categories.size} catégories (CT)`);
      console.log(`   - ${sousCategories.size} sous-catégories (SC)`);
      console.log(`   - ${taches.length} tâches (T)`);

      // Vérification finale
      console.log('\n🔍 Vérification dans Supabase...');
      const [ftCount, ctCount, scCount, tCount] = await Promise.all([
        supabase.from('ft_familles').select('id', { count: 'exact', head: true }),
        supabase.from('ct_categories').select('id', { count: 'exact', head: true }),
        supabase.from('sc_sous_categories').select('id', { count: 'exact', head: true }),
        supabase.from('t_taches').select('id', { count: 'exact', head: true }),
      ]);

      console.log(`\n✅ Vérification:`);
      console.log(`   - ${ftCount.count} familles en base`);
      console.log(`   - ${ctCount.count} catégories en base`);
      console.log(`   - ${scCount.count} sous-catégories en base`);
      console.log(`   - ${tCount.count} tâches en base`);

    } catch (fileError) {
      if (fileError.code === 'ENOENT') {
        console.error(`\n❌ Erreur: Le fichier n'existe pas: ${csvPath}`);
        console.error('\nVérifiez que le fichier dtc.csv est bien dans: public/data/dtc.csv');
      } else {
        throw fileError;
      }
    }

  } catch (error) {
    console.error('\n❌ Erreur lors de l\'import:', error.message);
    if (error.message.includes('JWT')) {
      console.error('\n💡 Vérifiez que votre clé Supabase est correcte dans .env.local');
    }
    if (error.message.includes('relation') || error.message.includes('does not exist')) {
      console.error('\n💡 Les tables DTC n\'existent pas. Exécutez d\'abord create_dtc_tables.sql dans Supabase');
    }
    process.exit(1);
  }
}

// Exécuter l'import
importDTC();
