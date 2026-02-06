import { supabase } from './supabase';

/**
 * Récupère les détails d'un match depuis Google Sheets pour S16
 */
async function getMatchDetailsFromGoogleSheet(gameid) {
  const S16_SPREADSHEET_ID = '1NPTrBsHpoPoqofVOIl8B6P5r-NlpGjSy1Ij5ysUyRR8';
  const SHEET_NAME = '2026_LoL_esports_match_data_from_OraclesElixir';
  
  try {
    console.log(`📊 Chargement match ${gameid} depuis Google Sheets...`);
    
    // Télécharger le CSV depuis Google Sheets
    const url = `https://docs.google.com/spreadsheets/d/${S16_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return { data: null, error: new Error('CSV vide ou invalide') };
    }
    
    // Parser le header
    const header = parseCSVLine(lines[0]);
    
    // Trouver les indices des colonnes nécessaires
    const gameidIdx = header.findIndex(h => h.toLowerCase().trim() === 'gameid');
    const participantidIdx = header.findIndex(h => h.toLowerCase().trim() === 'participantid');
    
    if (gameidIdx === -1 || participantidIdx === -1) {
      return { data: null, error: new Error('Colonnes manquantes dans le CSV') };
    }
    
    // Filtrer les lignes pour ce gameid et participantid < 100
    const matchRows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length <= Math.max(gameidIdx, participantidIdx)) continue;
      
      const rowGameid = values[gameidIdx]?.trim();
      const participantid = parseInt(values[participantidIdx]?.trim() || '999');
      
      if (rowGameid === gameid && participantid < 100) {
        // Construire un objet avec toutes les colonnes
        const row = {};
        header.forEach((colName, idx) => {
          const normalizedName = colName.toLowerCase()
            .replace(/ /g, '_')
            .replace(/\(/g, '')
            .replace(/\)/g, '')
            .replace(/__+/g, '_')
            .trim();
          let value = values[idx]?.trim() || null;
          
          // Colonnes texte (ne pas convertir)
          const textColumns = ['gameid', 'datacompleteness', 'url', 'league', 'split', 'side', 'position', 
            'playername', 'playerid', 'teamname', 'teamid', 'champion', 'patch',
            'ban1', 'ban2', 'ban3', 'ban4', 'ban5',
            'pick1', 'pick2', 'pick3', 'pick4', 'pick5'];
          
          if (textColumns.includes(normalizedName)) {
            row[normalizedName] = value || null;
          } else if (normalizedName === 'date') {
            // Parser la date
            if (value) {
              const date = new Date(value);
              row[normalizedName] = isNaN(date.getTime()) ? null : date.toISOString();
            } else {
              row[normalizedName] = null;
            }
          } else if (value !== null && value !== '') {
            // Essayer de convertir en nombre (même si c'est "0")
            const numValue = value.includes('.') ? parseFloat(value) : parseInt(value);
            if (!isNaN(numValue)) {
              row[normalizedName] = numValue;
            } else {
              row[normalizedName] = value;
            }
          } else {
            // Valeur vide ou null → convertir en 0 pour les colonnes numériques connues
            const numericColumns = ['kills', 'deaths', 'assists', 'towers', 'dragons', 'barons', 
              'heralds', 'void_grubs', 'inhibitors', 'gamelength', 'result'];
            if (numericColumns.includes(normalizedName)) {
              row[normalizedName] = 0;
            } else {
              row[normalizedName] = null;
            }
          }
        });
        matchRows.push(row);
      }
    }
    
    if (matchRows.length === 0) {
      return { data: null, error: new Error('Match non trouvé') };
    }
    
    console.log(`✅ ${matchRows.length} lignes trouvées pour ${gameid}`);
    
    // Debug : vérifier les colonnes importantes sur la première ligne
    if (matchRows.length > 0) {
      const firstRow = matchRows[0];
      console.log('🔍 Colonnes importantes:', {
        heralds: firstRow.heralds,
        void_grubs: firstRow.void_grubs,
        dragons: firstRow.dragons,
        towers: firstRow.towers,
        barons: firstRow.barons,
        firstherald: firstRow.firstherald
      });
    }
    
    // Organiser les données par équipe
    const matchData = organizeMatchData(matchRows);
    
    return { data: matchData, error: null };
  } catch (error) {
    console.error('Erreur getMatchDetailsFromGoogleSheet:', error);
    return { data: null, error };
  }
}

/**
 * Récupère tous les détails d'un match (tous les joueurs)
 * Pour S16, utilise Google Sheets au lieu de Supabase
 */
export async function getMatchDetails(gameid, season = 'S16') {
  // Pour S16, utiliser Google Sheets
  if (season === 'S16') {
    return await getMatchDetailsFromGoogleSheet(gameid);
  }
  
  // Pour les autres saisons, utiliser Supabase
  if (!supabase) {
    return { data: null, error: new Error('Supabase non configuré') };
  }

  try {
    // Récupérer UNIQUEMENT les lignes de joueurs (participantid 1-10)
    const { data, error } = await supabase
      .from('pro_stats')
      .select('*')
      .eq('gameid', gameid)
      .lt('participantid', 100) // Seulement les joueurs (pas les lignes team)
      .not('champion', 'is', null) // Seulement les lignes avec un champion
      .order('participantid', { ascending: true })
      .limit(20); // Max 10 joueurs par équipe

    if (error) {
      console.error('Erreur récupération match:', error);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      return { data: null, error: new Error('Match non trouvé') };
    }

    // Organiser les données par équipe
    const matchData = organizeMatchData(data);

    return { data: matchData, error: null };
  } catch (error) {
    console.error('Erreur getMatchDetails:', error);
    return { data: null, error };
  }
}

/**
 * Organise les données du match par équipe
 */
function organizeMatchData(matches) {
  const blueTeam = [];
  const redTeam = [];
  const matchInfo = matches[0]; // Infos générales du match

  // Ordre des positions pour trier
  const positionOrder = { top: 1, jng: 2, mid: 3, bot: 4, sup: 5, support: 5 };

  matches.forEach(match => {
    if (match.side === 'Blue') {
      blueTeam.push(match);
    } else if (match.side === 'Red') {
      redTeam.push(match);
    }
  });

  // Trier par position
  const sortByPosition = (a, b) => {
    const posA = (a.position || '').toLowerCase();
    const posB = (b.position || '').toLowerCase();
    return (positionOrder[posA] || 99) - (positionOrder[posB] || 99);
  };

  blueTeam.sort(sortByPosition);
  redTeam.sort(sortByPosition);

  // Trouver les noms d'équipes
  const blueTeamName = blueTeam[0]?.teamname || 'Blue Team';
  const redTeamName = redTeam[0]?.teamname || 'Red Team';
  
  // Récupérer firstPick pour déterminer TeamA vs TeamB
  const blueFirstPick = blueTeam[0]?.firstpick || 0;
  const redFirstPick = redTeam[0]?.firstpick || 0;

  // Calculer les stats d'équipe
  const blueStats = calculateTeamStats(blueTeam);
  const redStats = calculateTeamStats(redTeam);

  // Déterminer le gagnant (result = 1 pour Blue, 0 pour Red)
  const winner = matchInfo.result === 1 ? 'blue' : 'red';
  
  // Déterminer TeamA (firstPick = 1) vs TeamB
  let teamA, teamB, teamAPlayers, teamBPlayers, teamAStats, teamBStats;
  if (blueFirstPick === 1) {
    teamA = blueTeamName;
    teamB = redTeamName;
    teamAPlayers = blueTeam;
    teamBPlayers = redTeam;
    teamAStats = blueStats;
    teamBStats = redStats;
  } else if (redFirstPick === 1) {
    teamA = redTeamName;
    teamB = blueTeamName;
    teamAPlayers = redTeam;
    teamBPlayers = blueTeam;
    teamAStats = redStats;
    teamBStats = blueStats;
  } else {
    // Fallback si firstPick n'est pas disponible : Blue = A, Red = B
    teamA = blueTeamName;
    teamB = redTeamName;
    teamAPlayers = blueTeam;
    teamBPlayers = redTeam;
    teamAStats = blueStats;
    teamBStats = redStats;
  }

  return {
    gameid: matchInfo.gameid,
    date: matchInfo.date,
    league: matchInfo.league,
    split: matchInfo.split,
    season: matchInfo.season,
    patch: matchInfo.patch,
    game: matchInfo.game,
    gamelength: matchInfo.gamelength,
    // Garder blueTeam et redTeam pour compatibilité
    blueTeam: {
      name: blueTeamName,
      players: blueTeam,
      stats: blueStats,
    },
    redTeam: {
      name: redTeamName,
      players: redTeam,
      stats: redStats,
    },
    // Ajouter teamA et teamB
    teamA: {
      name: teamA,
      players: teamAPlayers,
      stats: teamAStats,
    },
    teamB: {
      name: teamB,
      players: teamBPlayers,
      stats: teamBStats,
    },
    winner,
  };
}

/**
 * Calcule les stats d'une équipe
 */
function calculateTeamStats(players) {
  if (!players || players.length === 0) {
    return {
      kills: 0, deaths: 0, assists: 0, gold: 0,
      towers: 0, dragons: 0, barons: 0, inhibitors: 0,
      heralds: 0, void_grubs: 0
    };
  }
  
  const firstPlayer = players[0];
  
  // Debug : voir les clés disponibles
  if (firstPlayer) {
    const keys = Object.keys(firstPlayer).filter(k => 
      k.includes('herald') || k.includes('grub') || k.includes('dragon') || 
      k.includes('tower') || k.includes('baron')
    );
    if (keys.length > 0) {
      console.log('🔍 Colonnes trouvées:', keys);
      console.log('🔍 Valeurs:', keys.map(k => `${k}=${firstPlayer[k]}`));
    }
  }
  
  const totalKills = players.reduce((sum, p) => sum + (p.kills || 0), 0);
  const totalDeaths = players.reduce((sum, p) => sum + (p.deaths || 0), 0);
  const totalAssists = players.reduce((sum, p) => sum + (p.assists || 0), 0);
  const totalGold = players.reduce((sum, p) => sum + (p.totalgold || 0), 0);
  
  // Récupérer depuis le premier joueur (toutes les lignes d'une équipe ont les mêmes valeurs pour ces stats)
  // Utiliser directement les colonnes comme pour kills
  const totalTowers = firstPlayer.towers ?? 0;
  const totalDragons = firstPlayer.dragons ?? 0;
  const totalBarons = firstPlayer.barons ?? 0;
  const totalInhibitors = firstPlayer.inhibitors ?? 0;
  
  // Herald : nombre de heralds (colonne `heralds`)
  const totalHeralds = firstPlayer.heralds ?? 0;
  
  // Grubs : nombre de grubs (colonne `void_grubs`)
  const totalGrubs = firstPlayer.void_grubs ?? 0;

  return {
    kills: totalKills,
    deaths: totalDeaths,
    assists: totalAssists,
    gold: totalGold,
    towers: totalTowers,
    dragons: totalDragons,
    barons: totalBarons,
    inhibitors: totalInhibitors,
    heralds: totalHeralds,
    void_grubs: totalGrubs,
  };
}

/**
 * Formate le nom du match (Team1 vs Team2)
 */
export function formatMatchName(match) {
  if (!match || !match.gameid) return '-';
  
  // On doit récupérer les deux équipes depuis le match
  // Pour l'instant, on utilise le gameid comme fallback
  return match.game || match.gameid;
}

/**
 * Récupère les noms d'équipes depuis Google Sheets pour S16
 */
async function getTeamNamesFromGoogleSheet(gameids) {
  const S16_SPREADSHEET_ID = '1NPTrBsHpoPoqofVOIl8B6P5r-NlpGjSy1Ij5ysUyRR8';
  const SHEET_NAME = '2026_LoL_esports_match_data_from_OraclesElixir';
  
  try {
    console.log(`📊 Chargement depuis Google Sheets pour ${gameids.length} gameids...`);
    
    // Télécharger le CSV depuis Google Sheets
    const url = `https://docs.google.com/spreadsheets/d/${S16_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      console.error('CSV vide ou invalide');
      return {};
    }
    
    // Parser le header avec parseCSVLine pour gérer les guillemets
    const header = parseCSVLine(lines[0]);
    console.log('📋 Header:', header.slice(0, 10), '...');
    
    const gameidIdx = header.findIndex(h => h.toLowerCase().trim() === 'gameid');
    const teamnameIdx = header.findIndex(h => h.toLowerCase().trim() === 'teamname');
    const sideIdx = header.findIndex(h => h.toLowerCase().trim() === 'side');
    const firstpickIdx = header.findIndex(h => h.toLowerCase().trim() === 'firstpick');
    
    console.log(`🔍 Indices: gameid=${gameidIdx}, teamname=${teamnameIdx}, side=${sideIdx}, firstpick=${firstpickIdx}`);
    
    if (gameidIdx === -1 || teamnameIdx === -1 || sideIdx === -1 || firstpickIdx === -1) {
      console.error('❌ Colonnes manquantes dans le CSV', { gameidIdx, teamnameIdx, sideIdx, firstpickIdx });
      return {};
    }
    
    // Créer un Set des gameids recherchés pour un lookup rapide
    const gameidsSet = new Set(gameids);
    const gamesData = {};
    
    // Parser les lignes
    let processedCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length <= Math.max(gameidIdx, teamnameIdx, sideIdx, firstpickIdx)) {
        continue; // Ligne incomplète
      }
      
      const gameid = values[gameidIdx]?.trim();
      
      if (!gameid || !gameidsSet.has(gameid)) continue;
      
      const teamname = values[teamnameIdx]?.trim();
      const side = values[sideIdx]?.trim();
      const firstpick = parseInt(values[firstpickIdx]?.trim() || '0');
      
      if (!teamname || !side) continue;
      
      if (!gamesData[gameid]) {
        gamesData[gameid] = {};
      }
      
      // Stocker les données par side (une seule fois par équipe)
      if (side === 'Blue' && !gamesData[gameid].blue) {
        gamesData[gameid].blue = { teamname, firstpick };
        processedCount++;
      } else if (side === 'Red' && !gamesData[gameid].red) {
        gamesData[gameid].red = { teamname, firstpick };
        processedCount++;
      }
    }
    
    console.log(`✅ ${processedCount} équipes trouvées pour ${Object.keys(gamesData).length} games`);
    
    // Construire le résultat "TeamA vs TeamB"
    const namesMap = {};
    Object.keys(gamesData).forEach(gameid => {
      const teams = gamesData[gameid];
      if (teams.blue && teams.red) {
        let teamA, teamB;
        if (teams.blue.firstpick === 1) {
          teamA = teams.blue.teamname;
          teamB = teams.red.teamname;
        } else if (teams.red.firstpick === 1) {
          teamA = teams.red.teamname;
          teamB = teams.blue.teamname;
        } else {
          // Fallback si firstpick n'est pas disponible : Blue = A, Red = B
          teamA = teams.blue.teamname;
          teamB = teams.red.teamname;
        }
        namesMap[gameid] = `${teamA} vs ${teamB}`;
      } else {
        console.warn(`⚠️ Game ${gameid} incomplet: Blue=${teams.blue?.teamname}, Red=${teams.red?.teamname}`);
      }
    });
    
    console.log(`✅ ${Object.keys(namesMap).length} noms d'équipes générés`);
    return namesMap;
  } catch (error) {
    console.error('Erreur getTeamNamesFromGoogleSheet:', error);
    return {};
  }
}

