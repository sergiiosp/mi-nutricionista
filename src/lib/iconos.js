// Iconos de línea (Lucide, ISC). Los datos de la app siguen usando emojis como clave
// (recetas, sesiones, suplementos…) y aquí se traducen al icono de línea equivalente.
import { TRAZOS } from '../data/iconos-linea.js';

export const EMOJI = {
  // Interfaz
  '🏠': 'house', '➕': 'plus', '📈': 'trending-up', '📉': 'trending-down', '📊': 'chart-column', '⚙️': 'settings', '🔄': 'refresh-cw',
  '✨': 'sparkles', '⏱️': 'timer', '🕐': 'clock', '⏭️': 'skip-forward', '🛒': 'shopping-cart', '💡': 'lightbulb', '🔀': 'shuffle',
  '📍': 'map-pin', '✏️': 'pencil', '📝': 'notebook-pen', '⚠️': 'triangle-alert', '📏': 'ruler', '🔁': 'repeat', '🔗': 'link',
  '📷': 'camera', '📸': 'camera', '⌨️': 'keyboard', '❌': 'circle-x', '✅': 'circle-check', '🧾': 'receipt', '📦': 'package',
  '🥡': 'package', '🗓️': 'calendar-days', '📅': 'calendar', '💻': 'laptop', '📱': 'smartphone', '💾': 'save', '🔔': 'bell',
  '🔕': 'bell-off', '🗑️': 'trash', '👤': 'user', '🎨': 'palette', '🌗': 'sun-moon', '🌓': 'sun-moon', '📜': 'scroll-text',
  '▫️': 'dot', '📋': 'clipboard-list', '📤': 'share', '🎲': 'dices', '📖': 'book-open', '🧠': 'brain', '🗺️': 'map',
  '🔒': 'lock', '🔍': 'search', '☁️': 'cloud', '🔋': 'battery-charging', '💶': 'euro', '🏗️': 'hammer', '🎉': 'party-popper',
  '🙌': 'thumbs-up', '👌': 'thumbs-up', '🙇': 'hand-helping', '🙅': 'ban', '👋': 'hand', '✋': 'hand', '✊': 'hand-fist',
  '🤲': 'hand-platter', '🤏': 'hand', '💥': 'flame', '🔥': 'flame', '⚡': 'zap', '🎯': 'target', '🏆': 'trophy', '🏅': 'medal',
  '🏁': 'flag', '⚖️': 'scale', '🌱': 'sprout', '🌿': 'leaf', '🛣️': 'route', '👨‍🍳': 'chef-hat', '🔪': 'utensils-crossed',
  '🍽️': 'utensils', '🥢': 'utensils', '🥄': 'utensils', '🧂': 'leaf',
  // Personas y estados
  '🧍': 'person-standing', '👨': 'user', '👩': 'user', '🫃': 'user', '🤰': 'baby', '😀': 'face-grinning', '🙂': 'face-slightly-smiling',
  '😊': 'face-slightly-smiling', '😌': 'face-slightly-smiling', '😐': 'face-neutral', '😅': 'face-neutral', '😫': 'face-slightly-frowning',
  '😰': 'face-slightly-frowning', '😵': 'face-expressionless', '😤': 'face-angry', '🥵': 'thermometer-sun', '💀': 'skull', '😴': 'bed',
  '🛋️': 'sofa', '☀️': 'sun', '🌙': 'moon', '🐢': 'turtle', '🐇': 'rabbit', '🚶': 'footprints',
  // Salud
  '🩺': 'stethoscope', '💊': 'pill', '💧': 'droplet', '🩸': 'droplet', '❤️': 'heart', '🤍': 'heart', '🫀': 'heart-pulse',
  '🫁': 'wind', '🦋': 'activity',
  // Entreno
  '🏋️': 'dumbbell', '💪': 'biceps-flexed', '🦾': 'biceps-flexed', '🧘': 'person-standing', '🏃': 'footprints', '🚴': 'bike',
  '🏊': 'waves-horizontal', '⚽': 'volleyball', '🧗': 'mountain', '🦵': 'footprints', '🍑': 'person-standing',
  '⛷️': 'mountain-snow', '🛷': 'move-horizontal', '🪢': 'cable', '🐸': 'rabbit', '🚣': 'waves-horizontal', '🧺': 'weight',
  '🎒': 'backpack', '🏐': 'volleyball',
  // Comida (solo como reserva: en comidas se usan fotos o puntos de color)
  '🥗': 'salad', '🍝': 'wheat', '🍮': 'dessert', '🥘': 'cooking-pot', '🍛': 'cooking-pot', '🍲': 'soup', '🥣': 'soup', '🍜': 'soup',
  '🥩': 'beef', '🍖': 'ham', '🥓': 'ham', '🍗': 'drumstick', '🦃': 'drumstick', '🐟': 'fish', '🐠': 'fish', '🍣': 'fish',
  '🦐': 'shrimp', '🍤': 'shrimp', '🦑': 'shrimp', '🍔': 'hamburger', '🌭': 'hamburger', '🍟': 'hamburger', '🍕': 'pizza',
  '🥙': 'sandwich', '🌯': 'sandwich', '🌮': 'sandwich', '🥪': 'sandwich', '🥖': 'wheat', '🍞': 'wheat', '🫓': 'wheat', '🍚': 'wheat',
  '🌾': 'wheat', '🌽': 'wheat', '🍳': 'egg-fried', '🥚': 'egg', '🥐': 'croissant', '🥞': 'cookie', '🍘': 'cookie', '🍫': 'cookie',
  '🍬': 'candy', '🍦': 'ice-cream-cone', '🍰': 'cake-slice', '🍺': 'beer', '🍷': 'wine', '🍹': 'martini', '🥤': 'cup-soda',
  '🧃': 'cup-soda', '☕': 'coffee', '🥛': 'milk', '🍶': 'milk', '🧀': 'triangle', '🍎': 'apple', '🍐': 'apple', '🍌': 'banana',
  '🍊': 'citrus', '🥝': 'citrus', '🍅': 'cherry', '🍓': 'cherry', '🫐': 'grape', '🫒': 'grape', '🥕': 'carrot', '🍠': 'carrot',
  '🥔': 'bean', '🫘': 'bean', '🫛': 'bean', '🥜': 'nut', '🌰': 'nut', '🥑': 'leaf', '🍄': 'leaf', '🥒': 'leafy-green',
  '🍆': 'leafy-green', '🥬': 'leafy-green', '🥦': 'leafy-green', '🫑': 'leafy-green', '🧅': 'circle', '🧄': 'circle',
  '🧆': 'circle-dot', '🍯': 'amphora', '🫙': 'amphora', '🍱': 'package', '🧊': 'snowflake',
};

/** Nombre del icono de línea para un emoji o un nombre de Lucide. */
export function nombreIcono(x) {
  if (!x) return 'circle-dot';
  if (TRAZOS[x]) return x;
  return EMOJI[x] || EMOJI[x.replace(/️/g, '')] || EMOJI[`${x}️`] || 'circle-dot';
}

const esc = (v) => String(v).replace(/"/g, '&quot;');

/** SVG como texto (para el HTML que genera el cuestionario). */
export function iconoSVG(x, tam = 22, grosor = 1.75) {
  const nodos = TRAZOS[nombreIcono(x)] || [];
  const hijos = nodos.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}/>`).join('');
  return `<svg class="icono" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${hijos}</svg>`;
}
