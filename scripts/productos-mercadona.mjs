// Productos envasados de Mercadona para montar comidas: código de barras y alérgenos de la
// tienda online de Mercadona, macros de la etiqueta vía Open Food Facts (si falta o no cuadra,
// se usan los valores de referencia de esta lista). Escribe src/data/productos.js.
// Uso: node scripts/productos-mercadona.mjs
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// clave, id Mercadona, grupo, dieta, macros de referencia por 100 g [kcal, p, c, g, fibra], extra
// (en extra, `al` añade alérgenos que la tienda no declara en la ficha)
const LISTA = [
  // Cereales y tortitas
  ['tortitas_maiz', '14158', 'hidrato', 'vegetal', [368, 7.5, 80, 1.8, 4], { unidad: { n: 'tortita', pl: 'tortitas', g: 7.5 }, redondeo: 'unidad' }],
  ['tortitas_maiz_campestre', '14786', 'hidrato', 'vegetal', [400, 8, 76, 7, 4], { unidad: { n: 'tortita', pl: 'tortitas', g: 8.5 }, redondeo: 'unidad' }],
  ['tortitas_maiz_jamon', '35776', 'hidrato', 'vegetal', [395, 8, 77, 5.5, 3.5], { unidad: { n: 'tortita', pl: 'tortitas', g: 8.5 }, redondeo: 'unidad' }],
  ['tortitas_maiz_chocolate', '14015', 'hidrato', 'vegetal', [480, 7, 62, 22, 4], { unidad: { n: 'tortita', pl: 'tortitas', g: 13 }, redondeo: 'unidad' }],
  ['tortitas_arroz_chocolate', '14142', 'hidrato', 'lacteo', [480, 7, 63, 22, 3], { unidad: { n: 'tortita', pl: 'tortitas', g: 16 }, redondeo: 'unidad' }],
  ['tortitas_arroz_choco_blanco', '14141', 'hidrato', 'lacteo', [490, 6, 63, 23, 1], { unidad: { n: 'tortita', pl: 'tortitas', g: 15 }, redondeo: 'unidad' }],
  ['tortitas_legumbres', '86483', 'hidrato', 'vegetal', [380, 14, 68, 4, 6], { unidad: { n: 'tortita', pl: 'tortitas', g: 9 }, redondeo: 'unidad' }],
  ['cereales_trigo_0', '9488', 'hidrato', 'vegetal', [375, 12, 74, 1.5, 8], {}],
  ['cereales_espelta_0', '9571', 'hidrato', 'vegetal', [370, 13, 70, 2.5, 9], { al: ['gluten'] }],
  ['cereales_fibra', '60236', 'hidrato', 'vegetal', [330, 14, 48, 3.5, 27], {}],
  ['avena_chocolate', '20292', 'hidrato', 'vegetal', [400, 11, 62, 9, 9], {}],
  ['granola', '9474', 'hidrato', 'vegetal', [450, 10, 60, 17, 7], { al: ['gluten', 'frutos_secos'] }],
  ['avena_sin_gluten', '86368', 'hidrato', 'vegetal', [370, 13, 59, 7, 10], {}],
  ['panecillos_tostados', '13445', 'hidrato', 'vegetal', [390, 13, 68, 5, 10], { al: ['gluten'], unidad: { n: 'panecillo', pl: 'panecillos', g: 9 }, redondeo: 'unidad' }],
  ['tortilla_trigo_integral', '80942', 'hidrato', 'vegetal', [300, 9, 48, 7, 6], { unidad: { n: 'tortilla', pl: 'tortillas', g: 60 }, redondeo: 'unidad' }],
  ['quinoa_cocida', '22278', 'hidrato', 'vegetal', [140, 4.5, 23, 2.5, 3], { unidad: { n: 'vasito', pl: 'vasitos', g: 125 } }],
  // Bebidas y lácteos
  ['bebida_avena', '23912', 'lacteo', 'vegetal', [45, 0.5, 7.5, 1.4, 0.8], { medida: 'ml' }],
  ['bebida_almendra', '23926', 'lacteo', 'vegetal', [15, 0.5, 0.3, 1.2, 0.3], { medida: 'ml' }],
  ['bebida_arroz', '23047', 'lacteo', 'vegetal', [50, 0.1, 10, 1, 0], { medida: 'ml' }],
  ['bebida_coco_arroz', '13846', 'lacteo', 'vegetal', [25, 0.1, 3, 1.2, 0], { medida: 'ml' }],
  ['leche_sin_lactosa', '10722', 'lacteo', 'lacteo', [46, 3.1, 4.7, 1.6, 0], { medida: 'ml' }],
  ['leche_proteinas', '10678', 'lacteo', 'lacteo', [49, 6, 6, 0.3, 0], { medida: 'ml' }],
  ['kefir', '20029', 'lacteo', 'lacteo', [58, 3.3, 4, 3.3, 0], {}],
  ['postre_proteinas_fresa', '20996', 'lacteo', 'lacteo', [65, 8.3, 7, 0.1, 0], { unidad: { n: 'tarrina', pl: 'tarrinas', g: 120 }, redondeo: 'unidad' }],
  ['postre_proteinas_arandanos', '21073', 'lacteo', 'lacteo', [65, 8.3, 7, 0.1, 0], { unidad: { n: 'tarrina', pl: 'tarrinas', g: 120 }, redondeo: 'unidad' }],
  ['postre_proteinas_coco', '52855', 'lacteo', 'lacteo', [65, 8.3, 7, 0.1, 0], { unidad: { n: 'tarrina', pl: 'tarrinas', g: 120 }, redondeo: 'unidad' }],
  ['postre_sin_lactosa', '20164', 'lacteo', 'lacteo', [40, 4.5, 5, 0.1, 0], {}],
  ['yogur_griego_ligero', '21358', 'lacteo', 'lacteo', [80, 6, 4.5, 2, 0], {}],
  // Extras y toppings
  ['matcha', '15099', 'otros', 'vegetal', [320, 30, 5, 5, 38], { fijo: 2 }],
  ['semillas_lino', '34962', 'grasa', 'vegetal', [530, 18, 2, 42, 27], {}],
  ['mezcla_semillas', '34963', 'grasa', 'vegetal', [560, 22, 10, 45, 12], {}],
  ['cacahuete_polvo', '13738', 'proteina', 'vegetal', [400, 50, 14, 12, 12], {}],
  ['crema_avellana', '11630', 'grasa', 'lacteo', [540, 6, 56, 32, 3], { al: ['avellana'] }],
  ['frutos_secos_mix', '16833', 'grasa', 'vegetal', [600, 20, 12, 52, 8], { al: ['frutos_secos'] }],
  // Proteínas y platos
  ['salmon_ahumado', '53444', 'proteina', 'pescado', [180, 22, 0, 10, 0], {}],
  ['caballa_aceite', '13628', 'proteina', 'pescado', [220, 22, 0, 15, 0], { unidad: { n: 'lata', pl: 'latas', g: 90 }, redondeo: 'unidad' }],
  ['huevos_cocidos', '31010', 'proteina', 'huevo', [140, 12.5, 0.5, 10, 0], { unidad: { n: 'huevo', pl: 'huevos', g: 52 }, redondeo: 'unidad' }],
  ['pollo_asado', '13707', 'proteina', 'carne', [190, 25, 0.5, 10, 0], {}],
  ['edamame', '70740', 'proteina', 'vegetal', [125, 12, 4, 5.5, 5], {}],
  // Embutidos magros y fiambres
  ['lomo_embuchado', '86444', 'proteina', 'cerdo', [220, 40, 1, 6.5, 0], {}],
  ['cabecero_lomo', '86442', 'proteina', 'cerdo', [330, 29, 1, 23, 0], {}],
  ['lomo_pavo', '12282', 'proteina', 'carne', [110, 22, 1, 2, 0], {}],
  ['pollo_braseado_lonchas', '18106', 'proteina', 'carne', [105, 20, 1.5, 2, 0], {}],
  ['jamon_cocido_extra', '60329', 'proteina', 'cerdo', [110, 20, 1, 3, 0], {}],
  // Frutos secos y semillas (cada uno con su alérgeno)
  ['almendra_tostada', '17668', 'grasa', 'vegetal', [610, 22, 5, 54, 11], { al: ['almendra'] }],
  ['pistacho', '86190', 'grasa', 'vegetal', [600, 25, 12, 49, 10], { al: ['pistacho'] }],
  ['pipas_girasol', '23059', 'grasa', 'vegetal', [610, 23, 9, 53, 9], {}],
  ['pipas_calabaza', '18259', 'grasa', 'vegetal', [580, 33, 4, 48, 6], {}],
  // Listos en microondas y conservas para platos sin cocinar
  ['arroz_microondas', '61302', 'hidrato', 'vegetal', [140, 2.8, 30, 0.8, 0.5], {}],
  ['arroz_vasito', '22279', 'hidrato', 'vegetal', [155, 2.6, 34, 0.9, 0.5], { unidad: { n: 'vasito', pl: 'vasitos', g: 125 } }],
  ['patata_microondas', '69484', 'hidrato', 'vegetal', [77, 2, 17, 0.1, 2], {}],
  ['alubias_pintas', '26001', 'hidrato', 'vegetal', [90, 6, 11, 0.5, 5.5], {}],
  ['aceitunas_negras', '8309', 'grasa', 'vegetal', [145, 1, 0.5, 15, 3], {}],
  ['pimientos_asados', '16124', 'verdura', 'vegetal', [35, 1, 5, 0.5, 2], {}],
  ['gazpacho', '15604', 'verdura', 'vegetal', [50, 1, 4, 3.5, 1], { medida: 'ml', al: ['verdura_cruda'] }],
  ['salmorejo', '39902', 'verdura', 'vegetal', [90, 1.5, 7, 6, 1], { medida: 'ml', al: ['verdura_cruda'] }],
];