/**
 * Parse une ligne CSV en tenant compte des guillemets
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
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
 * Récupère les noms d'équipes pour plusieurs matches en une seule requête optimisée
 * Pour S16, utilise Google Sheets au lieu de Supabase
 */
export async function getMultipleMatchTeamNames(gameids, season = 'S16') {
  // Pour S16, utiliser Google Sheets
  if (season === 'S16') {
    return await getTeamNamesFromGoogleSheet(gameids);
  }
  
  // Pour les autres saisons, utiliser Supabase
  if (!supabase || !gameids || gameids.length === 0) {
    return {};
  }

  try {
    // Récupérer UNE ligne de chaque équipe pour chaque match
    // On utilise distinct on (gameid, side) pour avoir Blue et Red
    const namesMap = {};
    const BATCH_SIZE = 5; // Très petits batches pour éviter timeout

    for (let i = 0; i < gameids.length; i += BATCH_SIZE) {
      const batch = gameids.slice(i, i + BATCH_SIZE);
      
      // Récupérer les lignes avec teamname et firstPick, en prenant la première de chaque équipe
      // On récupère pour chaque gameid: une ligne Blue et une ligne Red
      const { data, error } = await supabase
        .from('pro_stats')
        .select('gameid, side, teamname, firstpick, participantid')
        .in('gameid', batch)
        .not('teamname', 'is', null)
        .lt('participantid', 100) // Seulement les joueurs (pas les lignes team participantid=100/200)
        .order('gameid')
        .order('side') // Trier par side pour avoir Blue puis Red
        .order('participantid', { ascending: true })
        .limit(100); // Limiter le nombre de lignes retournées par batch

      if (error) {
        console.error('Erreur getMultipleMatchTeamNames:', error);
        // Attendre un peu avant de continuer pour éviter de surcharger
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      if (data) {
        // Grouper par gameid et side, prendre la première occurrence de chaque
        const gamesData = {};
        data.forEach(row => {
          if (!gamesData[row.gameid]) {
            gamesData[row.gameid] = {};
          }
          // Prendre la première occurrence de chaque side avec firstPick
          if (row.side === 'Blue' && !gamesData[row.gameid].blue) {
            gamesData[row.gameid].blue = {
              teamname: row.teamname,
              firstpick: row.firstpick
            };
          } else if (row.side === 'Red' && !gamesData[row.gameid].red) {
            gamesData[row.gameid].red = {
              teamname: row.teamname,
              firstpick: row.firstpick
            };
          }
        });

        // Construire les noms "Équipe A vs Équipe B" en fonction de firstPick
        // firstPick = 1 → Équipe A, l'autre → Équipe B
        Object.keys(gamesData).forEach(gameid => {
          const teams = gamesData[gameid];
          if (teams.blue && teams.red) {
            // Déterminer quelle équipe est A (firstPick = 1) et laquelle est B
            let teamA, teamB;
            if (teams.blue.firstpick === 1) {
              teamA = teams.blue.teamname;
              teamB = teams.red.teamname;
            } else if (teams.red.firstpick === 1) {
              teamA = teams.red.teamname;
              teamB = teams.blue.teamname;
            } else {
              // Fallback si firstPick n'est pas disponible : utiliser Blue vs Red
              teamA = teams.blue.teamname;
              teamB = teams.red.teamname;
            }
            namesMap[gameid] = `${teamA} vs ${teamB}`;
          } else {
            console.warn(`Match ${gameid} incomplet: Blue=${teams.blue?.teamname}, Red=${teams.red?.teamname}`);
          }
        });
      }
      
      // Petit délai entre les batches pour éviter de surcharger Supabase
      if (i + BATCH_SIZE < gameids.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    return namesMap;
  } catch (error) {
    console.error('Erreur getMultipleMatchTeamNames:', error);
    return {};
  }
}

/**
 * Récupère les noms d'équipes d'un match (fonction legacy, utilise getMultipleMatchTeamNames)
 */
export async function getMatchTeamNames(gameid) {
  const result = await getMultipleMatchTeamNames([gameid]);
  return {
    blueTeam: result[gameid]?.split(' vs ')[0] || null,
    redTeam: result[gameid]?.split(' vs ')[1] || null,
  };
}
