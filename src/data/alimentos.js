// Base de alimentos. Macros por 100 g de parte comestible (en crudo salvo que se indique;
// conservas: peso escurrido). Valores de referencia de tablas de composición (BEDCA/USDA)
// ajustados a las etiquetas de Hacendado cuando difieren de forma relevante.
//
// Campos:
//   kcal, p (proteína), c (hidratos disponibles), g (grasa), f (fibra)
//   grupo: proteina | hidrato | fruta | verdura | grasa | lacteo | otros
//   dieta: carne | cerdo | pescado | marisco | huevo | lacteo | vegetal  (para filtros de dieta)
//   al: alérgenos / intolerancias (gluten, lactosa, huevo, pescado, marisco, frutos_secos, soja)
//   mercadona: id del producto en tienda.mercadona.es (precio y envase en data/precios.js)
//   rendimiento: fracción comestible (piel, hueso, corazón...). Por defecto 1
//   unidad: { n: nombre singular, pl: plural, g: gramos comestibles por unidad }
//   redondeo: 'unidad' para cuantificar en unidades enteras (huevos, latas...); si no, paso en gramos
//   medida: 'ml' para líquidos (1 g ≈ 1 ml salvo aceite)
//   envaseG: gramos útiles por envase si la API no los da bien (p. ej. aceite: 1 l = 916 g)
//   despensa: true si es un básico que normalmente ya tienes y dura semanas