// Selección amplia (catalogo: true): sirven para buscar, registrar y añadir a la compra, pero no salen
// en la lista de «¿qué no te gusta?» del cuestionario. `alias` = otras formas de buscarlos.
const U = (n, pl, g) => ({ unidad: { n, pl, g }, redondeo: 'unidad' });
const LISTA_AMPLIA = [
  // Lácteos con proteína y postres ligeros
  ['postre_proteinas_natural_bote', '21256', 'lacteo', 'lacteo', [57, 10, 3.8, 0.2, 0], { alias: 'yogur proteinas' }],
  ['postre_proteinas_mango', '21151', 'lacteo', 'lacteo', [65, 8.3, 7.5, 0.1, 0], { ...U('tarrina', 'tarrinas', 120), alias: 'yogur proteinas' }],
  ['bebida_proteinas_fresa', '21333', 'lacteo', 'lacteo', [55, 7.1, 5.5, 0.3, 0], { medida: 'ml', ...U('botella', 'botellas', 280), alias: 'batido yogur liquido proteinas' }],
  ['bebida_proteinas_tropical', '21378', 'lacteo', 'lacteo', [55, 7.1, 5.5, 0.3, 0], { medida: 'ml', ...U('botella', 'botellas', 280), alias: 'batido yogur liquido proteinas' }],
  ['bebida_proteinas_stracciatella', '19985', 'lacteo', 'lacteo', [60, 7.1, 6, 0.6, 0], { medida: 'ml', ...U('botella', 'botellas', 280), alias: 'batido yogur liquido proteinas' }],
  ['bebida_proteinas_acai', '35847', 'lacteo', 'lacteo', [55, 7.1, 5.5, 0.3, 0], { medida: 'ml', ...U('botella', 'botellas', 280), alias: 'batido yogur liquido proteinas' }],
  ['bebida_proteinas_fresa_platano', '12753', 'lacteo', 'lacteo', [47, 7, 4, 0.2, 0], { medida: 'ml', alias: 'batido yogur liquido proteinas' }],
  ['batido_proteinas_cafe', '21625', 'lacteo', 'lacteo', [70, 9.1, 5, 1.4, 0], { medida: 'ml', ...U('brik', 'briks', 330), alias: 'proteinas' }],
  ['batido_proteinas_chocolate', '86418', 'lacteo', 'lacteo', [72, 9.1, 5.5, 1.5, 0.5], { medida: 'ml', ...U('brik', 'briks', 330), alias: 'proteinas' }],
  ['batido_proteinas_vainilla', '86419', 'lacteo', 'lacteo', [70, 9.1, 5.2, 1.4, 0], { medida: 'ml', ...U('brik', 'briks', 330), alias: 'proteinas' }],
  ['natillas_proteinas_chocolate', '21061', 'lacteo', 'lacteo', [80, 8.3, 9, 1.3, 0.5], { ...U('tarrina', 'tarrinas', 120), alias: 'postre proteinas' }],
  ['natillas_proteinas_vainilla', '22311', 'lacteo', 'lacteo', [80, 10, 8, 1, 0], { ...U('tarrina', 'tarrinas', 120), alias: 'postre proteinas' }],
  ['pudding_proteinas_caramelo', '60956', 'lacteo', 'lacteo', [85, 10, 9, 1, 0], { ...U('tarrina', 'tarrinas', 120), alias: 'postre proteinas' }],
  ['flan_proteinas', '67635', 'lacteo', 'lacteo', [60, 10, 4.5, 0.2, 0], { ...U('flan', 'flanes', 100), alias: 'postre proteinas' }],
  ['gelatina_proteinas', '52488', 'otros', 'vegetal', [45, 10, 1, 0, 0], { ...U('tarrina', 'tarrinas', 100), alias: 'postre proteinas' }],
  ['mousse_proteinas_chocolate', '9905', 'lacteo', 'lacteo', [95, 10, 9, 2, 1], { ...U('tarrina', 'tarrinas', 100), alias: 'postre proteinas' }],
  ['kefir_0', '15662', 'lacteo', 'lacteo', [38, 3.5, 4.5, 0.1, 0], { medida: 'ml', ...U('botella', 'botellas', 250) }],
  ['yogur_natural_0', '20210', 'lacteo', 'lacteo', [40, 4.3, 5.5, 0.1, 0], U('yogur', 'yogures', 125)],
  ['yogur_natural_edulcorado_0', '20221', 'lacteo', 'lacteo', [38, 4.3, 5, 0.1, 0], U('yogur', 'yogures', 125)],
  ['yogur_fresa_0', '21199', 'lacteo', 'lacteo', [40, 4, 5.5, 0.1, 0], U('yogur', 'yogures', 125)],
  ['yogur_griego_natural', '20559', 'lacteo', 'lacteo', [130, 3.5, 4, 11, 0], U('yogur', 'yogures', 125)],
  ['bifidus_natural_0', '21193', 'lacteo', 'lacteo', [40, 4.5, 5, 0.1, 0], U('yogur', 'yogures', 125)],
  ['postre_cremoso_0', '20830', 'lacteo', 'lacteo', [45, 4.5, 6, 0.1, 0], { ...U('tarrina', 'tarrinas', 125), alias: 'yogur' }],
  ['queso_cottage', '60963', 'lacteo', 'lacteo', [85, 11, 3.5, 2.5, 0], {}],
  ['queso_cottage_crema', '17461', 'lacteo', 'lacteo', [95, 10, 4, 4, 0], {}],
  ['queso_quespro', '17463', 'lacteo', 'lacteo', [75, 13, 3.5, 0.5, 0], { alias: 'queso fresco proteinas' }],
  ['requeson', '51012', 'lacteo', 'lacteo', [130, 9, 4, 8.5, 0], {}],
  ['queso_fresco_light', '51192', 'lacteo', 'lacteo', [110, 12, 4, 5, 0], {}],
  ['queso_burgos_natural', '52408', 'lacteo', 'lacteo', [190, 12, 3, 15, 0], {}],
  ['mozzarella_light', '51230', 'lacteo', 'lacteo', [165, 20, 1.5, 9, 0], {}],
  ['queso_lonchas_light', '50546', 'lacteo', 'lacteo', [245, 30, 1, 13.5, 0], { ...U('loncha', 'lonchas', 20), alias: 'queso lonchas 0% ligero' }],
  ['queso_lonchas_tierno', '50543', 'lacteo', 'lacteo', [350, 24, 0.5, 28, 0], U('loncha', 'lonchas', 20)],
  ['queso_lonchas_mozzarella', '51126', 'lacteo', 'lacteo', [285, 22, 1.5, 21, 0], U('loncha', 'lonchas', 20)],
  ['queso_untar_light', '51223', 'lacteo', 'lacteo', [140, 8, 5, 10, 0], { alias: 'philadelphia crema' }],
  ['queso_porciones_light', '51232', 'lacteo', 'lacteo', [160, 13, 6, 9, 0], U('quesito', 'quesitos', 15.6)],
  ['queso_grana_padano', '51146', 'lacteo', 'lacteo', [390, 33, 0, 28, 0], { alias: 'parmesano' }],
  ['queso_feta', '51197', 'lacteo', 'lacteo', [265, 15, 1, 22, 0], {}],
  ['leche_desnatada_sin_lactosa', '10731', 'lacteo', 'lacteo', [35, 3.4, 4.8, 0.2, 0], { medida: 'ml' }],
  ['bebida_avena_0', '52640', 'lacteo', 'vegetal', [40, 0.4, 6.7, 1.3, 0.7], { medida: 'ml', alias: 'leche avena' }],
  ['bebida_avena_barista', '86167', 'lacteo', 'vegetal', [50, 0.6, 6.5, 2.2, 0.7], { medida: 'ml', alias: 'leche avena' }],
  ['bebida_avena_chocolate', '52634', 'lacteo', 'vegetal', [55, 1, 8, 1.5, 1], { medida: 'ml', alias: 'leche avena cacao' }],
  ['bebida_soja_vainilla', '67949', 'lacteo', 'vegetal', [36, 3.3, 1, 2, 0.6], { medida: 'ml', alias: 'leche soja' }],
  ['bebida_almendra_calcio', '15648', 'lacteo', 'vegetal', [24, 0.5, 2.5, 1.3, 0.3], { medida: 'ml', alias: 'leche almendra', al: ['almendra'] }],
  ['batido_chocolate_0', '22967', 'lacteo', 'lacteo', [55, 3.3, 6, 1.6, 0.6], { medida: 'ml', ...U('brik', 'briks', 200) }],
  // Fiambres magros
  ['pechuga_pollo_lonchas', '8667', 'proteina', 'carne', [95, 18, 2, 1.5, 0], { alias: 'fiambre embutido' }],
  ['pavo_finas_lonchas', '17775', 'proteina', 'carne', [95, 19, 2, 1.2, 0], { alias: 'fiambre embutido' }],
  ['pavo_bajo_sal', '60243', 'proteina', 'carne', [95, 19, 2, 1.2, 0], { alias: 'fiambre embutido' }],
  ['pavo_extrafino', '21646', 'proteina', 'carne', [95, 19, 1.5, 1.5, 0], { alias: 'fiambre embutido' }],
  ['pollo_braseado_extrafino', '21647', 'proteina', 'carne', [100, 20, 1.5, 1.5, 0], { alias: 'fiambre embutido' }],
  ['tiras_pollo_horno', '56652', 'proteina', 'carne', [120, 25, 1, 2, 0], { alias: 'pollo cocinado' }],
  ['tiras_pollo_natural', '56661', 'proteina', 'carne', [110, 24, 0.5, 1.5, 0], { alias: 'pollo cocinado' }],
  ['pechuguita_pollo_asada', '22332', 'proteina', 'carne', [105, 22, 1, 1.5, 0], { alias: 'fiambre embutido' }],
  ['lomo_asado_lonchas', '22428', 'proteina', 'cerdo', [115, 22, 1, 2.5, 0], { alias: 'fiambre embutido' }],
  ['tiras_lomo_asado', '17762', 'proteina', 'cerdo', [120, 24, 0.5, 2.5, 0], {}],
  ['jamon_cocido_extrafino', '20273', 'proteina', 'cerdo', [100, 19, 1, 2.5, 0], { alias: 'jamon york fiambre' }],
  ['jamon_pavo', '56619', 'proteina', 'carne', [105, 17, 2, 3, 0], { alias: 'fiambre embutido' }],
  ['lomo_cerdo_cocido', '21601', 'proteina', 'cerdo', [115, 20, 1, 3.5, 0], { alias: 'fiambre embutido' }],
  ['lacon', '59216', 'proteina', 'cerdo', [130, 20, 0.5, 5.5, 0], { alias: 'fiambre embutido' }],
  ['longaniza_pavo', '16280', 'proteina', 'carne', [170, 26, 2, 6, 0], { alias: 'embutido' }],
  ['pavo_horno_lena', '53140', 'proteina', 'carne', [100, 20, 1.5, 1.5, 0], { alias: 'fiambre embutido' }],
  // Carne, pescado y otras proteínas
  ['solomillo_pollo', '2786', 'proteina', 'carne', [105, 23, 0, 1.2, 0], {}],
  ['pechugas_pollo_congeladas', '30006', 'proteina', 'carne', [110, 23, 0, 1.5, 0], {}],
  ['pechuga_pollo_entera', '3724', 'proteina', 'carne', [110, 23, 0, 1.5, 0], {}],
  ['jamoncitos_pollo', '2778', 'proteina', 'carne', [170, 18, 0, 11, 0], { rendimiento: 0.7 }],
  ['pavo_marinado', '14031', 'proteina', 'carne', [110, 21, 2, 2, 0], {}],
  ['solomillo_pavo_congelado', '25353', 'proteina', 'carne', [110, 21, 2, 2, 0], {}],
  ['burger_pollo', '2622', 'proteina', 'carne', [140, 16, 3, 7, 0], { ...U('hamburguesa', 'hamburguesas', 90), alias: 'hamburguesa' }],
  ['albondigas_pollo', '23632', 'proteina', 'carne', [150, 15, 5, 8, 0], {}],
  ['atun_aceite', '18002', 'proteina', 'pescado', [190, 25, 0, 10, 0], U('lata', 'latas', 56)],
  ['atun_tomate', '18037', 'proteina', 'pescado', [130, 17, 4, 5, 0], U('lata', 'latas', 80)],
  ['bonito_aceite', '18116', 'proteina', 'pescado', [200, 25, 0, 11, 0], U('lata', 'latas', 82)],
  ['caballa_tomate', '13632', 'proteina', 'pescado', [170, 17, 3, 10, 0], U('lata', 'latas', 120)],
  ['mejillones_escabeche', '18619', 'proteina', 'marisco', [170, 16, 4, 10, 0], U('lata', 'latas', 69)],
  ['mejillones_natural', '18620', 'proteina', 'marisco', [90, 17, 2, 2, 0], U('lata', 'latas', 69)],
  ['atun_rodajas_congelado', '24357', 'proteina', 'pescado', [110, 24, 0, 1, 0], { alias: 'atun fresco' }],
  ['merluza_cabo', '26760', 'proteina', 'pescado', [70, 16, 0, 0.6, 0], {}],
  ['carne_mejillon', '62396', 'proteina', 'marisco', [85, 14, 3, 2, 0], {}],
  ['surimi', '62502', 'proteina', 'pescado', [100, 7, 15, 1, 0], U('palito', 'palitos', 16)],
  ['seitan_lonchas', '19974', 'proteina', 'vegetal', [115, 22, 4, 1.5, 1], {}],
  ['soja_texturizada', '13926', 'proteina', 'vegetal', [340, 50, 15, 1.5, 15], {}],
  ['hummus_piquillo', '80862', 'grasa', 'vegetal', [250, 6.5, 12, 19, 5], {}],
  // Hidratos: pasta fresca, gnocchi, arroces, wraps, pan
  ['gnocchi', '6175', 'hidrato', 'vegetal', [150, 3.5, 32, 0.3, 1.5], { alias: 'ñoquis noquis' }],
  ['gnocchi_quesos', '86840', 'hidrato', 'lacteo', [190, 5, 30, 5.5, 1.5], { alias: 'ñoquis noquis' }],
  ['gnocchi_pollo_verduras', '61354', 'hidrato', 'carne', [110, 5, 15, 3, 1.5], { alias: 'ñoquis noquis congelado' }],
  ['tortellini_carne', '6142', 'hidrato', 'carne', [270, 12, 38, 7, 2], {}],
  ['ravioli_ricotta', '6143', 'hidrato', 'lacteo', [260, 10, 37, 7.5, 2], {}],
  ['tagliatelle_fresca', '6153', 'hidrato', 'huevo', [280, 11, 51, 3, 2], {}],
  ['spaghetti_integral', '35778', 'hidrato', 'vegetal', [350, 13, 64, 2.5, 8], { alias: 'espaguetis' }],
  ['pasta_lentejas', '6106', 'hidrato', 'vegetal', [340, 25, 50, 2, 8], {}],
  ['noodles_arroz', '35981', 'hidrato', 'vegetal', [360, 6, 82, 0.5, 1], { alias: 'fideos' }],
  ['noodles_ramen', '9861', 'hidrato', 'vegetal', [360, 10, 72, 2, 3], { alias: 'fideos' }],
  ['arroz_basmati', '5002', 'hidrato', 'vegetal', [355, 8, 78, 0.6, 1], {}],
  ['arroz_vaporizado', '5020', 'hidrato', 'vegetal', [355, 7.5, 78, 0.8, 1.5], {}],
  ['arroz_verduras_congelado', '12756', 'hidrato', 'vegetal', [110, 2.5, 21, 1.5, 1.5], { alias: 'microondas' }],
  ['arroz_tres_delicias', '86905', 'hidrato', 'huevo', [150, 4, 25, 3.5, 1.5], { alias: 'congelado' }],
  ['risotto_setas', '22720', 'hidrato', 'lacteo', [130, 3, 20, 4, 1], { alias: 'congelado microondas' }],
  ['bastones_batata', '15287', 'hidrato', 'vegetal', [155, 1.5, 24, 5.5, 3], { alias: 'boniato congelado air fryer' }],
  ['batata_microondas', '69465', 'hidrato', 'vegetal', [86, 1.6, 20, 0.1, 3], { alias: 'boniato' }],
  ['salteado_rustico', '21537', 'hidrato', 'vegetal', [95, 2, 14, 3, 2.5], { alias: 'patata boniato cebolla congelado' }],
  ['patatas_horno_airfryer', '7879', 'hidrato', 'vegetal', [140, 2.5, 21, 4.5, 2.5], { alias: 'patatas fritas congeladas' }],
  ['patatas_gajo', '61416', 'hidrato', 'vegetal', [150, 2.5, 22, 5.5, 2.5], { alias: 'patatas congeladas' }],
  ['ensaladilla_congelada', '61101', 'hidrato', 'vegetal', [60, 2.5, 9, 0.5, 3], {}],
  ['tortillas_avena', '80531', 'hidrato', 'vegetal', [300, 9, 48, 7, 6], { ...U('tortilla', 'tortillas', 45), alias: 'wrap fajita' }],
  ['tortillas_maiz_mexicanas', '86328', 'hidrato', 'vegetal', [220, 5, 45, 2.5, 5], { ...U('tortilla', 'tortillas', 26), alias: 'tacos wrap' }],
  ['tortillas_trigo', '80859', 'hidrato', 'vegetal', [310, 8.5, 50, 7.5, 2.5], { ...U('tortilla', 'tortillas', 45), alias: 'wrap fajita' }],
  ['pan_molde_100_integral', '82328', 'hidrato', 'vegetal', [240, 11, 38, 3.5, 7], U('rebanada', 'rebanadas', 30)],
  ['pan_molde_espelta', '14961', 'hidrato', 'vegetal', [245, 10, 40, 3.5, 7], U('rebanada', 'rebanadas', 30)],
  ['pan_tostado_integral', '86008', 'hidrato', 'vegetal', [400, 13, 65, 6.5, 10], U('rebanada', 'rebanadas', 8)],
  ['picos_integrales', '86215', 'hidrato', 'vegetal', [410, 13, 68, 8, 9], {}],
  ['cereales_corn_flakes', '22966', 'hidrato', 'vegetal', [375, 7.5, 84, 0.9, 3], {}],
  ['guisantes', '61215', 'hidrato', 'vegetal', [80, 5.5, 10, 0.5, 5], { alias: 'congelado' }],
  ['habas_baby', '61252', 'hidrato', 'vegetal', [75, 6, 8, 0.5, 6], { alias: 'congelado' }],
  ['maiz_congelado', '61289', 'hidrato', 'vegetal', [90, 3, 16, 1.5, 2.5], {}],
  // Fruta
  ['frutos_rojos_congelados', '61089', 'fruta', 'vegetal', [45, 1, 8, 0.3, 3.5], {}],
  ['fresas_congeladas', '61092', 'fruta', 'vegetal', [32, 0.7, 6, 0.3, 2], {}],
  ['arandanos_congelados', '61093', 'fruta', 'vegetal', [57, 0.7, 12, 0.3, 2.4], {}],
  ['mix_tropical_congelado', '86403', 'fruta', 'vegetal', [55, 0.8, 12, 0.3, 1.5], { alias: 'mango piña' }],
  ['fresa_platano_congelado', '14301', 'fruta', 'vegetal', [60, 1, 13, 0.3, 2], {}],
  ['aguacate_dados', '14283', 'grasa', 'vegetal', [160, 2, 2, 15, 7], { alias: 'congelado' }],
  ['melocoton_light', '15260', 'fruta', 'vegetal', [40, 0.5, 9, 0, 1], { alias: 'almibar conserva' }],
  ['pina_su_jugo', '15203', 'fruta', 'vegetal', [55, 0.4, 13, 0, 1], { alias: 'conserva' }],
  ['pina_rodajas', '3024', 'fruta', 'vegetal', [50, 0.5, 11, 0.1, 1.2], {}],
  ['mandarina', '5503', 'fruta', 'vegetal', [45, 0.8, 9.5, 0.2, 1.8], { rendimiento: 0.75, unidad: { n: 'mandarina', pl: 'mandarinas', g: 70 } }],
  ['mango', '3050', 'fruta', 'vegetal', [60, 0.8, 13, 0.4, 1.6], { rendimiento: 0.7, unidad: { n: 'mango', pl: 'mangos', g: 300 } }],
  ['uva_sin_semillas', '3313', 'fruta', 'vegetal', [69, 0.7, 16, 0.2, 0.9], { al: ['fruta_piel'] }],
  ['melon', '3506', 'fruta', 'vegetal', [34, 0.8, 7.5, 0.2, 0.9], { rendimiento: 0.6 }],
  ['granada', '3915', 'fruta', 'vegetal', [83, 1.7, 14, 1.2, 4], { rendimiento: 0.55 }],
  ['papaya', '3026', 'fruta', 'vegetal', [43, 0.5, 9.5, 0.3, 1.7], { rendimiento: 0.7 }],
  ['frambuesas', '5500', 'fruta', 'vegetal', [52, 1.2, 5.5, 0.7, 6.5], {}],
  // Verdura (mucha congelada: va directa a la sartén, al micro o a la air fryer)
  ['cebolla_congelada', '13568', 'verdura', 'vegetal', [35, 1, 6.5, 0.1, 1.7], {}],
  ['pimiento_congelado', '35221', 'verdura', 'vegetal', [25, 1, 4, 0.3, 1.8], { alias: 'rojo verde' }],
  ['salteado_verduras', '61065', 'verdura', 'vegetal', [45, 2, 6, 1, 2.5], { alias: 'congelado' }],
  ['parrillada_verduras', '61034', 'verdura', 'vegetal', [35, 1.5, 4, 1, 2.5], { alias: 'congelado' }],
  ['verduras_asadas', '16334', 'verdura', 'vegetal', [50, 1.5, 6, 2, 2.5], { alias: 'congelado' }],
  ['menestra', '52534', 'verdura', 'vegetal', [40, 2.5, 5, 0.5, 3], { alias: 'congelado' }],
  ['coliflor_congelada', '61231', 'verdura', 'vegetal', [25, 2, 3, 0.3, 2], {}],
  ['migas_coliflor', '35773', 'verdura', 'vegetal', [25, 2, 3, 0.3, 2], { alias: 'arroz de coliflor' }],
  ['coliflor_brocoli_zanahoria', '61006', 'verdura', 'vegetal', [30, 2, 4, 0.3, 2.5], { alias: 'congelado' }],
  ['judia_verde_redonda', '61282', 'verdura', 'vegetal', [28, 1.8, 4, 0.2, 3], { alias: 'congelado' }],
  ['setas_salteado', '61025', 'verdura', 'vegetal', [25, 2.5, 2, 0.5, 2], { alias: 'congelado' }],
  ['esparrago_congelado', '61238', 'verdura', 'vegetal', [22, 2.5, 2, 0.2, 2], {}],
  ['coles_bruselas', '61248', 'verdura', 'vegetal', [40, 3.5, 5, 0.4, 4], { alias: 'congelado' }],
  ['alcachofa_congelada', '61205', 'verdura', 'vegetal', [35, 2.5, 4, 0.2, 5], {}],
  ['espinaca_porciones', '35781', 'verdura', 'vegetal', [23, 2.9, 1.4, 0.4, 2.2], { alias: 'congelado' }],
  ['pisto_congelado', '35653', 'verdura', 'vegetal', [60, 1.3, 6, 3, 2], {}],
  ['calabaza_trozos', '3527', 'verdura', 'vegetal', [30, 1, 6, 0.1, 1.5], {}],
  ['brocoli_fresco', '69580', 'verdura', 'vegetal', [34, 2.8, 4.5, 0.4, 2.6], { rendimiento: 0.7 }],
  ['puerro', '68408', 'verdura', 'vegetal', [30, 1.5, 5.5, 0.3, 1.8], { rendimiento: 0.6 }],
  ['setas_frescas', '69653', 'verdura', 'vegetal', [25, 2.5, 2, 0.4, 2], {}],
  ['espinacas_frescas', '69730', 'verdura', 'vegetal', [23, 2.9, 1.4, 0.4, 2.2], {}],
  ['remolacha_cocida', '69523', 'verdura', 'vegetal', [45, 1.5, 8, 0.1, 2.5], {}],
  ['judias_verdes_bote', '16313', 'verdura', 'vegetal', [22, 1.5, 3, 0.2, 2.5], { alias: 'conserva' }],
  // Platos y salteados con proteína (congelados)
  ['relleno_fajitas_pollo', '86820', 'proteina', 'carne', [80, 9, 5, 2.5, 1.5], { alias: 'congelado wrap' }],
  ['salteado_pollo', '13404', 'proteina', 'carne', [85, 8, 6, 3, 2], { alias: 'congelado' }],
  ['salteado_gambas_esparragos', '35900', 'proteina', 'marisco', [55, 5, 3, 2.5, 1.5], { alias: 'congelado' }],
  // Despensa y caprichos
  ['mermelada_fresa', '86755', 'otros', 'vegetal', [250, 0.4, 61, 0.1, 1], { alias: 'confitura' }],
  ['confitura_melocoton_0', '15094', 'otros', 'vegetal', [155, 0.5, 37, 0.2, 1], { alias: 'mermelada sin azucar' }],
  ['gelatina_0', '35683', 'otros', 'vegetal', [5, 1, 0.2, 0, 0], U('tarrina', 'tarrinas', 100)],
  ['salsa_light', '15793', 'grasa', 'huevo', [290, 0.5, 7, 29, 0], { alias: 'mayonesa' }],
  ['ketchup', '23579', 'otros', 'vegetal', [110, 1.2, 25, 0.1, 0.5], {}],
  ['salsa_barbacoa', '17346', 'otros', 'vegetal', [150, 1, 35, 0.3, 0.5], {}],
  ['chocolate_negro_85', '12524', 'grasa', 'vegetal', [590, 11, 14, 51, 14], {}],
];

