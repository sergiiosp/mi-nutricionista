// Ingredientes para montar comidas a tu medida, por tipo de comida y grupo.
// Cada elemento: [id del alimento, nombre corto, ración de partida en g o ml].
// La app ajusta después las cantidades para cuadrar los macros de cada comida.

export const MONTAR = {
  // Desayunos, medias mañanas y meriendas
  d: {
    nombre: 'desayuno o tentempié',
    tipos: ['desayuno', 'snack'],
    grupos: [
      {
        id: 'base', nombre: 'Base', icono: 'wheat', minimo: 1, maximo: 2,
        items: [
          ['avena', 'copos de avena', 40], ['avena_sin_gluten', 'avena sin gluten', 40], ['avena_chocolate', 'avena con chocolate', 40],
          ['cereales_trigo_0', 'cereales de trigo 0 %', 35], ['cereales_espelta_0', 'cereales de espelta 0 %', 35], ['cereales_fibra', 'cereales Fibra Sticks', 35],
          ['granola', 'granola', 35], ['pan_integral', 'pan integral', 60], ['pan_molde', 'pan de molde', 50], ['panecillos_tostados', 'panecillos tostados', 27],
          ['tortitas_arroz', 'tortitas de arroz', 23], ['tortitas_maiz', 'tortitas de maíz', 23], ['tortitas_maiz_campestre', 'tortitas campestres', 25],
          ['tortitas_maiz_jamon', 'tortitas sabor jamón', 25], ['tortitas_maiz_chocolate', 'tortitas de maíz con chocolate', 26],
          ['tortitas_arroz_chocolate', 'tortitas de arroz con chocolate', 32], ['tortitas_arroz_choco_blanco', 'tortitas con chocolate blanco', 30],
          ['tortitas_legumbres', 'tortitas de legumbres', 27], ['tortilla_trigo', 'tortilla integral', 60],
        ],
      },
      {
        id: 'liquido', nombre: 'Leche o bebida', icono: 'milk', minimo: 0, maximo: 1,
        items: [
          ['leche_semi', 'leche semidesnatada', 250], ['leche_desnatada', 'leche desnatada', 250], ['leche_sin_lactosa', 'leche sin lactosa', 250],
          ['leche_proteinas', 'leche +Proteínas', 250], ['bebida_avena', 'bebida de avena', 250], ['bebida_almendra', 'bebida de almendra', 250],
          ['bebida_soja', 'bebida de soja', 250], ['bebida_arroz', 'bebida de arroz', 250], ['bebida_coco_arroz', 'bebida de coco', 250], ['kefir', 'kéfir', 200],
        ],
      },
      {
        id: 'proteina', nombre: 'Proteína', icono: 'egg', minimo: 0, maximo: 2,
        items: [
          ['yogur_proteinas', 'yogur +Proteínas', 120], ['postre_proteinas_fresa', '+Proteínas de fresa', 120], ['postre_proteinas_arandanos', '+Proteínas de arándanos', 120],
          ['postre_proteinas_coco', '+Proteínas de coco', 120], ['queso_batido', 'queso batido 0 %', 150], ['yogur_griego_ligero', 'yogur griego ligero', 125],
          ['postre_sin_lactosa', 'yogur sin lactosa', 125], ['queso_burgos_0', 'queso fresco 0 %', 80], ['pavo_fiambre', 'pavo en lonchas', 50],
          ['jamon_serrano', 'jamón serrano', 30], ['huevo', 'huevos', 120], ['huevos_cocidos', 'huevos cocidos', 104], ['claras', 'claras de huevo', 150],
          ['salmon_ahumado', 'salmón ahumado', 50], ['atun_natural', 'atún', 60], ['cacahuete_polvo', 'cacahuete en polvo', 15], ['tofu', 'tofu', 80],
        ],
      },
      {
        id: 'extra', nombre: 'Fruta y extras', icono: 'apple', minimo: 0, maximo: 3,
        items: [
          ['platano', 'plátano', 100], ['fresas', 'fresas', 100], ['arandanos', 'arándanos', 60], ['kiwi', 'kiwi', 85], ['manzana', 'manzana', 150],
          ['pera', 'pera', 150], ['naranja', 'naranja', 150], ['tomate', 'tomate', 80], ['aguacate', 'aguacate', 40], ['aceite', 'aceite de oliva', 5],
          ['crema_cacahuete', 'crema de cacahuete', 15], ['nueces', 'nueces', 15], ['almendras', 'almendras', 15], ['frutos_secos_mix', 'frutos secos', 20],
          ['chia', 'chía', 10], ['semillas_lino', 'semillas de lino', 10], ['mezcla_semillas', 'semillas', 10], ['confitura', 'mermelada 0 %', 15],
          ['miel', 'miel', 10], ['crema_avellana', 'crema de cacao', 15], ['cacao', 'cacao puro', 5], ['matcha', 'matcha', 2],
        ],
      },
    ],
  },
  // Comidas y cenas: proteína + hidrato + verdura + grasa
  p: {
    nombre: 'plato',
    tipos: ['comida', 'cena'],
    grupos: [
      {
        id: 'proteina', nombre: 'Proteína', icono: 'beef', minimo: 1, maximo: 1,
        items: [
          ['pollo_pechuga', 'pollo', 150], ['pollo_contramuslo', 'contramuslo de pollo', 150], ['pavo_pechuga', 'pavo', 150], ['ternera_filete', 'ternera', 150],
          ['picada_vacuno', 'carne picada', 130], ['cerdo_lomo', 'lomo de cerdo', 150], ['cerdo_solomillo', 'solomillo de cerdo', 150], ['salmon', 'salmón', 150],
          ['merluza', 'merluza', 180], ['atun_natural', 'atún', 120], ['langostino', 'langostinos', 150], ['huevo', 'huevos', 120], ['tofu', 'tofu', 150],
          ['salmon_ahumado', 'salmón ahumado', 80], ['caballa_aceite', 'caballa', 90], ['huevos_cocidos', 'huevos cocidos', 104], ['pollo_asado', 'pollo asado', 150],
          ['edamame', 'edamame', 120], ['garbanzos', 'garbanzos', 200], ['lentejas', 'lentejas', 250],
        ],
      },
      {
        id: 'hidrato', nombre: 'Hidrato', icono: 'wheat', minimo: 0, maximo: 1,
        items: [
          ['arroz', 'arroz', 70], ['arroz_integral', 'arroz integral', 70], ['pasta', 'pasta', 75], ['pasta_integral', 'pasta integral', 75], ['cuscus', 'cuscús', 70],
          ['patata', 'patata', 250], ['batata', 'boniato', 250], ['quinoa_cocida', 'quinoa', 125], ['pan_integral', 'pan integral', 60],
          ['tortilla_trigo', 'tortillas de trigo', 60], ['garbanzos', 'garbanzos', 150], ['lentejas', 'lentejas', 200], ['alubias', 'alubias', 200], ['maiz', 'maíz', 80],
        ],
      },
      {
        id: 'verdura', nombre: 'Verdura', icono: 'leafy-green', minimo: 0, maximo: 2,
        items: [
          ['brocoli', 'brócoli', 150], ['espinacas', 'espinacas', 120], ['calabacin', 'calabacín', 150], ['pimiento_rojo', 'pimiento', 100],
          ['judias_verdes', 'judías verdes', 150], ['champinones', 'champiñones', 120], ['wok_verduras', 'verduras al wok', 200], ['pisto', 'pisto', 150],
          ['esparragos', 'espárragos', 120], ['berenjena', 'berenjena', 150], ['lechuga', 'lechuga', 80], ['tomate', 'tomate', 150], ['tomate_cherry', 'tomates cherry', 100],
          ['pepino', 'pepino', 100], ['zanahoria', 'zanahoria', 80], ['gazpacho', 'gazpacho', 250], ['salmorejo', 'salmorejo', 200],
        ],
      },
      {
        id: 'grasa', nombre: 'Aliño y grasa', icono: 'droplet', minimo: 0, maximo: 2,
        items: [['aceite', 'aceite de oliva', 10], ['aguacate', 'aguacate', 50], ['nueces', 'nueces', 15], ['mozzarella', 'mozzarella', 40], ['queso_rallado', 'queso rallado', 15], ['hummus', 'hummus', 50]],
      },
    ],
  },
};

