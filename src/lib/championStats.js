/**
 * Fonctions pour récupérer les statistiques agrégées par champion
 */

import { supabase } from './supabase';

/**
 * Récupère les stats agrégées par champion
 */
export async function getChampionStats(filters = {}) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase non configuré') };
  }

  const {
    season = 'S16',
    split = 'all',
    tournament = 'all',
    patch = 'all',
    role = 'all',
    leagues = [],
    side = 'all',
  } = filters;

  try {
    // Récupérer TOUTES les données (par batch de 1000)
    // IMPORTANT: Appliquer les filtres AVANT la pagination
    let allData = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      // Construire la requête avec TOUS les filtres d'abord
      let query = supabase
        .from('pro_stats')
        .select('*');

      // Filtre par saison (TOUJOURS appliqué si spécifié)
      if (season && season !== 'all') {
        query = query.eq('season', season);
      }

      // Filtre par split
      if (split && split !== 'all') {
        query = query.eq('split', split);
      }

      // Filtre par tournoi
      if (tournament && tournament !== 'all') {
        query = query.eq('league', tournament);
      }

      // Filtre par rôle
      if (role && role !== 'all') {
        query = query.eq('position', role.toLowerCase());
      }

      // Filtre par leagues (si plusieurs)
      if (leagues && leagues.length > 0) {
        query = query.in('league', leagues);
      }

      // Filtre par side
      if (side && side !== 'all') {
        query = query.eq('side', side);
      }

      // Appliquer la pagination APRÈS les filtres
      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error } = await query;

      if (error) {
        console.error('Erreur récupération données:', error);
        return { data: null, error };
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
      }

      // Si on a moins de PAGE_SIZE résultats, c'est la dernière page
      if (!data || data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    }

    console.log(`📊 Total récupéré: ${allData.length} lignes pour ${season} (filtres: split=${split}, tournament=${tournament}, role=${role}, leagues=${leagues.length}, side=${side})`);

    // Agréger les données par champion
    const aggregated = aggregateByChampion(allData);

    return { data: aggregated, error: null };
  } catch (error) {
    console.error('Erreur getChampionStats:', error);
    return { data: null, error };
  }
}

/**
 * Agrège les données par champion
 */