const FRUTOS_SECOS = ['almendra', 'avellana', 'nueces', 'anacardo', 'pistacho', 'cacahuete'];
// Alérgenos que declara Mercadona («Contiene …», no las trazas)
const ALERGENOS = [
  [/gluten|trigo|cebada|centeno|espelta|avena/i, 'gluten'],
  [/leche|lactosa/i, 'lactosa'],
  [/huevo/i, 'huevo'],
  [/soja/i, 'soja'],
  // Cada fruto seco por separado (hay quien tolera unos y otros no); «frutos de cáscara» sin más = todos
  [/almendra/i, 'almendra'], [/avellana/i, 'avellana'], [/\bnuez|nueces/i, 'nueces'], [/anacardo/i, 'anacardo'],
  [/pistacho/i, 'pistacho'], [/cacahuete/i, 'cacahuete'],
  [/pescado/i, 'pescado'],
  [/crust[aá]ceo|molusco/i, 'marisco'],
];
function alergenos(texto = '') {
  // Solo cuenta lo que contiene: fuera las frases «Libre de …», «No contiene …» y las trazas
  const contiene = String(texto).replace(/<[^>]+>/g, '').split(/Puede contener|Trazas|trazas/)[0]
    .split(/\.\s*/).filter((f) => !/^\s*(libre de|no contiene|sin )/i.test(f)).join('. ');
  const al = ALERGENOS.filter(([re]) => re.test(contiene)).map(([, a]) => a);
  if (/frutos de c[aá]scara/i.test(contiene) && !al.some((a) => FRUTOS_SECOS.includes(a))) al.push('frutos_secos');
  return [...new Set(al)];
}

