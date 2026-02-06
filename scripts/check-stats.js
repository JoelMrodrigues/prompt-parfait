/**
 * Script pour vérifier les stats en base
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStats() {
  console.log('🔍 Vérification des stats...\n');

  // Compter le total de lignes
  const { count: totalRows, error: errorTotal } = await supabase
    .from('pro_stats')
    .select('*', { count: 'exact', head: true });

  if (errorTotal) {
    console.error('❌ Erreur:', errorTotal);
    return;
  }

  console.log(`📊 Total de lignes: ${totalRows}`);

  // Compter par saison
  const { data: seasonData, error: errorSeason } = await supabase
    .from('pro_stats')
    .select('season');

  if (errorSeason) {
    console.error('❌ Erreur:', errorSeason);
    return;
  }

  const seasonsCount = {};
  const uniqueGames = new Set();

  seasonData.forEach(row => {
    seasonsCount[row.season] = (seasonsCount[row.season] || 0) + 1;
    if (row.gameid) uniqueGames.add(row.gameid);
  });

  console.log('\n📋 Par saison:');
  Object.entries(seasonsCount).sort().forEach(([season, count]) => {
    console.log(`   ${season}: ${count} lignes`);
  });

  // Compter les games S16
  const { data: s16Data, error: errorS16 } = await supabase
    .from('pro_stats')
    .select('gameid')
    .eq('season', 'S16');

  if (!errorS16) {
    const s16Games = new Set(s16Data.map(r => r.gameid).filter(Boolean));
    console.log(`\n🎮 Games S16: ${s16Games.size} games uniques`);
    console.log(`   (${s16Data.length} lignes / 10 = ${s16Data.length / 10} games théoriques)`);
  }

  // Vérifier Orianna
  const { count: oriannaCount } = await supabase
    .from('pro_stats')
    .select('*', { count: 'exact', head: true })
    .eq('season', 'S16')
    .eq('champion', 'Orianna');

  console.log(`\n👸 Orianna S16: ${oriannaCount} picks`);
}

checkStats();
