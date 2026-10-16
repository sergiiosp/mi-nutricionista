// Cocinado: cuánto pesa cada alimento una vez hecho y cómo hacerlo rápido con lo que tienes en casa.
// Los pesos de la app son siempre en crudo (legumbres y conservas, escurridas). `k` = peso cocinado / peso crudo
// (valores medios: dependen del tiempo y del aparato).

export const APARATOS = {
  microondas: { nombre: 'Microondas', icono: 'zap' },
  airfryer: { nombre: 'Air fryer', icono: 'wind' },
  plancha: { nombre: 'Plancha o sartén', icono: 'flame' },
  horno: { nombre: 'Horno', icono: 'thermometer-sun' },
  olla: { nombre: 'Olla (hervir)', icono: 'cooking-pot' },
};

// Factor crudo → cocinado
export const COCIDO = {
  arroz: { k: 2.6, como: 'hervido' }, arroz_integral: { k: 2.5, como: 'hervido' }, pasta: { k: 2.2, como: 'cocida' },
  pasta_larga: { k: 2.2, como: 'cocida' }, pasta_integral: { k: 2.2, como: 'cocida' }, cuscus: { k: 2.4, como: 'hidratado' },
  avena: { k: 3.2, como: 'en porridge con su líquido' }, patata: { k: 0.8, como: 'asada' }, batata: { k: 0.8, como: 'asada' },
  pollo_pechuga: { k: 0.75, como: 'a la plancha' }, pollo_contramuslo: { k: 0.7, como: 'asado' }, pavo_pechuga: { k: 0.75, como: 'a la plancha' },
  ternera_filete: { k: 0.7, como: 'a la plancha' }, picada_vacuno: { k: 0.72, como: 'salteada' }, picada_pollo: { k: 0.75, como: 'salteada' },
  cerdo_lomo: { k: 0.75, como: 'a la plancha' }, cerdo_solomillo: { k: 0.75, como: 'asado' }, salmon: { k: 0.8, como: 'hecho' },
  merluza: { k: 0.8, como: 'hecha' }, langostino: { k: 0.85, como: 'hecho' }, tofu: { k: 0.85, como: 'dorado' },
  brocoli: { k: 0.9, como: 'al vapor' }, judias_verdes: { k: 0.95, como: 'al vapor' }, calabacin: { k: 0.75, como: 'a la plancha' },
  champinones: { k: 0.6, como: 'salteados' }, espinacas: { k: 0.3, como: 'salteadas' }, berenjena: { k: 0.65, como: 'asada' },
  pimiento_rojo: { k: 0.75, como: 'asado' }, cebolla: { k: 0.7, como: 'pochada' }, zanahoria: { k: 0.9, como: 'al vapor' },
  esparragos: { k: 0.85, como: 'a la plancha' }, huevo: { k: 1, como: 'hecho' },
};

