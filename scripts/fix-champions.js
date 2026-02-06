// Script pour corriger champions.json
// - Fixer les chemins d'images
// - Ajouter les rôles pour chaque champion

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mapping des rôles par champion (basé sur meta S16)
const championRoles = {
  'aatrox': ['Top'],
  'ahri': ['Mid'],
  'akali': ['Mid', 'Top'],
  'akshan': ['Mid', 'ADC'],
  'alistar': ['Support'],
  'ambessa': ['Top'],
  'amumu': ['Jungle', 'Support'],
  'anivia': ['Mid'],
  'annie': ['Mid', 'Support'],
  'aphelios': ['ADC'],
  'ashe': ['ADC', 'Support'],
  'aurelion-sol': ['Mid'],
  'aurora': ['Mid'],
  'azir': ['Mid'],
  'bard': ['Support'],
  'belveth': ['Jungle'],
  'blitzcrank': ['Support'],
  'brand': ['Support', 'Mid'],
  'braum': ['Support'],
  'briar': ['Jungle'],
  'caitlyn': ['ADC'],
  'camille': ['Top', 'Jungle'],
  'cassiopeia': ['Mid'],
  'cho-gath': ['Top', 'Jungle'],
  'corki': ['Mid', 'ADC'],
  'darius': ['Top'],
  'diana': ['Jungle', 'Mid'],
  'dr-mundo': ['Top', 'Jungle'],
  'draven': ['ADC'],
  'ekko': ['Jungle', 'Mid'],
  'elise': ['Jungle'],
  'evelynn': ['Jungle'],
  'ezreal': ['ADC'],
  'fiddlesticks': ['Jungle', 'Support'],
  'fiora': ['Top'],
  'fizz': ['Mid'],
  'galio': ['Mid', 'Support'],
  'gangplank': ['Top'],
  'garen': ['Top'],
  'gnar': ['Top'],
  'gragas': ['Jungle', 'Top'],
  'graves': ['Jungle'],
  'gwen': ['Top'],
  'hecarim': ['Jungle'],
  'heimerdinger': ['Mid', 'Support'],
  'hwei': ['Mid', 'Support'],
  'illaoi': ['Top'],
  'irelia': ['Top', 'Mid'],
  'ivern': ['Jungle'],
  'janna': ['Support'],
  'jarvan-iv': ['Jungle'],
  'jax': ['Top', 'Jungle'],
  'jayce': ['Top', 'Mid'],
  'jhin': ['ADC'],
  'jinx': ['ADC'],
  'ksante': ['Top'],
  'kaisa': ['ADC'],
  'kalista': ['ADC'],
  'karma': ['Support', 'Mid'],
  'karthus': ['Jungle', 'Mid'],
  'kassadin': ['Mid'],
  'katarina': ['Mid'],
  'kayle': ['Top', 'Mid'],
  'kayn': ['Jungle'],
  'kennen': ['Top'],
  'kha-zix': ['Jungle'],
  'kindred': ['Jungle'],
  'kled': ['Top'],
  'kog-maw': ['ADC'],
  'leblanc': ['Mid'],
  'lee-sin': ['Jungle'],
  'leona': ['Support'],
  'lillia': ['Jungle'],
  'lissandra': ['Mid'],
  'lucian': ['ADC'],
  'lulu': ['Support'],
  'lux': ['Mid', 'Support'],
  'malphite': ['Top', 'Support'],
  'malzahar': ['Mid'],
  'maokai': ['Top', 'Support'],
  'master-yi': ['Jungle'],
  'mel': ['Support'],
  'milio': ['Support'],
  'miss-fortune': ['ADC'],
  'monkey-king': ['Top', 'Jungle'],
  'mordekaiser': ['Top'],
  'morgana': ['Support', 'Mid'],
  'naafiri': ['Mid'],
  'nami': ['Support'],
  'nasus': ['Top'],
  'nautilus': ['Support', 'Top'],
  'neeko': ['Mid', 'Support'],
  'nidalee': ['Jungle'],
  'nilah': ['ADC'],
  'nocturne': ['Jungle'],
  'nunu': ['Jungle'],
  'olaf': ['Jungle', 'Top'],
  'orianna': ['Mid'],
  'ornn': ['Top'],
  'pantheon': ['Top', 'Support', 'Mid'],
  'poppy': ['Jungle', 'Support', 'Top'],
  'pyke': ['Support'],
  'qiyana': ['Mid', 'Jungle'],
  'quinn': ['Top'],
  'rakan': ['Support'],
  'rammus': ['Jungle'],
  'rek-sai': ['Jungle'],
  'rell': ['Support'],
  'renata': ['Support'],
  'renekton': ['Top'],
  'rengar': ['Jungle', 'Top'],
  'riven': ['Top'],
  'rumble': ['Top', 'Mid'],
  'ryze': ['Mid', 'Top'],
  'samira': ['ADC'],
  'sejuani': ['Jungle'],
  'senna': ['Support', 'ADC'],
  'seraphine': ['Support', 'Mid'],
  'sett': ['Top', 'Support'],
  'shaco': ['Jungle', 'Support'],
  'shen': ['Top', 'Support'],
  'shyvana': ['Jungle'],
  'singed': ['Top'],
  'sion': ['Top', 'Support'],
  'sivir': ['ADC'],
  'skarner': ['Jungle'],
  'smolder': ['ADC'],
  'sona': ['Support'],
  'soraka': ['Support'],
  'swain': ['Support', 'Mid', 'Top'],
  'sylas': ['Mid', 'Jungle'],
  'syndra': ['Mid'],
  'tahm-kench': ['Top', 'Support'],
  'taliyah': ['Jungle', 'Mid'],
  'talon': ['Mid', 'Jungle'],
  'taric': ['Support'],
  'teemo': ['Top'],
  'thresh': ['Support'],
  'tristana': ['ADC'],
  'trundle': ['Top', 'Jungle'],
  'tryndamere': ['Top'],
  'twisted-fate': ['Mid'],
  'twitch': ['ADC', 'Jungle'],
  'udyr': ['Jungle', 'Top'],
  'urgot': ['Top'],
  'varus': ['ADC'],
  'vayne': ['ADC', 'Top'],
  'veigar': ['Mid'],
  'vel-koz': ['Mid', 'Support'],
  'vex': ['Mid'],
  'vi': ['Jungle'],
  'viego': ['Jungle'],
  'viktor': ['Mid'],
  'vladimir': ['Mid', 'Top'],
  'volibear': ['Jungle', 'Top'],
  'warwick': ['Jungle'],
  'xayah': ['ADC'],
  'xerath': ['Mid', 'Support'],
  'xin-zhao': ['Jungle'],
  'yasuo': ['Mid', 'Top'],
  'yone': ['Mid', 'Top'],
  'yorick': ['Top'],
  'yunara': ['Support'], // Nouveau champion
  'yuumi': ['Support'],
  'zac': ['Jungle'],
  'zed': ['Mid'],
  'zeri': ['ADC'],
  'ziggs': ['Mid', 'ADC'],
  'zilean': ['Support', 'Mid'],
  'zoe': ['Mid'],
  'zyra': ['Support'],
};

