/**
 * Script d'import des CSV vers Supabase
 * 
 * Usage:
 * 1. Créer un fichier .env avec VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
 * 2. Placer les CSV dans un dossier (ex: data/csv/)
 * 3. Lancer: node scripts/import-csv-to-supabase.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERREUR: Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requises dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mapping des fichiers CSV vers les saisons
const CSV_FILES = {
  'S10': 'data/csv/S10.csv',
  'S11': 'data/csv/S11.csv',
  'S12': 'data/csv/S12.csv',
  'S13': 'data/csv/S13.csv',
  'S14': 'data/csv/S14.csv',
  'S15': 'data/csv/S15.csv',
  'S16': 'data/csv/S16.csv',
};

/**
 * Parse une ligne CSV en tenant compte des guillemets
 * Détecte automatiquement le séparateur (virgule ou tabulation)
 */
function parseCSVLine(line, separator = ',') {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

/**
 * Détecte le séparateur utilisé dans le CSV
 */
function detectSeparator(line) {
  const commaCount = (line.match(/,/g) || []).length;
  const tabCount = (line.match(/\t/g) || []).length;
  return tabCount > commaCount ? '\t' : ',';
}

/**
 * Convertit une valeur en nombre si possible, sinon retourne null
 */
function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Parse une date
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Transforme une ligne CSV en objet pour Supabase
 */
function transformRow(headers, values, season) {
  const row = {};
  
  headers.forEach((header, index) => {
    const value = values[index];
    
    // Colonnes texte
    if (['gameid', 'datacompleteness', 'url', 'league', 'split', 'side', 'position', 
         'playername', 'playerid', 'teamname', 'teamid', 'champion', 'patch',
         'ban1', 'ban2', 'ban3', 'ban4', 'ban5',
         'pick1', 'pick2', 'pick3', 'pick4', 'pick5'].includes(header)) {
      row[header] = value || null;
    }
    // Date
    else if (header === 'date') {
      row[header] = parseDate(value);
    }
    // Colonnes décimales
    else if (['team_kpm', 'ckpm', 'dpm', 'damageshare', 'damagetakenperminute', 
              'damagemitigatedperminute', 'wpm', 'wcpm', 'vspm', 'earned_gpm', 
              'earnedgoldshare', 'cspm'].includes(header)) {
      row[header] = toNumber(value);
    }
    // Colonnes entières
    else {
      row[header] = toNumber(value);
    }
  });
  
  row.season = season;
  return row;
}

/**
 * Import un fichier CSV dans Supabase
 */
async function importCSV(season, filePath) {
  console.log(`\n📂 Import de ${season} depuis ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fichier non trouvé: ${filePath}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  console.log(`   📊 ${lines.length - 1} lignes détectées`);
  
  // Détecter le séparateur
  const separator = detectSeparator(lines[0]);
  console.log(`   📋 Séparateur détecté: ${separator === ',' ? 'virgule' : 'tabulation'}`);
  
  // Parser le header
  const headers = parseCSVLine(lines[0], separator);
  
  // Normaliser les noms de colonnes
  const normalizedHeaders = headers.map(h => {
    return h.toLowerCase()
      .replace(/ /g, '_')           // espaces → underscores
      .replace(/\(/g, '')           // enlever (
      .replace(/\)/g, '')           // enlever )
      .replace(/__+/g, '_')         // __ → _
      .trim();
  });
  
  console.log(`   📋 Exemple de colonnes: ${normalizedHeaders.slice(0, 5).join(', ')}...`);
  
  // Parser les données par batch de 1000 lignes
  const BATCH_SIZE = 1000;
  let totalInserted = 0;
  let errors = 0;
  
  for (let i = 1; i < lines.length; i += BATCH_SIZE) {
    const batch = [];
    
    for (let j = i; j < Math.min(i + BATCH_SIZE, lines.length); j++) {
      try {
        const values = parseCSVLine(lines[j], separator);
        const row = transformRow(normalizedHeaders, values, season);
        batch.push(row);
      } catch (error) {
        console.error(`   ⚠️  Erreur ligne ${j}:`, error.message);
        errors++;
      }
    }
    
    if (batch.length > 0) {
      const { error } = await supabase
        .from('pro_stats')
        .insert(batch);
      
      if (error) {
        console.error(`   ❌ Erreur insertion batch ${i}-${i + batch.length}:`, error.message);
        if (i === 1) {
          // Afficher la première ligne pour debug
          console.log('   🔍 Debug - Première ligne du batch:');
          console.log('      Colonnes:', Object.keys(batch[0]).slice(0, 10).join(', '), '...');
        }
        errors += batch.length;
      } else {
        totalInserted += batch.length;
        console.log(`   ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} lignes insérées`);
      }
    }
  }
  
  console.log(`\n✅ ${season} terminé:`);
  console.log(`   - Insérées: ${totalInserted}`);
  console.log(`   - Erreurs: ${errors}`);
}

/**
 * Script principal
 */
async function main() {
  console.log('🚀 Import des CSV vers Supabase\n');
  console.log('📋 Fichiers à importer:');
  Object.entries(CSV_FILES).forEach(([season, file]) => {
    console.log(`   - ${season}: ${file}`);
  });
  
  // Demander confirmation
  console.log('\n⚠️  ATTENTION: Cette opération va insérer des milliers de lignes dans Supabase.');
  console.log('   Assurez-vous que la table pro_stats est créée (voir supabase-schema.sql)\n');
  
  // Import de chaque saison
  for (const [season, filePath] of Object.entries(CSV_FILES)) {
    await importCSV(season, path.join(__dirname, '..', filePath));
  }
  
  console.log('\n🎉 Import terminé !');
}

// Lancer le script
main().catch(console.error);