// Cómo hacerlo con cada aparato (el primero que tengas de tu lista es el que se muestra)
export const COMO = {
  avena: { microondas: 'Copos y bebida en un bol grande: 2 min al microondas, remueve y 30 s más. Sin ollas.', olla: '4-5 min a fuego medio removiendo.' },
  arroz: { microondas: 'Atajo: arroz para microondas o vasito de arroz cocido (2-3 min). Si es arroz seco, en olla.', olla: '12-15 min en agua hirviendo con sal.' },
  arroz_integral: { olla: '25-30 min en agua hirviendo (o hazlo en tanda para 3 días).' },
  pasta: { olla: 'En agua hirviendo con sal el tiempo del paquete (8-11 min).' },
  pasta_larga: { olla: 'En agua hirviendo con sal el tiempo del paquete (8-10 min).' },
  pasta_integral: { olla: 'En agua hirviendo con sal el tiempo del paquete (10-12 min).' },
  cuscus: { microondas: 'Mismo peso de agua, 2 min al microondas, tapa 5 min y suelta con un tenedor.', olla: 'Mismo peso de agua hirviendo, tapa 5 min.' },
  patata: { microondas: 'Pinchada o en dados en un recipiente tapado: 6-8 min. Luego 5 min en air fryer si la quieres crujiente.', airfryer: 'En dados con una cucharadita de aceite: 200 °C, 18-20 min, agitando a mitad.', horno: '200 °C, 35-40 min.' },
  batata: { microondas: 'Pinchada con un tenedor: 6-8 min.', airfryer: 'En dados: 200 °C, 16-18 min.', horno: '200 °C, 40 min.' },
  pollo_pechuga: { airfryer: '200 °C, 12-14 min, dándole la vuelta a mitad.', plancha: '4-5 min por lado a fuego medio-alto.', horno: '200 °C, 20 min.' },
  pollo_contramuslo: { airfryer: '200 °C, 16-18 min.', plancha: '6 min por lado.', horno: '200 °C, 25 min.' },
  pavo_pechuga: { airfryer: '200 °C, 10-12 min.', plancha: '3 min por lado.' },
  ternera_filete: { plancha: '1-2 min por lado, sartén muy caliente.', airfryer: '200 °C, 6-8 min.' },
  picada_vacuno: { plancha: 'Sartén a fuego fuerte 6-8 min, deshaciéndola.', microondas: 'En un bol, 4-5 min removiendo cada minuto.' },
  picada_pollo: { plancha: 'Sartén a fuego fuerte 6-7 min, deshaciéndola.', microondas: 'En un bol, 4 min removiendo cada minuto.' },
  cerdo_lomo: { plancha: '3 min por lado.', airfryer: '200 °C, 10 min.' },
  cerdo_solomillo: { airfryer: 'Entero: 190 °C, 18-20 min. En medallones: 10 min.', horno: '200 °C, 25 min.', plancha: 'En medallones, 3 min por lado.' },
  salmon: { airfryer: '190 °C, 9-10 min (sin darle la vuelta).', microondas: 'En papillote o recipiente tapado: 3-4 min.', plancha: '4 min por la piel y 2 por el otro lado.' },
  merluza: { microondas: 'En recipiente tapado con limón: 3-4 min.', airfryer: '190 °C, 10 min.', plancha: '3 min por lado.' },
  langostino: { plancha: '2 min a fuego fuerte.', airfryer: '200 °C, 6 min.', microondas: 'Tapados, 2 min.' },
  huevo: { microondas: 'Revueltos en taza: bate, 40 s, remueve y 30 s más. Duro: usa huevos cocidos ya hechos.', airfryer: 'Huevo duro: 150 °C, 14-15 min y a agua fría.', plancha: 'A la plancha o en tortilla, 2-3 min.' },
  claras: { microondas: 'Tortilla en taza o bol: 1 min, remueve y 30-40 s más.', plancha: 'Revueltas en sartén, 2-3 min.' },
  tofu: { airfryer: 'En dados: 200 °C, 12-15 min.', plancha: 'Dorado por todos los lados, 6-8 min.' },
  brocoli: { microondas: 'Bol tapado con 2 cucharadas de agua: 3-4 min.', airfryer: 'Con un poco de aceite: 190 °C, 8-10 min.' },
  judias_verdes: { microondas: 'Bol tapado con un poco de agua: 4-5 min.', plancha: 'Salteadas 5 min.' },
  calabacin: { plancha: 'En rodajas, 3 min por lado.', airfryer: '200 °C, 10 min.', microondas: 'Tapado, 3 min.' },
  champinones: { plancha: 'Salteados 5 min.', airfryer: '200 °C, 8 min.', microondas: 'Tapados, 3 min.' },
  espinacas: { microondas: 'Tapadas, 1-2 min.', plancha: 'Salteadas 1-2 min.' },
  berenjena: { airfryer: 'En dados o rodajas: 200 °C, 12-15 min.', microondas: 'Tapada, 5 min.', plancha: '4 min por lado.' },
  pimiento_rojo: { airfryer: 'En tiras: 200 °C, 10-12 min.', plancha: 'Salteado 6-8 min.', microondas: 'Tapado, 4 min.' },
  cebolla: { plancha: 'Pochada 8-10 min.', airfryer: 'En aros: 190 °C, 8 min.', microondas: 'Tapada, 3-4 min.' },
  zanahoria: { microondas: 'Tapada con un poco de agua: 4-5 min.', airfryer: 'En bastones: 200 °C, 12 min.' },
  esparragos: { plancha: '4-5 min.', airfryer: '200 °C, 7-8 min.' },
  wok_verduras: { microondas: 'Congeladas, tapadas: 5-6 min.', plancha: 'Salteadas 6-8 min.' },
  garbanzos: { microondas: 'Escurridos y enjuagados: 1-2 min, o tal cual en frío.', airfryer: 'Crujientes: 200 °C, 12-15 min.' },
  lentejas: { microondas: 'Escurridas: 1-2 min, o en frío en ensalada.' },
  alubias: { microondas: 'Escurridas: 1-2 min, o en frío en ensalada.' },
  alubias_pintas: { microondas: 'Escurridas: 1-2 min, o en frío en ensalada.' },
  quinoa_cocida: { microondas: '1 min.' },
  arroz_microondas: { microondas: 'Del congelador al microondas: 4-5 min removiendo a mitad.' },
  arroz_vasito: { microondas: 'Abre un poco la tapa: 1 min.' },
  patata_microondas: { microondas: 'En su bolsa: 6-8 min.' },
  edamame: { microondas: 'Tapado con un poco de agua: 3-4 min.' },
};

/** Cómo cocinar un alimento con los aparatos que tienes (por orden de preferencia). */
export function comoCocinar(id, aparatos = ['microondas', 'airfryer', 'plancha', 'horno', 'olla']) {
  const c = COMO[id];
  if (!c) return null;
  // La olla siempre vale como último recurso para lo que no se puede hacer de otra forma (pasta, arroz seco)
  for (const ap of [...aparatos, 'olla']) if (c[ap]) return { aparato: ap, texto: c[ap] };
  return null;
}

/** Equivalencia cruda/cocinada de una cantidad en crudo. */
export function equivalenciaCocido(id, gramos) {
  const c = COCIDO[id];
  if (!c || c.k === 1) return null;
  return { gramos: Math.round((gramos * c.k) / 5) * 5, como: c.como };
}
