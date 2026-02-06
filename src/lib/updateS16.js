/**
 * Fonction pour mettre à jour S16 depuis le frontend
 * Utilisée par le bouton dans la page Stats
 */

import { supabase } from './supabase';

const S16_FILE_ID = '1hnpbrUpBMS1TZI7IovfpKeZfWJH1Aptm';

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
 * Convertit une valeur en nombre
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
    
    if (['gameid', 'datacompleteness', 'url', 'league', 'split', 'side', 'position', 
         'playername', 'playerid', 'teamname', 'teamid', 'champion', 'patch',
         'ban1', 'ban2', 'ban3', 'ban4', 'ban5',
         'pick1', 'pick2', 'pick3', 'pick4', 'pick5'].includes(header)) {
      row[header] = value || null;
    } else if (header === 'date') {
      row[header] = parseDate(value);
    } else if (['team_kpm', 'ckpm', 'dpm', 'damageshare', 'damagetakenperminute', 
                'damagemitigatedperminute', 'wpm', 'wcpm', 'vspm', 'earned_gpm', 
                'earnedgoldshare', 'cspm', 'gspd', 'gpr',
                'golddiffat10', 'xpdiffat10', 'csdiffat10',
                'golddiffat15', 'xpdiffat15', 'csdiffat15',
                'golddiffat20', 'xpdiffat20', 'csdiffat20',
                'golddiffat25', 'xpdiffat25', 'csdiffat25'].includes(header)) {
      row[header] = toNumber(value);
    } else {
      row[header] = toNumber(value);
    }
  });
  
  row.season = 'S16';
  return row;
}

/**
 * Mise à jour S16 (appelée depuis le bouton)
 */
export async function updateS16(onProgress) {
  if (!supabase) {
    throw new Error('Supabase non configuré');
  }

  try {
    // 1. Récupérer les gameids existants
    onProgress?.('Récupération des matchs existants...');
    
    const { data: existingData, error: fetchError } = await supabase
      .from('pro_stats')
      .select('gameid')
      .eq('season', 'S16');
    
    if (fetchError) throw fetchError;
    
    const existingGameIds = new Set(existingData.map(row => row.gameid));
    
    onProgress?.(`${existingGameIds.size} matchs en base`);
    
    // 2. Charger le CSV local (depuis data/csv/S16.csv)
    onProgress?.('Chargement du CSV S16 local...');
    
    // Essayer de charger depuis le dossier public
    const csvUrl = '/data/csv/S16.csv';
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      // Si le fichier n'existe pas localement, indiquer d'utiliser npm run update-s16
      throw new Error(
        `Fichier S16.csv non trouvé dans public/data/csv/\n\n` +
        `Solution : Utilisez la commande dans le terminal :\n` +
        `npm run update-s16\n\n` +
        `Cette commande télécharge le CSV depuis Google Drive et l'importe directement dans Supabase.`
      );
    }
    
    const csvText = await response.text();
    
    // 3. Parser le CSV
    onProgress?.('Analyse des données...');
    
    const lines = csvText.split('\n').filter(line => line.trim());
    const separator = (lines[0].match(/,/g) || []).length > (lines[0].match(/\t/g) || []).length ? ',' : '\t';
    const headers = parseCSVLine(lines[0], separator);
    
    const normalizedHeaders = headers.map(h => {
      return h.toLowerCase()
        .replace(/ /g, '_')
        .replace(/\(/g, '')
        .replace(/\)/g, '')
        .replace(/__+/g, '_')
        .trim();
    });
    
    // 4. Filtrer les nouvelles lignes
    const newRows = [];
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i], separator);
        const row = transformRow(normalizedHeaders, values);
        
        if (!existingGameIds.has(row.gameid)) {
          newRows.push(row);
        }
      } catch (error) {
        console.error(`Erreur ligne ${i}:`, error);
      }
    }
    
    onProgress?.(`${newRows.length} nouveaux matchs trouvés`);
    
    if (newRows.length === 0) {
      return { success: true, inserted: 0, message: 'Aucun nouveau match !' };
    }
    
    // 5. Insérer par batch
    onProgress?.(`Insertion de ${newRows.length} matchs...`);
    
    const BATCH_SIZE = 500; // Plus petit pour éviter les timeouts côté client
    let totalInserted = 0;
    
    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      const batch = newRows.slice(i, Math.min(i + BATCH_SIZE, newRows.length));
      
      const { error } = await supabase
        .from('pro_stats')
        .insert(batch);
      
      if (error) {
        console.error('Erreur insertion:', error);
      } else {
        totalInserted += batch.length;
        onProgress?.(`${totalInserted}/${newRows.length} matchs insérés...`);
      }
    }
    
    return { 
      success: true, 
      inserted: totalInserted,
      message: `${totalInserted} nouveaux matchs ajoutés !`
    };
    
  } catch (error) {
    console.error('Erreur updateS16:', error);
    throw error;
  }
}
