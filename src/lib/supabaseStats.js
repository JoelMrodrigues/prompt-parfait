/**
 * Module pour charger les statistiques professionnelles depuis Supabase
 */

import { supabase } from './supabase';

const ITEMS_PER_PAGE = 100;

/**
 * Charge les stats avec pagination et filtres
 * @param {Object} options - Options de requête
 * @param {string} options.season - Saison (S10-S16)
 * @param {number} options.page - Numéro de page (commence à 0)
 * @param {string} options.search - Terme de recherche
 * @param {string} options.league - Filtre par ligue
 * @param {string} options.champion - Filtre par champion
 * @param {string} options.position - Filtre par position
 * @param {string} options.sortBy - Colonne de tri
 * @param {boolean} options.sortDesc - Tri descendant
 * @returns {Promise<{data: Array, count: number, error: any}>}
 */
export async function loadProStats(options = {}) {
  if (!supabase) {
    return { 
      data: null, 
      count: 0, 
      error: new Error('Supabase non configuré. Mode démo activé.') 
    };
  }

  const {
    season = 'S16',
    page = 0,
    search = '',
    league = '',
    champion = '',
    position = '',
    sortBy = 'date',
    sortDesc = true,
  } = options;

  try {
    // Construire la requête
    let query = supabase
      .from('pro_stats')
      .select('*', { count: 'exact' });

    // Filtre par saison
    if (season && season !== 'all') {
      query = query.eq('season', season);
    }

    // Recherche globale
    if (search) {
      query = query.or(
        `playername.ilike.%${search}%,` +
        `teamname.ilike.%${search}%,` +
        `champion.ilike.%${search}%,` +
        `league.ilike.%${search}%`
      );
    }

    // Filtres spécifiques
    if (league) {
      query = query.eq('league', league);
    }
    if (champion) {
      query = query.eq('champion', champion);
    }
    if (position) {
      query = query.eq('position', position);
    }

    // Tri
    query = query.order(sortBy, { ascending: !sortDesc });

    // Pagination
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE - 1;
    query = query.range(start, end);

    // Exécuter la requête
    const { data, count, error } = await query;

    if (error) {
      console.error('Erreur Supabase:', error);
      return { data: null, count: 0, error };
    }

    return { data, count, error: null };
  } catch (error) {
    console.error('Erreur loadProStats:', error);
    return { data: null, count: 0, error };
  }
}

/**
 * Récupère les valeurs uniques pour les filtres
 * @param {string} column - Colonne à requêter
 * @param {string} season - Saison (optionnel)
 * @returns {Promise<Array<string>>}
 */
export async function getUniqueValues(column, season = null) {
  if (!supabase) {
    return [];
  }

  try {
    let query = supabase
      .from('pro_stats')
      .select(column);

    if (season && season !== 'all') {
      query = query.eq('season', season);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur getUniqueValues:', error);
      return [];
    }

    // Extraire les valeurs uniques
    const uniqueValues = [...new Set(data.map(row => row[column]).filter(Boolean))];
    return uniqueValues.sort();
  } catch (error) {
    console.error('Erreur getUniqueValues:', error);
    return [];
  }
}

/**
 * Récupère les statistiques agrégées
 * @param {Object} options - Options
 * @returns {Promise<Object>}
 */
export async function getAggregatedStats(options = {}) {
  if (!supabase) {
    return null;
  }

  const { season = 'S16', groupBy = 'champion' } = options;

  try {
    // Pour l'instant, on retourne juste un placeholder
    // Tu peux créer des vues SQL dans Supabase pour les stats agrégées
    return {
      message: 'Agrégation non implémentée - À venir',
    };
  } catch (error) {
    console.error('Erreur getAggregatedStats:', error);
    return null;
  }
}

/**
 * Vérifie si les données existent pour une saison
 * @param {string} season - Saison à vérifier
 * @returns {Promise<boolean>}
 */
export async function hasSeasonData(season) {
  if (!supabase) {
    return false;
  }

  try {
    const { count, error } = await supabase
      .from('pro_stats')
      .select('id', { count: 'exact', head: true })
      .eq('season', season)
      .limit(1);

    if (error) {
      console.error('Erreur hasSeasonData:', error);
      return false;
    }

    return count > 0;
  } catch (error) {
    console.error('Erreur hasSeasonData:', error);
    return false;
  }
}

export { ITEMS_PER_PAGE };
