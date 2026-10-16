import type { LetterData } from '../types';

export type WordCategory = LetterData['category'];

export interface PoolWord {
  word: string;
  emoji: string;
  category: WordCategory;
}

const A: WordCategory = 'Animale';
const O: WordCategory = 'Oggetto';
const N: WordCategory = 'Natura';
const C: WordCategory = 'Cibo';
const w = (word: string, emoji: string, category: WordCategory): PoolWord => ({ word, emoji, category });

/**
 * Words available for each letter. The first entry is the letter's signature word (the one the
 * fun fact in `alphabet.ts` talks about); the app rotates through the pool, one word per day.
 */
export const WORD_POOLS: Record<string, PoolWord[]> = {
A: [w('Ape', '🐝', A),  w('Albero', '🌳', N), w('Arcobaleno', '🌈', N), w('Aereo', '✈️', O), w('Anatra', '🦆', A), w('Arancia', '🍊', C),  w('Aquila', '🦅', A), w('Agnello', '🐑', A), w('Asino', '🫏', A), w('Anguria', '🍉', C), w('Ananas', '🍍', C), w('Aglio', '🧄', C), w('Autobus', '🚌', O), w('Auto', '🚗', O), w('Ancora', '⚓', O), w('Astronauta', '👨‍🚀', O)],
E: [ w('Elefante', '🐘', A), w('Elicottero', '🚁', O), w('Erba', '🌱', N), w('Elfo', '🧝', O), w('Edera', '🌿', N), w('Elastico', '🪢', O), w('Escavatore', '🚜', O)],
I: [ w('Istrice', '🦔', A), w('Isola', '🏝️', N), w('Ippopotamo', '🦛', A), w('Imbuto', '🫗', O), w('Igloo', '🧊', O), w('Insetto', '🐛', A), w('Iguana', '🦎', A), w('Infermiera', '👩‍⚕️', O), w('Incendio', '🔥', N), w('Imperatore', '👑', O), w('Inverno', '☃️', N), w('Inchiostro', '🖋️', O)],
O: [ w('Orso', '🐻', A), w('Orologio', '⏰', O), w('Occhiali', '👓', O), w('Oca', '🪿', A), w('Ombrello', '☂️', O), w('Ostrica', '🦪', A), w('Oliva', '🫒', C), w('Olio', '🫒', C), w('Orata', '🐟', A), w('Orchidea', '🌸', N), w('Onda', '🌊', N), w('Orecchio', '👂', O), w('Occhio', '👁️', O), w('Osso', '🦴', O), w('Ospedale', '🏥', O), w('Orto', '🥬', N)],
U: [ w('Uva', '🍇', C), w('Uccellino', '🐦', A), w('Unicorno', '🦄', O), w('Uovo', '🥚', C), w('Ufo', '🛸', O), w('Usignolo', '🐦', A), w('Upupa', '🐦', A), w('Uomo', '👨', O), w('Unghia', '💅', O)],
B: [ w('Barca', '⛵', O), w('Bambola', '🪆', O), w('Balena', '🐋', A), w('Biscotto', '🍪', C), w('Banana', '🍌', C), w('Bicicletta', '🚲', O), w('Bruco', '🐛', A), w('Bue', '🐂', A), w('Bufalo', '🐃', A), w('Borsa', '👜', O), w('Bottiglia', '🍾', O), w('Bicchiere', '🥛', O), w('Bacio', '💋', O), w('Biberon', '🍼', O), w('Broccoli', '🥦', C), w('Baguette', '🥖', C)],
C: [ w('Cane', '🐶', A), w('Casa', '🏠', O), w('Cuore', '❤️', O), w('Carota', '🥕', C), w('Cavallo', '🐴', A), w('Ciliegia', '🍒', C), w('Coniglio', '🐰', A), w('Coccinella', '🐞', A), w('Canguro', '🦘', A), w('Camaleonte', '🦎', A), w('Castello', '🏰', O), w('Cappello', '🎩', O), w('Campana', '🔔', O), w('Cioccolato', '🍫', C), w('Cocco', '🥥', C) ],
D: [ w('Delfino', '🐬', A), w('Dado', '🎲', O), w('Dinosauro', '🦖', A), w('Dente', '🦷', O), w('Diamante', '💎', O), w('Drago', '🐉', A), w('Dromedario', '🐪', A), w('Donnola', '🦦', A), w('Donna', '👩', O), w('Dottore', '👨‍⚕️', O), w('Doccia', '🚿', O), w('Divano', '🛋️', O), w('Disco', '💿', O), w('Dolce', '🍰', C), w('Deserto', '🏜️', N)],
F: [ w('Farfalla', '🦋', A), w('Fiore', '🌸', N), w('Fragola', '🍓', C), w('Formica', '🐜', A), w('Fungo', '🍄', N), w('Fuoco', '🔥', N), w('Foca', '🦭', A), w('Falco', '🦅', A), w('Fagiano', '🐦', A), w('Fico', '🍈', C), w('Fagiolo', '🫘', C), w('Formaggio', '🧀', C), w('Forchetta', '🍴', O), w('Fotocamera', '📷', O), w('Fulmine', '⚡', N)],
G: [ w('Gatto', '🐱', A), w('Gelato', '🍦', C), w('Giraffa', '🦒', A), w('Girasole', '🌻', N), w('Gufo', '🦉', A), w('Giostra', '🎠', O), w('Gorilla', '🦍', A), w('Ghepardo', '🐆', A), w('Granchio', '🦀', A), w('Gallo', '🐓', A), w('Gallina', '🐔', A), w('Gomma', '🛞', O), w('Guanto', '🧤', O), w('Gonna', '👗', O), w('Ghiaccio', '🧊', N), w('Goccia', '💧', N)],
M: [ w('Mela', '🍎', C), w('Mamma', '👩', O), w('Musica', '🎵', O), w('Miele', '🍯', C), w('Mare', '🌊', N), w('Mucca', '🐮', A), w('Maiale', '🐷', A), w('Medusa', '🪼', A), w('Mosca', '🪰', A), w('Montagna', '⛰️', N), w('Margherita', '🌼', N), w('Matita', '✏️', O), w('Martello', '🔨', O), w('Macchina', '🚙', O), w('Muffin', '🧁', C), w('Melone', '🍈', C)],
P: [ w('Pinguino', '🐧', A), w('Papà', '👨', O), w('Palla', '⚽', O), w('Pizza', '🍕', C), w('Pesce', '🐟', A), w('Pera', '🍐', C), w('Panda', '🐼', A), w('Pappagallo', '🦜', A), w('Pecora', '🐑', A), w('Polpo', '🐙', A), w('Pulcino', '🐥', A), w('Pomodoro', '🍅', C), w('Pane', '🍞', C), w('Patata', '🥔', C), w('Pianoforte', '🎹', O), w('Palloncino', '🎈', O)],
T: [ w('Tartaruga', '🐢', A), w('Treno', '🚂', O), w('Tigre', '🐯', A), w('Torta', '🎂', C), w('Telefono', '📞', O), w('Tulipano', '🌷', N), w('Topo', '🐭', A), w('Toro', '🐂', A), w('Tacchino', '🦃', A), w('Tonno', '🐟', A), w('Talpa', '🦫', A), w('Tamburo', '🥁', O), w('Tavolo', '🪑', O), w('Televisore', '📺', O), w('Taxi', '🚕', O), w('Toast', '🍞', C)],
L: [ w('Leone', '🦁', A), w('Luna', '🌙', N), w('Libro', '📚', O), w('Limone', '🍋', C), w('Lupo', '🐺', A), w('Lampada', '💡', O), w('Lumaca', '🐌', A), w('Lucertola', '🦎', A), w('Leopardo', '🐆', A), w('Lontra', '🦦', A), w('Lama', '🦙', A), w('Latte', '🥛', C), w('Lattuga', '🥬', C), w('Lampone', '🍓', C), w('Lucchetto', '🔒', O), w('Letto', '🛏️', O)],
N: [ w('Nuvola', '☁️', N), w('Nido', '🪺', A), w('Notte', '🌃', N), w('Nave', '🚢', O), w('Naso', '👃', O), w('Neve', '❄️', N), w('Narvalo', '🐋', A), w('Nutria', '🦫', A), w('Nibbio', '🦅', A), w('Nettarina', '🍑', C), w('Noce', '🌰', C), w('Nocciola', '🌰', C), w('Nastro', '🎀', O), w('Numero', '🔢', O), w('Ninfea', '🪷', N), w('Nebbia', '🌫️', N)],
R: [ w('Rana', '🐸', A), w('Rosa', '🌹', N), w('Robot', '🤖', O), w('Regina', '👸', O), w('Ragno', '🕷️', A), w('Razzo', '🚀', O), w('Riccio', '🦔', A), w('Renna', '🦌', A), w('Rondine', '🐦', A), w('Ravanello', '🥕', C), w('Riso', '🍚', C), w('Ruota', '🛞', O), w('Radio', '📻', O), w('Righello', '📏', O), w('Ruscello', '🏞️', N)],
S: [ w('Sole', '☀️', N), w('Stella', '⭐', N), w('Serpente', '🐍', A), w('Sirena', '🧜‍♀️', O), w('Scarpa', '👟', O), w('Scimmia', '🐒', A), w('Scoiattolo', '🐿️', A), w('Squalo', '🦈', A), w('Salamandra', '🦎', A), w('Struzzo', '🦤', A), w('Salmone', '🐟', A), w('Sandwich', '🥪', C), w('Spaghetti', '🍝', C), w('Spazzolino', '🪥', O), w('Semaforo', '🚦', O), w('Sedia', '🪑', O)],
V: [ w('Volpe', '🦊', A), w('Vento', '🌬️', N), w('Violino', '🎻', O), w('Vaso', '🏺', O), w('Vulcano', '🌋', N), w('Verdura', '🥦', C), w('Vipera', '🐍', A), w('Verme', '🪱', A), w('Vitello', '🐄', A), w('Vongola', '🦪', A), w('Vespa', '🐝', A), w('Viola', '🌺', N), w('Valigia', '🧳', O), w('Vestito', '👗', O), w('Ventaglio', '🪭', O)],
Z: [ w('Zebra', '🦓', A), w('Zaino', '🎒', O), w('Zucchina', '🥒', C), w('Zuppa', '🍲', C), w('Zucchero', '🍬', C), w('Zanzara', '🦟', A), w('Zampa', '🐾', O), w('Zucca', '🎃', C), w('Zenzero', '🫚', C), w('Zattera', '🛶', O), w('Zoccolo', '👞', O), w('Zampogna', '🎶', O), w('Zappetta', '🪏', O), w('Zircone', '💎', O), w('Zolla', '🌱', N)],
H: [ w('Hotel', '🏨', O), w('Hamburger', '🍔', C), w('Hockey', '🏒', O), w('Hawaii', '🌺', N), w('Hamster', '🐹', A), w('Husky', '🐕', A), w('Hippo', '🦛', A), w('Hotdog', '🌭', C), w('Halloween', '🎃', O), w('Hula', '💃', O), w('Hummus', '🫘', C)],
Q: [ w('Quercia', '🌳', N), w('Quaderno', '📓', O), w('Quadro', '🖼️', O), w('Quattro', '4️⃣', O), w('Quaglia', '🐦', A), w('Quadrato', '🟩', O), w('Quindici', '1️⃣5️⃣', O), w('Quinto', '5️⃣', O), w('Quiche', '🥧', C)],
J: [ w('Jeans', '👖', O), w('Jolly', '🃏', O), w('Judo', '🥋', O), w('Jazz', '🎷', O), w('Jukebox', '🎶', O), w('Jaguar', '🐆', A), w('Joystick', '🕹️', O), w('Jeep', '🚙', O), w('Jet', '🛩️', O)],
K: [ w('Koala', '🐨', A), w('Kiwi', '🥝', C), w('Kayak', '🛶', O), w('Karate', '🥋', O), w('Kimono', '👘', O), w('Kebab', '🥙', C), w('Ketchup', '🍅', C), w('Kaki', '🍊', C), w('Krapfen', '🍩', C), w('Kilt', '👗', O), w('Kart', '🏎️', O), w('Karaoke', '🎤', O)],
W: [ w('Waffle', '🧇', C), w('Windsurf', '🏄', O), w('Waterpolo', '🤽', O), w('Wafer', '🍫', C), w('Web', '🌐', O), w('Wombat', '🦫', A), w('Wok', '🥘', O)],
X: [ w('Xilofono', '🎶', O), w('Xenon', '💡', O), w('Xilofonino', '🎵', O), w('Xerus', '🐿️', A), w('Xenopo', '🐸', A)],
Y: [ w('Yogurt', '🥣', C), w('Yoyo', '🪀', O), w('Yoga', '🧘', O), w('Yacht', '🛥️', O), w('Yak', '🐂', A)]
};