// Bases que piden algo líquido o cremoso para tomarlas (cereales y copos)
export const BASES_DE_BOL = new Set(['avena', 'avena_sin_gluten', 'avena_chocolate', 'cereales_trigo_0', 'cereales_espelta_0', 'cereales_fibra', 'granola']);
// Fuentes de proteína que ya vienen listas para comer
export const LISTOS = new Set(['pollo_asado', 'huevos_cocidos', 'salmon_ahumado', 'atun_natural', 'caballa_aceite', 'quinoa_cocida', 'garbanzos', 'lentejas', 'alubias', 'gazpacho', 'salmorejo', 'edamame']);

// Sabor de cada ingrediente de desayuno, para que las combinaciones propuestas tengan sentido
// (cereales con yogur y fruta, tortitas con pavo y tomate… pero no cereales con jamón)
export const DULCE = new Set([
  'avena', 'avena_sin_gluten', 'avena_chocolate', 'cereales_trigo_0', 'cereales_espelta_0', 'cereales_fibra', 'granola',
  'tortitas_maiz_chocolate', 'tortitas_arroz_chocolate', 'tortitas_arroz_choco_blanco',
  'yogur_proteinas', 'postre_proteinas_fresa', 'postre_proteinas_arandanos', 'postre_proteinas_coco', 'queso_batido', 'yogur_griego_ligero',
  'postre_sin_lactosa', 'cacahuete_polvo',
  'platano', 'fresas', 'arandanos', 'kiwi', 'manzana', 'pera', 'naranja', 'crema_cacahuete', 'nueces', 'almendras', 'frutos_secos_mix',
  'chia', 'semillas_lino', 'mezcla_semillas', 'confitura', 'miel', 'crema_avellana', 'cacao', 'matcha',
]);
export const SALADO = new Set([
  'tortitas_maiz_campestre', 'tortitas_maiz_jamon', 'tortilla_trigo',
  'pavo_fiambre', 'jamon_serrano', 'huevo', 'huevos_cocidos', 'claras', 'salmon_ahumado', 'atun_natural', 'tofu', 'queso_burgos_0',
  'tomate', 'aguacate', 'aceite',
]);
