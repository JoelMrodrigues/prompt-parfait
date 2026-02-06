/**
 * Script de mise à jour incrémentale pour S16
 * 
 * Usage: npm run update-s16
 * 
 * Ce script :
 * 1. Télécharge les données S16 depuis Google Sheets (format CSV)
 * 2. Compare avec les données existantes dans Supabase
 * 3. N'insère QUE les nouveaux matchs (pas de doublon)
 * 
 * NOTE: S16 utilise Google Sheets, les autres saisons (S10-S15) utilisent Google Drive CSV
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERREUR: Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requises dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ID du Google Sheet pour S16
// URL: https://docs.google.com/spreadsheets/d/1NPTrBsHpoPoqofVOIl8B6P5r-NlpGjSy1Ij5ysUyRR8/edit
const S16_SPREADSHEET_ID = '1NPTrBsHpoPoqofVOIl8B6P5r-NlpGjSy1Ij5ysUyRR8';

/**
 * Télécharge les données S16 depuis Google Sheets
 * Utilise l'export CSV du Google Sheet (plus simple et pas de CORS)
 */
async function downloadS16CSV() {
  console.log('📥 Téléchargement des données S16 depuis Google Sheets...');
  
  // Nom de la feuille dans le Google Sheet
  const SHEET_NAME = '2026_LoL_esports_match_data_from_OraclesElixir';
  
  // Utiliser l'export CSV du Google Sheet avec le nom de la feuille
  // Format: /gviz/tq?tqx=out:csv&sheet={SHEET_NAME}
  const url = `https://docs.google.com/spreadsheets/d/${S16_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    console.log(`✅ Données téléchargées depuis Google Sheets (${csvText.length} caractères)`);
    return csvText;
  } catch (error) {
    console.error('❌ Erreur téléchargement Google Sheets:', error.message);
    throw error;
  }
}

/**
 * Parse une ligne CSV
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
 * Convertit une valeur en nombre si possible
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
 * Transforme une ligne CSV en objet
 */
function transformRow(headers, values) {
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
              'earnedgoldshare', 'cspm', 'gspd', 'gpr',
              'golddiffat10', 'xpdiffat10', 'csdiffat10',
              'golddiffat15', 'xpdiffat15', 'csdiffat15',
              'golddiffat20', 'xpdiffat20', 'csdiffat20',
              'golddiffat25', 'xpdiffat25', 'csdiffat25'].includes(header)) {
      row[header] = toNumber(value);
    }
    // Colonnes entières
    else {
      row[header] = toNumber(value);
    }
  });
  
  row.season = 'S16';
  return row;
}

/**
 * Récupère les gameids existants pour S16
 */
async function getExistingGameIds() {
  console.log('🔍 Récupération des matchs existants en base...');
  
  const { data, error } = await supabase
    .from('pro_stats')
    .select('gameid')
    .eq('season', 'S16');
  
  if (error) {
    console.error('❌ Erreur récupération gameids:', error);
    throw error;
  }
  
  const gameIds = new Set(data.map(row => row.gameid));
  console.log(`✅ ${gameIds.size} matchs trouvés en base`);
  return gameIds;
}

/**
 * Parse le CSV et retourne les nouvelles lignes
 */
function parseCSV(csvText, existingGameIds) {
  const lines = csvText.split('\n').filter(line => line.trim());
  
  console.log(`📊 ${lines.length - 1} lignes dans le CSV`);
  
  // Détecter le séparateur
  const separator = (lines[0].match(/,/g) || []).length > (lines[0].match(/\t/g) || []).length ? ',' : '\t';
  
  // Parser le header
  const headers = parseCSVLine(lines[0], separator);
  
  // Normaliser les noms de colonnes
  const normalizedHeaders = headers.map(h => {
    return h.toLowerCase()
      .replace(/ /g, '_')
      .replace(/\(/g, '')
      .replace(/\)/g, '')
      .replace(/__+/g, '_')
      .trim();
  });
  
  // Parser les lignes et filtrer les nouvelles
  const newRows = [];
  
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i], separator);
      const row = transformRow(normalizedHeaders, values);
      
      // Vérifier si le match existe déjà
      if (!existingGameIds.has(row.gameid)) {
        newRows.push(row);
      }
    } catch (error) {
      console.error(`⚠️  Erreur ligne ${i}:`, error.message);
    }
  }
  
  return newRows;
}

/**
 * Insère les nouvelles lignes dans Supabase
 */
async function insertNewRows(rows) {
  if (rows.length === 0) {
    console.log('✅ Aucun nouveau match à ajouter !');
    return 0;
  }
  
  console.log(`📤 Insertion de ${rows.length} nouvelles lignes...`);
  
  const BATCH_SIZE = 1000;
  let totalInserted = 0;
  
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, Math.min(i + BATCH_SIZE, rows.length));
    
    const { error } = await supabase
      .from('pro_stats')
      .insert(batch);
    
    if (error) {
      console.error(`❌ Erreur insertion batch ${i}-${i + batch.length}:`, error.message);
    } else {
      totalInserted += batch.length;
      console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} lignes insérées`);
    }
  }
  
  return totalInserted;
}

/**
 * Script principal
 */
async function main() {
  console.log('🚀 Mise à jour S16\n');
  
  try {
    // 1. Récupérer les matchs existants
    const existingGameIds = await getExistingGameIds();
    
    // 2. Télécharger le CSV
    const csvText = await downloadS16CSV();
    
    // 3. Parser et filtrer les nouvelles lignes
    const newRows = parseCSV(csvText, existingGameIds);
    
    console.log(`\n📊 Résumé:`);
    console.log(`   - Matchs en base: ${existingGameIds.size}`);
    console.log(`   - Nouveaux matchs: ${newRows.length}`);
    
    // 4. Insérer les nouvelles lignes
    const inserted = await insertNewRows(newRows);
    
    console.log(`\n🎉 Mise à jour terminée !`);
    console.log(`   ✅ ${inserted} nouveaux matchs ajoutés`);
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  }
}

// Lancer le script
main();