function aggregateByChampion(matches) {
  const championsMap = new Map();
  const uniqueGames = new Set();
  const allBansPerGame = new Map(); // Tous les bans uniques par game
  const picksPerGame = new Map(); // Picks uniques par game (pour éviter les doublons)
  const winsPerGame = new Map(); // Wins par game+champion (pour éviter les doublons)

  matches.forEach(match => {
    const gameid = match.gameid;
    if (!gameid) return;

    // Ignorer les lignes "team" (participantid >= 100)
    // Ces lignes sont des agrégations d'équipe, pas des données de joueur
    if (match.participantid != null && match.participantid >= 100) {
      return;
    }

    // Compter les games uniques
    uniqueGames.add(gameid);

    const champion = match.champion;
    const side = match.side; // "Blue" ou "Red"
    
    // Traiter les PICKS
    // Un pick = une ligne où le champion n'est pas null/empty
    // IMPORTANT: Compter 1 pick par game, même si le champion apparaît dans plusieurs lignes
    if (champion && champion.trim() !== '') {
      // Initialiser la map pour ce game si nécessaire
      if (!picksPerGame.has(gameid)) {
        picksPerGame.set(gameid, new Set());
      }
      
      // Ajouter ce champion à la liste des picks pour ce game (Set = pas de doublon)
      picksPerGame.get(gameid).add(champion);

      if (!championsMap.has(champion)) {
        championsMap.set(champion, {
          champion,
          picks: 0,
          wins: 0,
          losses: 0,
          kills: [],
          deaths: [],
          assists: [],
          gameLengths: [],
          cs: [],
          damage: [],
          gold: [],
          csd15: [],
          gd15: [],
          gamesPresent: new Set(), // Games où le champion est présent (pick ou ban)
          pickGameIds: new Set(), // Pour debug: gameids où le champion est pické
        });
      }

      const stats = championsMap.get(champion);

      // Ajouter ce game (Set = pas de doublon)
      stats.gamesPresent.add(gameid);
      stats.pickGameIds.add(gameid); // Debug

      // Wins/Losses par game (1 win/loss par game, pas par ligne)
      // Utiliser un séparateur unique pour éviter les conflits avec les underscores des gameids
      const winKey = `${gameid}|||${champion}`;
      if (!winsPerGame.has(winKey)) {
        winsPerGame.set(winKey, match.result === 1 ? 'win' : 'loss');
      }

      // Stats pour moyennes (seulement pour les picks)
      if (match.kills != null) stats.kills.push(match.kills);
      if (match.deaths != null) stats.deaths.push(match.deaths);
      if (match.assists != null) stats.assists.push(match.assists);
      if (match.gamelength != null) stats.gameLengths.push(match.gamelength);
      if (match.cspm != null) stats.cs.push(match.cspm);
      if (match.dpm != null) stats.damage.push(match.dpm);
      if (match.earned_gpm != null) stats.gold.push(match.earned_gpm);
      if (match.csdiffat15 != null) stats.csd15.push(match.csdiffat15);
      if (match.golddiffat15 != null) stats.gd15.push(match.golddiffat15);
    }

    // Traiter les BANS
    // IMPORTANT: Chaque ban apparaît dans 5 lignes (une par joueur de l'équipe)
    // On veut compter 1 ban par game, pas 5
    // On utilise un Set par game pour éviter les doublons
    if (!allBansPerGame.has(gameid)) {
      allBansPerGame.set(gameid, new Set());
    }
    
    // Parcourir tous les slots de ban (ban1 à ban5)
    ['ban1', 'ban2', 'ban3', 'ban4', 'ban5'].forEach(banSlot => {
      const bannedChamp = match[banSlot];
      if (bannedChamp && bannedChamp.trim() !== '') {
        // Ajouter au Set (évite les doublons si le même ban apparaît plusieurs fois)
        allBansPerGame.get(gameid).add(bannedChamp);

        // Initialiser le champion dans la map si nécessaire
        if (!championsMap.has(bannedChamp)) {
          championsMap.set(bannedChamp, {
            champion: bannedChamp,
            picks: 0,
            wins: 0,
            losses: 0,
            kills: [],
            deaths: [],
            assists: [],
            gameLengths: [],
            cs: [],
            damage: [],
            gold: [],
            csd15: [],
            gd15: [],
            gamesPresent: new Set(),
            pickGameIds: new Set(), // Pour debug: gameids où le champion est pické
          });
        }
        championsMap.get(bannedChamp).gamesPresent.add(gameid);
      }
    });
  });

  // Compter les PICKS totaux par champion (1 pick = 1 game où le champion est pické)
  const picksCount = new Map();
  picksPerGame.forEach(gamePicks => {
    gamePicks.forEach(champ => {
      picksCount.set(champ, (picksCount.get(champ) || 0) + 1);
    });
  });

  // Compter les WINS/LOSSES par champion (1 win/loss par game)
  const winsCount = new Map();
  const lossesCount = new Map();
  winsPerGame.forEach((result, key) => {
    // La clé est "gameid|||champion", on récupère le champion
    const parts = key.split('|||');
    if (parts.length === 2) {
      const champion = parts[1];
      if (result === 'win') {
        winsCount.set(champion, (winsCount.get(champion) || 0) + 1);
      } else {
        lossesCount.set(champion, (lossesCount.get(champion) || 0) + 1);
      }
    }
  });

  // Compter les BANS totaux par champion (1 ban = 1 game où le champion est banni)
  const bansCount = new Map();
  allBansPerGame.forEach(gameBans => {
    gameBans.forEach(champ => {
      bansCount.set(champ, (bansCount.get(champ) || 0) + 1);
    });
  });

  // Calculer les résultats finaux
  const totalUniqueGames = uniqueGames.size;
  
  console.log(`🎮 Total games uniques: ${totalUniqueGames}`);
  console.log(`📊 Champions trouvés: ${championsMap.size}`);
  
  const result = Array.from(championsMap.values()).map(stats => {
    // Utiliser le comptage depuis picksPerGame (1 pick = 1 game)
    const picks = picksCount.get(stats.champion) || 0;
    const bans = bansCount.get(stats.champion) || 0;
    const wins = winsCount.get(stats.champion) || 0;
    const losses = lossesCount.get(stats.champion) || 0;
    
    const avgKills = avg(stats.kills);
    const avgDeaths = avg(stats.deaths);
    const avgAssists = avg(stats.assists);
    
    // KDA = (K + A) / D
    const kda = avgDeaths > 0 
      ? ((avgKills + avgAssists) / avgDeaths) 
      : (avgKills + avgAssists);

    // Prioscore = (picks + bans) / total_games * 100
    const prioScore = totalUniqueGames > 0 
      ? (((picks + bans) / totalUniqueGames) * 100) 
      : 0;

    // Debug pour les champions avec beaucoup de picks/bans
    if (picks > 50 || bans > 200) {
      console.log(`🔍 ${stats.champion}: picks=${picks}, bans=${bans}, wins=${wins}, losses=${losses}, prioscore=${Math.round(prioScore * 10) / 10}%, totalGames=${totalUniqueGames}`);
    }

    return {
      champion: stats.champion,
      picks: picks, // Utiliser le comptage depuis picksPerGame
      bans: bans,
      prioScore: Math.round(prioScore * 10) / 10,
      wins: wins, // Utiliser le comptage depuis winsPerGame
      losses: losses, // Utiliser le comptage depuis lossesPerGame
      winrate: picks > 0 ? ((wins / picks) * 100) : 0, // Winrate basé sur les picks
      kda: kda,
      gt: formatGameTime(avg(stats.gameLengths)),
      csm: avg(stats.cs),
      dpm: Math.round(avg(stats.damage)),
      gpm: Math.round(avg(stats.gold)),
      csd15: avg(stats.csd15),
      gd15: Math.round(avg(stats.gd15)),
    };
  });

  // Trier par prioscore décroissant pour voir les tops
  const sorted = result.sort((a, b) => b.prioScore - a.prioScore);
  console.log(`🏆 Top 5 prioscore:`, sorted.slice(0, 5).map(c => `${c.champion}: ${c.prioScore}% (${c.picks} picks, ${c.bans} bans)`));

  // Debug PICKS : vérifier quelques champions
  const debugChampions = ['Jayce', 'Orianna', 'Rumble', 'Malphite'];
  debugChampions.forEach(champName => {
    const champ = result.find(c => c.champion === champName);
    if (champ) {
      const stats = championsMap.get(champName);
      const uniquePickGames = stats?.pickGameIds?.size || 0;
      console.log(`🔍 ${champName}: ${champ.picks} picks (${uniquePickGames} games uniques avec ce champion)`);
    }
  });

  return result;
}

