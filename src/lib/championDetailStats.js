import { supabase } from './supabase';

/**
 * Récupère toutes les stats d'un champion spécifique
 */
export async function getChampionDetailStats(championName, filters = {}) {
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
    // Récupérer TOUTES les données du champion
    let allData = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('pro_stats')
        .select('*')
        .eq('champion', championName)
        .eq('season', season)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Appliquer les filtres
      if (split && split !== 'all') {
        query = query.eq('split', split);
      }
      if (tournament && tournament !== 'all') {
        query = query.eq('league', tournament);
      }
      if (patch && patch !== 'all') {
        query = query.eq('patch', patch);
      }
      if (role && role !== 'all') {
        query = query.eq('position', role.toLowerCase());
      }
      if (leagues && leagues.length > 0) {
        query = query.in('league', leagues);
      }
      if (side && side !== 'all') {
        query = query.eq('side', side);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erreur récupération champion stats:', error);
        return { data: null, error };
      }

      allData = [...allData, ...(data || [])];

      if (!data || data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // Calculer les stats agrégées
    const stats = calculateChampionStats(allData, championName);

    return { data: stats, error: null };
  } catch (error) {
    console.error('Erreur getChampionDetailStats:', error);
    return { data: null, error };
  }
}

/**
 * Calcule les stats agrégées d'un champion
 */
function calculateChampionStats(matches, championName) {
  if (!matches || matches.length === 0) {
    return null;
  }

  // Stats générales
  const totalGames = matches.length;
  const wins = matches.filter(m => m.result === 1).length;
  const losses = totalGames - wins;
  const winrate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

  // KDA
  const kills = matches.map(m => m.kills || 0);
  const deaths = matches.map(m => m.deaths || 0);
  const assists = matches.map(m => m.assists || 0);
  const avgKills = avg(kills);
  const avgDeaths = avg(deaths);
  const avgAssists = avg(assists);
  const kda = avgDeaths > 0 ? (avgKills + avgAssists) / avgDeaths : (avgKills + avgAssists);

  // Autres stats
  const csm = avg(matches.map(m => m.cspm || 0));
  const gpm = avg(matches.map(m => m.earned_gpm || 0));
  const dpm = avg(matches.map(m => m.dpm || 0));
  const csd15 = avg(matches.map(m => m.csdiffat15 || 0));
  const gd15 = avg(matches.map(m => m.golddiffat15 || 0));
  const xpd15 = avg(matches.map(m => m.xpdiffat15 || 0));
  const avgGameLength = avg(matches.map(m => m.gamelength || 0));

  // Compter les bans (approximatif)
  const uniqueGames = new Set(matches.map(m => m.gameid)).size;
  const bansEstimate = uniqueGames * 0.3; // Estimation

  // Stats par rôle
  const roleStats = calculateRoleStats(matches);

  // Best players
  const playerStats = calculatePlayerStats(matches);

  // League stats
  const leagueStats = calculateLeagueStats(matches);

  // Presence by patch
  const patchStats = calculatePatchStats(matches);

  return {
    general: {
      picks: totalGames,
      bans: Math.round(bansEstimate),
      wins,
      losses,
      winrate,
      kda,
      csm,
      gpm: Math.round(gpm),
      dpm: Math.round(dpm),
      csd15,
      gd15: Math.round(gd15),
      xpd15: Math.round(xpd15),
      avgGameLength: formatTime(avgGameLength),
      prioScore: 0, // À calculer avec les bans réels
      presenceBySeries: 0, // À calculer
      avgRoundPicked: 0, // À calculer
    },
    roleStats,
    playerStats: playerStats.slice(0, 10), // Top 10
    leagueStats,
    patchStats,
  };
}

/**
 * Calcule les stats par rôle
 */
function calculateRoleStats(matches) {
  const roles = ['top', 'jng', 'mid', 'bot', 'sup'];
  const roleNames = { top: 'TOP', jng: 'JUNGLE', mid: 'MID', bot: 'BOT', sup: 'SUPPORT' };
  
  const stats = {};

  roles.forEach(role => {
    const roleMatches = matches.filter(m => m.position?.toLowerCase() === role);
    
    if (roleMatches.length === 0) {
      stats[roleNames[role]] = null;
      return;
    }

    const wins = roleMatches.filter(m => m.result === 1).length;
    const winrate = (wins / roleMatches.length) * 100;
    
    const kills = roleMatches.map(m => m.kills || 0);
    const deaths = roleMatches.map(m => m.deaths || 0);
    const assists = roleMatches.map(m => m.assists || 0);
    const avgKills = avg(kills);
    const avgDeaths = avg(deaths);
    const avgAssists = avg(assists);
    const kda = avgDeaths > 0 ? (avgKills + avgAssists) / avgDeaths : (avgKills + avgAssists);
    
    const dpm = Math.round(avg(roleMatches.map(m => m.dpm || 0)));

    stats[roleNames[role]] = {
      nb: roleMatches.length,
      winrate,
      kda,
      dpm,
    };
  });

  return stats;
}