async function json(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'MiNutricionista/1.0 (uso personal)' } });
      if (r.ok) return await r.json();
      if (r.status === 404) return null;
    } catch { /* reintento */ }
    await espera(1500 * (i + 1));
  }
  return null;
}

const redondea = (x) => Math.round(x * 10) / 10;
const productos = {};
const informe = [];
for (const [clave, id, grupo, dieta, ref, { al: alExtra = [], ...resto }] of [...LISTA, ...LISTA_AMPLIA.map(([k, i, g, d, r, x = {}]) => [k, i, g, d, r, { ...x, catalogo: true }])]) {
  const m = await json(`https://tienda.mercadona.es/api/products/${id}/?lang=es&wh=mad1`);
  let macros = { kcal: ref[0], p: ref[1], c: ref[2], g: ref[3], f: ref[4] };
  let fuente = 'referencia';
  if (m?.ean) {
    const off = await json(`https://world.openfoodfacts.org/api/v2/product/${m.ean}.json?fields=nutriments`);
    const n = off?.product?.nutriments;
    if (n && n['energy-kcal_100g'] != null && n.proteins_100g != null && n.carbohydrates_100g != null && n.fat_100g != null) {
      const o = { kcal: n['energy-kcal_100g'], p: n.proteins_100g, c: n.carbohydrates_100g, g: n.fat_100g, f: n.fiber_100g ?? ref[4] };
      const calc = o.p * 4 + o.c * 4 + o.g * 9 + (o.f || 0) * 2;
      // Se acepta si es coherente y no se aleja una barbaridad de la referencia
      if (o.kcal > 0 && Math.abs(calc - o.kcal) / o.kcal < 0.2 && Math.abs(o.kcal - ref[0]) / ref[0] < 0.45) { macros = o; fuente = 'etiqueta'; }
    }
    await espera(400);
  }
  productos[clave] = {
    nombre: (m?.display_name || clave).replace(/\s+/g, ' ').trim(),
    kcal: Math.round(macros.kcal), p: redondea(macros.p), c: redondea(macros.c), g: redondea(macros.g), f: redondea(macros.f || 0),
    grupo, dieta, al: [...new Set([...(m ? alergenos(m.nutrition_information?.allergens) : []), ...alExtra])], mercadona: id, ...resto,
  };
  informe.push(`${fuente === 'etiqueta' ? '✓' : '·'} ${clave}: ${productos[clave].nombre} (${fuente})`);
}

await writeFile(path.join(RAIZ, 'src/data/productos.js'), `// Generado por scripts/productos-mercadona.mjs — productos de Mercadona con los macros de su etiqueta
// (Open Food Facts) y los alérgenos que declara la tienda. No editar a mano.
export const PRODUCTOS = ${JSON.stringify(productos, null, 1)};
`);
console.log(informe.join('\n'));