/**
 * Calcule la moyenne d'un tableau
 */
function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  const sum = arr.reduce((a, b) => a + b, 0);
  return Math.round((sum / arr.length) * 10) / 10;
}

/**
 * Formate le temps de jeu en MM:SS
 */
function formatGameTime(seconds) {
  if (!seconds) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Récupère la date du dernier match pour une saison
 */
export async function getLastUpdateDate(season = 'S16') {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('pro_stats')
      .select('date')
      .eq('season', season)
      .not('date', 'is', null)
      .order('date', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0].date;
  } catch (error) {
    console.error('Erreur getLastUpdateDate:', error);
    return null;
  }
}

/**
 * Récupère les valeurs uniques pour les filtres
 */
export async function getFilterOptions(season = 'S16') {
  if (!supabase) {
    return {
      tournaments: [],
      patches: [],
      leagues: [],
    };
  }

  try {
    // Récupérer TOUTES les données pour avoir toutes les leagues/patches uniques
    let allData = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('pro_stats')
        .select('league, patch')
        .eq('season', season)
        .not('league', 'is', null)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error('Erreur récupération filter options:', error);
        break;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        hasMore = data.length === PAGE_SIZE;
        page++;
      } else {
        hasMore = false;
      }
    }

    // Extraire les valeurs uniques
    const tournaments = [...new Set(allData.map(d => d.league).filter(Boolean))].sort();
    const patches = [...new Set(allData.map(d => d.patch).filter(Boolean))].sort((a, b) => parseFloat(b) - parseFloat(a));
    const leagues = tournaments; // Leagues = Tournaments dans notre cas

    console.log(`📊 Filter options pour ${season}:`, { 
      tournaments: tournaments.length, 
      patches: patches.length,
      leaguesList: tournaments 
    });

    return {
      tournaments,
      patches,
      leagues,
    };
  } catch (error) {
    console.error('Erreur getFilterOptions:', error);
    return {
      tournaments: [],
      patches: [],
      leagues: [],
    };
  }
}
