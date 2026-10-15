// Platos típicos para "comer fuera": macros estimados de raciones habituales en España.
// Son aproximaciones (varían mucho según el sitio); sirven para no perder el control del día.
// tam: multiplicador según la elección (pequeño / normal / grande)

export const TAMANOS = { pequeno: { nombre: 'Pequeño', k: 0.75 }, normal: { nombre: 'Normal', k: 1 }, grande: { nombre: 'Grande', k: 1.3 } };

export const FUERA = [
  { id: 'menu-dia', grupo: 'Restaurante', emoji: '🍽️', nombre: 'Menú del día (primero + segundo + pan)', kcal: 1150, p: 50, c: 120, g: 48 },
  { id: 'menu-dia-postre', grupo: 'Restaurante', emoji: '🍮', nombre: 'Postre del menú', kcal: 280, p: 6, c: 38, g: 11 },
  { id: 'paella', grupo: 'Restaurante', emoji: '🥘', nombre: 'Ración de paella', kcal: 620, p: 30, c: 80, g: 18 },
  { id: 'ensalada-cesar', grupo: 'Restaurante', emoji: '🥗', nombre: 'Ensalada César', kcal: 520, p: 30, c: 22, g: 34 },
  { id: 'entrecot-patatas', grupo: 'Restaurante', emoji: '🥩', nombre: 'Entrecot con patatas fritas', kcal: 950, p: 55, c: 55, g: 55 },
  { id: 'pescado-plancha', grupo: 'Restaurante', emoji: '🐟', nombre: 'Pescado a la plancha con guarnición', kcal: 480, p: 40, c: 30, g: 20 },
  { id: 'hamburguesa', grupo: 'Comida rápida', emoji: '🍔', nombre: 'Hamburguesa con patatas', kcal: 1050, p: 40, c: 100, g: 52 },
  { id: 'hamburguesa-sola', grupo: 'Comida rápida', emoji: '🍔', nombre: 'Hamburguesa sola', kcal: 550, p: 30, c: 42, g: 28 },
  { id: 'pizza-media', grupo: 'Comida rápida', emoji: '🍕', nombre: 'Media pizza mediana', kcal: 780, p: 32, c: 88, g: 32 },
  { id: 'pizza-entera', grupo: 'Comida rápida', emoji: '🍕', nombre: 'Pizza mediana entera', kcal: 1550, p: 64, c: 176, g: 64 },
  { id: 'kebab', grupo: 'Comida rápida', emoji: '🥙', nombre: 'Kebab / durum', kcal: 850, p: 42, c: 80, g: 38 },
  { id: 'sushi-12', grupo: 'Comida rápida', emoji: '🍣', nombre: 'Sushi (12 piezas)', kcal: 560, p: 24, c: 92, g: 10 },
  { id: 'poke', grupo: 'Comida rápida', emoji: '🥗', nombre: 'Poke bowl', kcal: 650, p: 32, c: 75, g: 22 },
  { id: 'burrito', grupo: 'Comida rápida', emoji: '🌯', nombre: 'Burrito', kcal: 900, p: 40, c: 100, g: 34 },
  { id: 'bocadillo-jamon', grupo: 'Bar', emoji: '🥖', nombre: 'Bocadillo de jamón', kcal: 520, p: 30, c: 62, g: 16 },
  { id: 'bocadillo-tortilla', grupo: 'Bar', emoji: '🥖', nombre: 'Bocadillo de tortilla', kcal: 620, p: 20, c: 70, g: 28 },
  { id: 'bocadillo-lomo', grupo: 'Bar', emoji: '🥖', nombre: 'Bocadillo de lomo con queso', kcal: 680, p: 38, c: 62, g: 30 },
  { id: 'pincho-tortilla', grupo: 'Bar', emoji: '🍳', nombre: 'Pincho de tortilla', kcal: 260, p: 9, c: 18, g: 17 },
  { id: 'bravas', grupo: 'Bar', emoji: '🍟', nombre: 'Ración de bravas', kcal: 520, p: 6, c: 55, g: 30 },
  { id: 'croquetas', grupo: 'Bar', emoji: '🧆', nombre: 'Croquetas (6)', kcal: 480, p: 14, c: 40, g: 29 },
  { id: 'calamares', grupo: 'Bar', emoji: '🦑', nombre: 'Ración de calamares', kcal: 450, p: 25, c: 30, g: 25 },
  { id: 'cana', grupo: 'Bebidas', emoji: '🍺', nombre: 'Caña de cerveza', kcal: 100, p: 1, c: 8, g: 0 },
  { id: 'tercio', grupo: 'Bebidas', emoji: '🍺', nombre: 'Tercio de cerveza', kcal: 140, p: 1, c: 11, g: 0 },
  { id: 'vino', grupo: 'Bebidas', emoji: '🍷', nombre: 'Copa de vino', kcal: 120, p: 0, c: 4, g: 0 },
  { id: 'cubata', grupo: 'Bebidas', emoji: '🍹', nombre: 'Copa (combinado con refresco)', kcal: 230, p: 0, c: 26, g: 0 },
  { id: 'refresco', grupo: 'Bebidas', emoji: '🥤', nombre: 'Refresco azucarado (lata)', kcal: 140, p: 0, c: 35, g: 0 },
  { id: 'cafe-leche', grupo: 'Bebidas', emoji: '☕', nombre: 'Café con leche', kcal: 70, p: 4, c: 6, g: 3 },
  { id: 'croissant', grupo: 'Dulces', emoji: '🥐', nombre: 'Croissant / napolitana', kcal: 330, p: 6, c: 36, g: 18 },
  { id: 'helado', grupo: 'Dulces', emoji: '🍦', nombre: 'Helado (2 bolas)', kcal: 290, p: 5, c: 34, g: 15 },
  { id: 'tarta', grupo: 'Dulces', emoji: '🍰', nombre: 'Porción de tarta', kcal: 420, p: 6, c: 48, g: 22 },
  { id: 'chocolate', grupo: 'Dulces', emoji: '🍫', nombre: 'Chocolatina / snack dulce', kcal: 240, p: 3, c: 28, g: 13 },
];