/**
 * Calcule les stats par joueur
 */
function calculatePlayerStats(matches) {
  const playerMap = new Map();

  matches.forEach(match => {
    const player = match.playername;
    if (!player) return;

    if (!playerMap.has(player)) {
      playerMap.set(player, {
        name: player,
        games: 0,
        wins: 0,
        kills: [],
        deaths: [],
        assists: [],
        csd15: [],
      });
    }

    const stats = playerMap.get(player);
    stats.games++;
    if (match.result === 1) stats.wins++;
    if (match.kills != null) stats.kills.push(match.kills);
    if (match.deaths != null) stats.deaths.push(match.deaths);
    if (match.assists != null) stats.assists.push(match.assists);
    if (match.csdiffat15 != null) stats.csd15.push(match.csdiffat15);
  });

  return Array.from(playerMap.values())
    .map(p => ({
      name: p.name,
      games: p.games,
      winrate: p.games > 0 ? (p.wins / p.games) * 100 : 0,
      kda: calculateKDA(p.kills, p.deaths, p.assists),
      csd15: avg(p.csd15),
    }))
    .sort((a, b) => b.games - a.games);
}

/**
 * Calcule les stats par league
 */
function calculateLeagueStats(matches) {
  const leagueMap = new Map();

  matches.forEach(match => {
    const league = match.league;
    if (!league) return;

    if (!leagueMap.has(league)) {
      leagueMap.set(league, {
        league,
        games: 0,
        wins: 0,
      });
    }

    const stats = leagueMap.get(league);
    stats.games++;
    if (match.result === 1) stats.wins++;
  });

  const totalGames = matches.length;

  return Array.from(leagueMap.values())
    .map(l => ({
      league: l.league,
      presence: totalGames > 0 ? (l.games / totalGames) * 100 : 0,
      games: l.games,
      winrate: l.games > 0 ? (l.wins / l.games) * 100 : 0,
    }))
    .sort((a, b) => b.presence - a.presence);
}

/**
 * Calcule la présence par patch
 */
function calculatePatchStats(matches) {
  const patchMap = new Map();

  matches.forEach(match => {
    const patch = match.patch;
    if (!patch) return;

    if (!patchMap.has(patch)) {
      patchMap.set(patch, 0);
    }
    patchMap.set(patch, patchMap.get(patch) + 1);
  });

  const totalGames = matches.length;

  return Array.from(patchMap.entries())
    .map(([patch, games]) => ({
      patch,
      games,
      percentage: totalGames > 0 ? (games / totalGames) * 100 : 0,
    }))
    .sort((a, b) => parseFloat(b.patch) - parseFloat(a.patch));
}

/**
 * Récupère les derniers matchs d'un champion
 */
export async function getChampionMatches(championName, filters = {}, limit = 200) {
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
    let query = supabase
      .from('pro_stats')
      .select('*')
      .eq('champion', championName)
      .eq('season', season)
      .order('date', { ascending: false })
      .limit(limit);

    // Appliquer les filtres
    if (split && split !== 'all') {
      query = query.eq('split', split);
    }
    if (tournament && tournament !== 'all') {
      query = query.eq('league', tournament);
    }
    if (patch && patch !== 'all') {
      query = query.eq('patch', patch);
    }
    if (role && role !== 'all') {
      query = query.eq('position', role.toLowerCase());
    }
    if (leagues && leagues.length > 0) {
      query = query.in('league', leagues);
    }
    if (side && side !== 'all') {
      query = query.eq('side', side);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur récupération matches:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Erreur getChampionMatches:', error);
    return { data: null, error };
  }
}

// Helper functions
function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  const sum = arr.reduce((a, b) => a + b, 0);
  return Math.round((sum / arr.length) * 10) / 10;
}

function calculateKDA(kills, deaths, assists) {
  const avgK = avg(kills);
  const avgD = avg(deaths);
  const avgA = avg(assists);
  return avgD > 0 ? (avgK + avgA) / avgD : (avgK + avgA);
}

function formatTime(seconds) {
  if (!seconds) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