export const ALIMENTOS = {
  // ── Proteínas ─────────────────────────────────────────────────────────────
  pollo_pechuga: { nombre: 'Pechuga de pollo', kcal: 110, p: 23, c: 0, g: 1.5, f: 0, grupo: 'proteina', dieta: 'carne', al: [], mercadona: '2787' },
  pollo_contramuslo: { nombre: 'Contramuslo de pollo deshuesado', kcal: 135, p: 19, c: 0, g: 6.5, f: 0, grupo: 'proteina', dieta: 'carne', al: [], mercadona: '2789' },
  pavo_pechuga: { nombre: 'Filetes de pechuga de pavo', kcal: 105, p: 24, c: 0, g: 1, f: 0, grupo: 'proteina', dieta: 'carne', al: [], mercadona: '2794' },
  ternera_filete: { nombre: 'Filetes de añojo', kcal: 125, p: 21.5, c: 0, g: 4.5, f: 0, grupo: 'proteina', dieta: 'carne', al: [], mercadona: '8936' },
  picada_vacuno: { nombre: 'Carne picada de vacuno', kcal: 190, p: 18.5, c: 1, g: 12.5, f: 0, grupo: 'proteina', dieta: 'carne', al: [], mercadona: '2868' },
  picada_pollo: { nombre: 'Carne picada de pollo', kcal: 135, p: 19, c: 1, g: 6.5, f: 0, grupo: 'proteina', dieta: 'carne', al: [], mercadona: '35774' },
  cerdo_lomo: { nombre: 'Filetes de lomo de cerdo', kcal: 150, p: 21, c: 0, g: 7, f: 0, grupo: 'proteina', dieta: 'cerdo', al: [], mercadona: '2849' },
  cerdo_solomillo: { nombre: 'Solomillo de cerdo', kcal: 120, p: 21, c: 0, g: 4, f: 0, grupo: 'proteina', dieta: 'cerdo', al: [], mercadona: '4570' },
  salmon: { nombre: 'Lomos de salmón sin piel', kcal: 200, p: 20, c: 0, g: 13, f: 0, grupo: 'proteina', dieta: 'pescado', al: ['pescado'], mercadona: '24511' },
  merluza: { nombre: 'Filetes de merluza (congelada)', kcal: 75, p: 16.5, c: 0, g: 1, f: 0, grupo: 'proteina', dieta: 'pescado', al: ['pescado'], mercadona: '62228' },
  atun_natural: { nombre: 'Atún claro al natural', kcal: 105, p: 24, c: 0, g: 1, f: 0, grupo: 'proteina', dieta: 'pescado', al: ['pescado'], mercadona: '18018', unidad: { n: 'lata', pl: 'latas', g: 60 }, redondeo: 'unidad' },
  langostino: { nombre: 'Langostino crudo pelado (congelado)', kcal: 80, p: 18, c: 0, g: 1, f: 0, grupo: 'proteina', dieta: 'marisco', al: ['marisco'], mercadona: '24486' },
  huevo: { nombre: 'Huevos L', kcal: 143, p: 12.6, c: 0.7, g: 9.9, f: 0, grupo: 'proteina', dieta: 'huevo', al: ['huevo'], mercadona: '31504', unidad: { n: 'huevo', pl: 'huevos', g: 60 }, redondeo: 'unidad' },
  claras: { nombre: 'Claras de huevo pasteurizadas', kcal: 48, p: 11, c: 0.7, g: 0.2, f: 0, grupo: 'proteina', dieta: 'huevo', al: ['huevo'], mercadona: '31312', medida: 'ml' },
  tofu: { nombre: 'Tofu firme', kcal: 130, p: 13, c: 1.5, g: 8, f: 1, grupo: 'proteina', dieta: 'vegetal', al: ['soja'], mercadona: '51097' },
  pavo_fiambre: { nombre: 'Pechuga de pavo 92% en lonchas', kcal: 95, p: 20, c: 1.5, g: 1.2, f: 0, grupo: 'proteina', dieta: 'carne', al: [], mercadona: '5710' },
  jamon_serrano: { nombre: 'Jamón serrano', kcal: 240, p: 31, c: 0, g: 13, f: 0, grupo: 'proteina', dieta: 'cerdo', al: [], mercadona: '15700' },
  queso_batido: { nombre: 'Queso fresco batido 0%', kcal: 46, p: 8, c: 3.6, g: 0.2, f: 0, grupo: 'lacteo', dieta: 'lacteo', al: ['lactosa'], mercadona: '51071' },
  yogur_proteinas: { nombre: 'Postre lácteo natural +Proteínas 0%', kcal: 58, p: 10, c: 4, g: 0.2, f: 0, grupo: 'lacteo', dieta: 'lacteo', al: ['lactosa'], mercadona: '20908', unidad: { n: 'tarrina', pl: 'tarrinas', g: 120 }, redondeo: 'unidad' },
  queso_burgos_0: { nombre: 'Queso fresco Burgos 0%', kcal: 70, p: 12, c: 4, g: 0.4, f: 0, grupo: 'lacteo', dieta: 'lacteo', al: ['lactosa'], mercadona: '52409' },
  mozzarella: { nombre: 'Mozzarella fresca', kcal: 240, p: 18, c: 1, g: 18, f: 0, grupo: 'lacteo', dieta: 'lacteo', al: ['lactosa'], mercadona: '51050' },
  queso_rallado: { nombre: 'Queso rallado mozzarella', kcal: 290, p: 22, c: 2, g: 22, f: 0, grupo: 'lacteo', dieta: 'lacteo', al: ['lactosa'], mercadona: '51110' },

  // ── Legumbres ────────────────────────────────────────────────────────────
  garbanzos: { nombre: 'Garbanzos cocidos (bote)', kcal: 125, p: 7.2, c: 15, g: 2.4, f: 5, grupo: 'hidrato', dieta: 'vegetal', al: [], mercadona: '26029' },
  lentejas: { nombre: 'Lentejas cocidas (bote)', kcal: 95, p: 7, c: 12, g: 0.5, f: 4, grupo: 'hidrato', dieta: 'vegetal', al: [], mercadona: '26030' },
  alubias: { nombre: 'Alubias blancas cocidas (bote)', kcal: 90, p: 6.5, c: 11.5, g: 0.5, f: 5, grupo: 'hidrato', dieta: 'vegetal', al: [], mercadona: '26019' },
  hummus: { nombre: 'Hummus clásico', kcal: 290, p: 7, c: 11, g: 23, f: 5, grupo: 'grasa', dieta: 'vegetal', al: [], mercadona: '80858' },

  // ── Hidratos ─────────────────────────────────────────────────────────────
  arroz: { nombre: 'Arroz largo', kcal: 355, p: 7, c: 78, g: 0.6, f: 1, grupo: 'hidrato', dieta: 'vegetal', al: [], mercadona: '5063' },
  arroz_integral: { nombre: 'Arroz integral largo', kcal: 350, p: 7.5, c: 72, g: 2.5, f: 3.5, grupo: 'hidrato', dieta: 'vegetal', al: [], mercadona: '5184' },
  pasta: { nombre: 'Macarrones', kcal: 355, p: 12.5, c: 71, g: 1.5, f: 3, grupo: 'hidrato', dieta: 'vegetal', al: ['gluten'], mercadona: '6250' },
  pasta_larga: { nombre: 'Tallarines / espaguetis', kcal: 355, p: 12.5, c: 71, g: 1.5, f: 3, grupo: 'hidrato', dieta: 'vegetal', al: ['gluten'], mercadona: '6246' },
  pasta_integral: { nombre: 'Macarrones integrales', kcal: 350, p: 13.5, c: 64, g: 2.5, f: 8, grupo: 'hidrato', dieta: 'vegetal', al: ['gluten'], mercadona: '35777' },
  cuscus: { nombre: 'Cuscús', kcal: 360, p: 12.5, c: 72, g: 1.5, f: 3, grupo: 'hidrato', dieta: 'vegetal', al: ['gluten'], mercadona: '9395' },
  patata: { nombre: 'Patatas', kcal: 77, p: 2, c: 17, g: 0.1, f: 2, grupo: 'hidrato', dieta: 'vegetal', al: [], mercadona: '69166', rendimiento: 0.85 },
  batata: { nombre: 'Batata (boniato)', kcal: 86, p: 1.6, c: 20, g: 0.1, f: 3, grupo: 'hidrato', dieta: 'vegetal', al: [], mercadona: '69239', rendimiento: 0.85 },
  avena: { nombre: 'Copos de avena', kcal: 370, p: 13.5, c: 59, g: 7, f: 10, grupo: 'hidrato', dieta: 'vegetal', al: ['gluten'], mercadona: '86341' },
  pan_integral: { nombre: 'Barra de pan integral 100%', kcal: 250, p: 10, c: 43, g: 2.5, f: 7, grupo: 'hidrato', dieta: 'vegetal', al: ['gluten'], mercadona: '17912.1', paso: 10 },
  pan_molde: { nombre: 'Pan de molde integral con avena', kcal: 250, p: 11, c: 38, g: 4, f: 7, grupo: 'hidrato', dieta: 'vegetal', al: ['gluten'], mercadona: '18294', unidad: { n: 'rebanada', pl: 'rebanadas', g: 30 }, redondeo: 'unidad' },
  tortitas_arroz: { nombre: 'Tortitas de arroz', kcal: 385, p: 8, c: 80, g: 2.8, f: 3, grupo: 'hidrato', dieta: 'vegetal', al: [], mercadona: '14013', unidad: { n: 'tortita', pl: 'tortitas', g: 7.7 }, redondeo: 'unidad' },
  tortilla_trigo: { nombre: 'Tortillas de trigo integrales', kcal: 290, p: 9, c: 45, g: 7, f: 6, grupo: 'hidrato', dieta: 'vegetal', al: ['gluten'], mercadona: '80942', unidad: { n: 'tortilla', pl: 'tortillas', g: 45 }, redondeo: 'unidad' },
  maiz: { nombre: 'Maíz dulce (lata)', kcal: 80, p: 2.9, c: 14, g: 1.2, f: 2.5, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '16712' },

  // ── Fruta ────────────────────────────────────────────────────────────────
  platano: { nombre: 'Plátano', kcal: 95, p: 1.2, c: 20, g: 0.3, f: 2, grupo: 'fruta', dieta: 'vegetal', al: [], mercadona: '3819', rendimiento: 0.68, unidad: { n: 'plátano', pl: 'plátanos', g: 110 } },
  manzana: { nombre: 'Manzana', kcal: 52, p: 0.3, c: 12, g: 0.2, f: 2.2, grupo: 'fruta', dieta: 'vegetal', al: [], mercadona: '8177', rendimiento: 0.9, unidad: { n: 'manzana', pl: 'manzanas', g: 170 } },
  pera: { nombre: 'Pera conferencia', kcal: 57, p: 0.4, c: 13, g: 0.1, f: 3, grupo: 'fruta', dieta: 'vegetal', al: [], mercadona: '3119', rendimiento: 0.9, unidad: { n: 'pera', pl: 'peras', g: 150 } },
  kiwi: { nombre: 'Kiwi', kcal: 61, p: 1.1, c: 12, g: 0.5, f: 3, grupo: 'fruta', dieta: 'vegetal', al: [], mercadona: '3820', rendimiento: 0.85, unidad: { n: 'kiwi', pl: 'kiwis', g: 85 } },
  naranja: { nombre: 'Naranja', kcal: 45, p: 0.9, c: 9, g: 0.2, f: 2, grupo: 'fruta', dieta: 'vegetal', al: [], mercadona: '3235', rendimiento: 0.7, unidad: { n: 'naranja', pl: 'naranjas', g: 160 } },
  fresas: { nombre: 'Fresas', kcal: 33, p: 0.7, c: 6, g: 0.3, f: 2, grupo: 'fruta', dieta: 'vegetal', al: [], mercadona: '3723', rendimiento: 0.95 },
  arandanos: { nombre: 'Arándanos', kcal: 57, p: 0.7, c: 12, g: 0.3, f: 2.4, grupo: 'fruta', dieta: 'vegetal', al: [], mercadona: '5501' },

  // ── Verdura ──────────────────────────────────────────────────────────────
  brocoli: { nombre: 'Brócoli (congelado)', kcal: 34, p: 2.8, c: 4.5, g: 0.4, f: 2.6, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '61261' },
  espinacas: { nombre: 'Espinacas (congeladas)', kcal: 23, p: 2.9, c: 1.4, g: 0.4, f: 2.2, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '61279' },
  calabacin: { nombre: 'Calabacín', kcal: 17, p: 1.2, c: 2.5, g: 0.3, f: 1, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '69338', rendimiento: 0.95 },
  pimiento_rojo: { nombre: 'Pimiento rojo', kcal: 31, p: 1, c: 5, g: 0.3, f: 2, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '69310', rendimiento: 0.85 },
  cebolla: { nombre: 'Cebollas', kcal: 40, p: 1.1, c: 8, g: 0.1, f: 1.7, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '69089', rendimiento: 0.9 },
  ajo: { nombre: 'Ajos', kcal: 140, p: 6, c: 28, g: 0.5, f: 2, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '69297', rendimiento: 0.85, unidad: { n: 'diente', pl: 'dientes', g: 5 }, redondeo: 'unidad', despensa: true },
  tomate: { nombre: 'Tomates pera', kcal: 18, p: 0.9, c: 3, g: 0.2, f: 1.2, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '69975', rendimiento: 0.95 },
  tomate_cherry: { nombre: 'Tomates cherry', kcal: 20, p: 0.9, c: 3.5, g: 0.2, f: 1.3, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '69990' },
  tomate_triturado: { nombre: 'Tomate triturado (bote)', kcal: 32, p: 1.4, c: 5, g: 0.2, f: 1.2, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '16043' },
  tomate_frito: { nombre: 'Tomate frito', kcal: 74, p: 1.6, c: 9.5, g: 3.2, f: 1.5, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '17108' },
  lechuga: { nombre: 'Lechuga corazón romana', kcal: 15, p: 1.3, c: 1.5, g: 0.2, f: 1.3, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '69121', envaseG: 300, rendimiento: 0.9 },
  zanahoria: { nombre: 'Zanahorias', kcal: 41, p: 0.9, c: 8, g: 0.2, f: 2.8, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '69586', rendimiento: 0.9 },
  champinones: { nombre: 'Champiñones laminados', kcal: 22, p: 3, c: 0.5, g: 0.3, f: 1, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '69519' },
  judias_verdes: { nombre: 'Judía verde plana (congelada)', kcal: 30, p: 2, c: 4, g: 0.2, f: 3, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '61283' },
  pepino: { nombre: 'Pepino', kcal: 15, p: 0.7, c: 2.5, g: 0.1, f: 0.5, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '69584', rendimiento: 0.9 },
  berenjena: { nombre: 'Berenjena', kcal: 25, p: 1, c: 4, g: 0.2, f: 3, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '69326', rendimiento: 0.95 },
  wok_verduras: { nombre: 'Wok de verduras (congelado)', kcal: 45, p: 2, c: 6, g: 1, f: 2.5, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '11617' },
  pisto: { nombre: 'Fritada / pisto', kcal: 80, p: 1.5, c: 7, g: 5, f: 2, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '17112' },
  esparragos: { nombre: 'Espárragos verdes', kcal: 20, p: 2.2, c: 2, g: 0.2, f: 2, grupo: 'verdura', dieta: 'vegetal', al: [], mercadona: '69656', rendimiento: 0.7 },
  aguacate: { nombre: 'Aguacate', kcal: 160, p: 2, c: 2, g: 15, f: 7, grupo: 'grasa', dieta: 'vegetal', al: [], mercadona: '3830', rendimiento: 0.7, unidad: { n: 'aguacate', pl: 'aguacates', g: 230 } },

  // ── Grasas ───────────────────────────────────────────────────────────────
  aceite: { nombre: 'Aceite de oliva virgen extra', kcal: 884, p: 0, c: 0, g: 100, f: 0, grupo: 'grasa', dieta: 'vegetal', al: [], mercadona: '4740', envaseG: 916, despensa: true },
  nueces: { nombre: 'Nueces peladas', kcal: 654, p: 15, c: 7, g: 65, f: 6.5, grupo: 'grasa', dieta: 'vegetal', al: ['frutos_secos'], mercadona: '34024' },
  almendras: { nombre: 'Almendras naturales', kcal: 600, p: 21, c: 7, g: 52, f: 12, grupo: 'grasa', dieta: 'vegetal', al: ['frutos_secos'], mercadona: '34865' },
  crema_cacahuete: { nombre: 'Crema de cacahuete 100%', kcal: 595, p: 26, c: 10, g: 49, f: 8, grupo: 'grasa', dieta: 'vegetal', al: ['frutos_secos'], mercadona: '16883' },
  chia: { nombre: 'Semillas de chía', kcal: 490, p: 17, c: 8, g: 31, f: 34, grupo: 'grasa', dieta: 'vegetal', al: [], mercadona: '5464' },

  // ── Lácteos y bebidas ────────────────────────────────────────────────────
  leche_semi: { nombre: 'Leche semidesnatada', kcal: 46, p: 3.2, c: 4.7, g: 1.6, f: 0, grupo: 'lacteo', dieta: 'lacteo', al: ['lactosa'], mercadona: '10382', medida: 'ml' },
  leche_desnatada: { nombre: 'Leche desnatada', kcal: 35, p: 3.4, c: 4.8, g: 0.2, f: 0, grupo: 'lacteo', dieta: 'lacteo', al: ['lactosa'], mercadona: '10384', medida: 'ml' },
  bebida_soja: { nombre: 'Bebida de soja 0% azúcar', kcal: 33, p: 3.3, c: 0.3, g: 1.9, f: 0.6, grupo: 'lacteo', dieta: 'vegetal', al: ['soja'], mercadona: '29314', medida: 'ml' },

  // ── Otros / despensa ─────────────────────────────────────────────────────
  miel: { nombre: 'Miel de flores', kcal: 320, p: 0.4, c: 80, g: 0, f: 0, grupo: 'otros', dieta: 'vegetal', al: [], mercadona: '15430', despensa: true },
  cacao: { nombre: 'Cacao puro en polvo', kcal: 360, p: 21, c: 14, g: 14, f: 30, grupo: 'otros', dieta: 'vegetal', al: [], mercadona: '22580', despensa: true },
  confitura: { nombre: 'Confitura de fresa 0% azúcares añadidos', kcal: 155, p: 0.5, c: 37, g: 0.2, f: 1, grupo: 'otros', dieta: 'vegetal', al: [], mercadona: '15093', despensa: true },
  salsa_soja: { nombre: 'Salsa de soja', kcal: 60, p: 7, c: 6, g: 0, f: 0, grupo: 'otros', dieta: 'vegetal', al: ['soja', 'gluten'], mercadona: '17360', medida: 'ml', despensa: true },
  caldo_pollo: { nombre: 'Caldo de pollo', kcal: 5, p: 0.6, c: 0.3, g: 0.2, f: 0, grupo: 'otros', dieta: 'carne', al: [], mercadona: '7313', medida: 'ml' },
  vinagre: { nombre: 'Vinagre de manzana', kcal: 20, p: 0, c: 0.5, g: 0, f: 0, grupo: 'otros', dieta: 'vegetal', al: [], mercadona: '4957', medida: 'ml', despensa: true },
  mostaza: { nombre: 'Mostaza de Dijon', kcal: 150, p: 7, c: 3, g: 11, f: 3, grupo: 'otros', dieta: 'vegetal', al: [], mercadona: '17228', despensa: true },
};

// Especias y condimentos (sin aporte calórico relevante). Se listan aparte en la compra.
export const ESPECIAS = {
  sal: { nombre: 'Sal' },
  pimienta: { nombre: 'Pimienta negra molida', mercadona: '34171' },
  pimenton: { nombre: 'Pimentón dulce de la Vera', mercadona: '34102' },
  comino: { nombre: 'Comino molido', mercadona: '34120' },
  curry: { nombre: 'Curry', mercadona: '34125' },
  oregano: { nombre: 'Orégano', mercadona: '5598' },
  canela: { nombre: 'Canela molida' },
  perejil: { nombre: 'Perejil' },
  limon: { nombre: 'Limón' },
  ajo_polvo: { nombre: 'Ajo granulado', mercadona: '86656' },
};

export const ALERGENOS = {
  gluten: 'Gluten',
  lactosa: 'Lactosa',
  huevo: 'Huevo',
  pescado: 'Pescado',
  marisco: 'Marisco',
  frutos_secos: 'Frutos secos / cacahuete',
  soja: 'Soja',
};
