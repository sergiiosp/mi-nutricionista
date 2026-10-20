// Guía para comer fuera: qué pedir y qué evitar según el tipo de sitio, pensada para comer mucha
// proteína sin pasarte de kcal. `no`: se oculta si tienes esa alergia; `si`: aviso que solo ves si la tienes.

export const SITIOS = [
  {
    id: 'menu', nombre: 'Menú del día', icono: 'utensils',
    idea: 'Primero ligero, segundo de proteína a la plancha y fruta de postre.',
    pide: [
      { t: 'De primero: legumbre (lentejas, garbanzos), crema o sopa de verduras, o parrillada de verduras' },
      { t: 'De primero: ensalada mixta con atún o huevo', no: ['verdura_cruda'] },
      { t: 'De segundo: pollo, lomo, ternera o pescado a la plancha o al horno' },
      { t: 'Guarnición: patata cocida o asada, arroz blanco o verduras a la plancha' },
      { t: 'Postre: fruta, yogur o café' },
    ],
    evita: ['Fritos, rebozados y empanados', 'Salsas de queso, pimienta o nata', 'Las dos raciones de pan y el vino del menú si hoy vas justo'],
    truco: 'Pide cambiar las patatas fritas por patata cocida, arroz o verdura: casi siempre te lo hacen.',
  },
  {
    id: 'tapas', nombre: 'Bar de tapas', icono: 'beer',
    idea: 'Dos raciones de proteína para compartir y una de hidrato.',
    pide: [
      { t: 'Pulpo, sepia, gambas o calamar a la plancha' },
      { t: 'Jamón, cecina o lomo embuchado' },
      { t: 'Mejillones al vapor, boquerones en vinagre, berberechos' },
      { t: 'Un pincho de tortilla o pan con tomate como hidrato' },
      { t: 'Pimientos de padrón o champiñones a la plancha' },
    ],
    evita: ['Bravas, croquetas y calamares a la romana: casi todo es aceite', 'Ensaladilla rusa (mucha mayonesa)', 'Picotear pan y frutos secos sin contar'],
    truco: 'Una caña son unas 100 kcal: la segunda ya pesa. La cerveza 0,0 o la tónica zero no.',
    si: [{ alergias: ['cacahuete', 'nueces', 'avellana', 'anacardo'], t: 'Los platitos de frutos secos del bar suelen ir mezclados: mejor no picar de ellos.' }],
  },
  {
    id: 'italiano', nombre: 'Italiano y pizzería', icono: 'pizza',
    idea: 'Pasta con salsa de tomate y proteína, o pizza fina compartida.',
    pide: [
      { t: 'Pasta con salsa de tomate o arrabiata y pollo, atún o gambas' },
      { t: 'Media pizza de masa fina (jamón, pollo, atún) y algo de proteína aparte' },
      { t: 'Carpaccio, bresaola o pescado del día' },
      { t: 'Ensalada caprese o de rúcula para compartir', no: ['verdura_cruda'] },
    ],
    evita: ['Carbonara, cuatro quesos y salsas de nata', 'Pizza entera para ti solo', 'Pan de ajo y focaccia de entrante'],
    truco: 'Las raciones de pasta de restaurante son de 120-150 g en crudo: con medio plato ya tienes tu hidrato.',
    si: [{ alergias: ['nueces', 'anacardo'], t: 'El pesto lleva piñones y a veces anacardos o nueces: pregunta o pide otra salsa.' }],
  },
  {
    id: 'burger', nombre: 'Hamburguesería', icono: 'hamburger',
    idea: 'Hamburguesa sencilla (o doble carne) sin salsas y patatas pequeñas.',
    pide: [
      { t: 'Hamburguesa clásica o doble carne, con queso como mucho' },
      { t: 'Pollo a la plancha (en bocadillo o plato)' },
      { t: 'Patatas pequeñas o mazorca de maíz' },
      { t: 'Refresco zero, agua o cerveza 0,0' },
    ],
    evita: ['Bacon, cheddar y salsas especiales: suman 300-400 kcal', 'Menú grande o XL', 'Pollo crujiente y aros de cebolla'],
    truco: 'Pide las salsas aparte y usa solo una.',
  },
  {
    id: 'asiatico', nombre: 'Japonés y asiático', icono: 'fish',
    idea: 'Sashimi, nigiri o poke, y salteados con arroz blanco.',
    pide: [
      { t: 'Sashimi y nigiri de salmón, atún o pez mantequilla' },
      { t: 'Poke de salmón o atún con arroz' },
      { t: 'Pollo o ternera salteados con verduras y arroz blanco' },
      { t: 'Edamame o sopa de miso de entrante' },
    ],
    evita: ['Tempura y rollitos fritos', 'Uramakis con mayonesa, queso o crujiente por encima', 'Arroz frito tres delicias en ración grande'],
    truco: 'La salsa de soja tiene mucha sal, no calorías: si notas retención al día siguiente, es eso.',
    si: [{ alergias: ['cacahuete', 'anacardo'], t: 'Cuidado: pad thai, pollo kung pao, salsa satay y muchos salteados llevan cacahuete o anacardo. Pregunta siempre antes de pedir.' }],
  },
  {
    id: 'mexicano', nombre: 'Mexicano', icono: 'flame',
    idea: 'Fajitas o tacos de pollo o ternera con frijoles.',
    pide: [
      { t: 'Fajitas de pollo o ternera (2-3 tortillas)' },
      { t: 'Tacos de pollo, cochinita o pescado con tortilla de maíz' },
      { t: 'Frijoles y arroz como hidrato' },
      { t: 'Guacamole y pico de gallo en vez de queso', no: ['verdura_cruda'] },
    ],
    evita: ['Nachos con queso fundido', 'Quesadillas y burritos gigantes', 'Crema agria y queso por encima de todo'],
    truco: 'Un burrito grande puede pasar de 900 kcal: si lo pides, que sea tu comida principal del día.',
  },
  {
    id: 'cafeteria', nombre: 'Cafetería y desayuno', icono: 'coffee',
    idea: 'Tostada con jamón o pavo, o tortilla, y café con leche.',
    pide: [
      { t: 'Tostada de pan integral con jamón, pavo o queso fresco y tomate' },
      { t: 'Tortilla francesa o huevos revueltos' },
      { t: 'Café con leche o cortado' },
      { t: 'Yogur con fruta' },
    ],
    evita: ['Bollería, croissant a la plancha y napolitanas', 'Zumo de naranja grande: es fruta sin fibra', 'Batidos y frappés con nata'],
    truco: 'Si es tu desayuno de antes de entrenar, añade pan o fruta; si no, prioriza la proteína.',
  },
  {
    id: 'super', nombre: 'Súper sin cocina', icono: 'shopping-cart',
    idea: 'Pollo asado, pan y fruta, o un lácteo proteico con algo de hidrato.',
    pide: [
      { t: 'Pollo asado o pechuga cocida en lonchas con pan' },
      { t: 'Wrap o sándwich de pollo o pavo ya hecho' },
      { t: 'Yogur proteico, queso batido o queso fresco' },
      { t: 'Latas de atún o caballa al natural' },
      { t: 'Ensaladas de legumbre en bote o vaso' },
      { t: 'Plátano, mandarina o tortitas de arroz para el hidrato' },
    ],
    evita: ['Platos preparados fritos (croquetas, empanadillas, pizzas)', 'Sándwiches con mucha mayonesa', 'Bollería y snacks de la caja'],
    truco: 'Un yogur proteico y un plátano son una merienda de 25 g de proteína que cabe en la mochila.',
  },
];

/** Cómo calcular raciones sin báscula (a ojo, con la mano). */
export const A_OJO = [
  { icono: 'hand', t: 'Palma de la mano', d: 'una ración de carne o pescado: unos 25-30 g de proteína' },
  { icono: 'hand-fist', t: 'Puño', d: 'una ración de arroz, pasta o patata cocidos: unas 200 kcal' },
  { icono: 'droplet', t: 'Pulgar', d: 'una cucharada de aceite o salsa: unas 90 kcal' },
];