// Lire le fichier champions.json
const championsPath = path.join(__dirname, '../public/resources/champions/champions.json');
const championsData = JSON.parse(fs.readFileSync(championsPath, 'utf-8'));

console.log(`📖 Lecture de ${championsData.length} champions...`);

// Corriger chaque champion
const fixedChampions = championsData.map(champ => {
  // Extraire le nom du fichier depuis l'ancien chemin
  const filename = champ.imagePath.split('/').pop();
  
  // Nouveau chemin
  const newImagePath = `/resources/bigchampions/${filename}`;
  
  // Récupérer les rôles
  const roles = championRoles[champ.id] || ['Mid']; // Mid par défaut si non trouvé
  
  return {
    id: champ.id,
    name: champ.name,
    image: newImagePath, // Renommé de imagePath à image pour cohérence
    roles: roles
  };
});

console.log('✅ Champions corrigés !');
console.log(`   - Chemins d'images : /resources/bigchampions/`);
console.log(`   - Rôles ajoutés : ${fixedChampions.filter(c => c.roles).length}/${fixedChampions.length}`);

// Sauvegarder le fichier corrigé
fs.writeFileSync(championsPath, JSON.stringify(fixedChampions, null, 2));

console.log('\n🎉 Fichier champions.json mis à jour avec succès !');
console.log(`   📁 ${championsPath}`);
