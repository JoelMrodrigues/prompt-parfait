import { getBackendUrl } from '../../../lib/constants'
import type { CanvasData } from './types'

export const CANVAS_SIZE = 560 // résolution interne des coordonnées (invariable)
export const TOKEN_RADIUS = 18
export const WARD_RADIUS = 8

// Minimap : fichier local en priorité, proxy backend en fallback
// → Pour activer : place l'image à public/resources/images/minimap.png
export const MAP_LOCAL = '/resources/images/minimap.png'
export const getMapUrl = () => `${getBackendUrl()}/api/riot/minimap`

export const ROLE_LABELS: Record<number, string> = {
  1: 'TOP',
  2: 'JGL',
  3: 'MID',
  4: 'BOT',
  5: 'SUP',
}

export const DRAW_COLORS = [
  { label: 'Blanc',   value: '#ffffff' },
  { label: 'Jaune',  value: '#facc15' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Vert',   value: '#22c55e' },
  { label: 'Cyan',   value: '#06b6d4' },
  { label: 'Rouge',  value: '#ef4444' },
]

// Champions disponibles (noms normalisés → getChampionImage)
export const CHAMPION_LIST = [
  'Aatrox','Ahri','Akali','Akshan','Alistar','Ambessa','Amumu','Anivia','Annie','Aphelios',
  'Ashe','AurelionSol','Aurora','Azir','Bard','Belveth','Blitzcrank','Brand','Braum','Briar',
  'Caitlyn','Camille','Cassiopeia','Chogath','Corki','Darius','Diana','Draven','DrMundo',
  'Ekko','Elise','Evelynn','Ezreal','Fiddlesticks','Fiora','Fizz','Galio','Gangplank','Garen',
  'Gnar','Gragas','Graves','Gwen','Hecarim','Heimerdinger','Hwei','Illaoi','Irelia','Ivern',
  'Janna','JarvanIV','Jax','Jayce','Jhin','Jinx','Kaisa','Kalista','Karma','Karthus',
  'Kassadin','Katarina','Kayle','Kayn','Kennen','Khazix','Kindred','Kled','Kogmaw','Ksante',
  'Leblanc','LeeSin','Leona','Lillia','Lissandra','Lucian','Lulu','Lux','Malphite','Malzahar',
  'Maokai','MasterYi','Mel','Milio','MissFortune','Mordekaiser','Morgana','Naafiri','Nami',
  'Nasus','Nautilus','Neeko','Nidalee','Nilah','Nocturne','Nunu','Olaf','Orianna','Ornn',
  'Pantheon','Poppy','Pyke','Qiyana','Quinn','Rakan','Rammus','Reksai','Rell','Renata',
  'Renekton','Rengar','Riven','Rumble','Ryze','Samira','Sejuani','Senna','Seraphine','Sett',
  'Shaco','Shen','Shyvana','Singed','Sion','Sivir','Skarner','Smolder','Sona','Soraka',
  'Swain','Sylas','Syndra','TahmKench','Taliyah','Talon','Taric','Teemo','Thresh','Tristana',
  'Trundle','Tryndamere','TwistedFate','Twitch','Udyr','Urgot','Varus','Vayne','Veigar',
  'Velkoz','Vex','Vi','Viego','Viktor','Vladimir','Volibear','Warwick','Wukong','Xayah',
  'Xerath','XinZhao','Yasuo','Yone','Yorick','Yunara','Yuumi','Zaahen','Zac','Zed','Zeri',
  'Ziggs','Zilean','Zoe','Zyra',
]

export const DEFAULT_CANVAS_DATA: CanvasData = {
  tokens: [
    { id: 'blue-1', team: 'blue', number: 1, x: 90,  y: 440 },
    { id: 'blue-2', team: 'blue', number: 2, x: 65,  y: 350 },
    { id: 'blue-3', team: 'blue', number: 3, x: 195, y: 310 },
    { id: 'blue-4', team: 'blue', number: 4, x: 150, y: 470 },
    { id: 'blue-5', team: 'blue', number: 5, x: 115, y: 490 },
    { id: 'red-1',  team: 'red',  number: 1, x: 470, y: 120 },
    { id: 'red-2',  team: 'red',  number: 2, x: 495, y: 210 },
    { id: 'red-3',  team: 'red',  number: 3, x: 365, y: 250 },
    { id: 'red-4',  team: 'red',  number: 4, x: 410, y: 90  },
    { id: 'red-5',  team: 'red',  number: 5, x: 445, y: 70  },
  ],
  wards: [],
  drawings: [],
}
