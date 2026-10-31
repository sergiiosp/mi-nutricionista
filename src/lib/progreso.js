// Seguimiento del peso: tendencia y recomendación de ajuste de calorías.

const DIA_MS = 86400000;

function fechaMs(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Pendiente (kg/semana) por regresión lineal de los registros de los últimos `ventanaDias`. */
export function tendencia(pesos, ventanaDias = 21) {
  if (pesos.length < 2) return null;
  const ordenados = [...pesos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const ultimo = fechaMs(ordenados.at(-1).fecha);
  const datos = ordenados.filter((p) => ultimo - fechaMs(p.fecha) <= ventanaDias * DIA_MS);
  if (datos.length < 2) return null;
  const xs = datos.map((p) => (fechaMs(p.fecha) - ultimo) / DIA_MS);
  const ys = datos.map((p) => p.peso);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  if (den === 0) return null;
  const pendienteDia = num / den;
  const dias = (ultimo - fechaMs(datos[0].fecha)) / DIA_MS;
  return {
    kgSemana: Math.round(pendienteDia * 7 * 100) / 100,
    dias,
    registros: datos.length,
    pesoTendencia: Math.round((my + pendienteDia * (0 - mx)) * 10) / 10,
  };
}

/**
 * Compara el ritmo real con el esperado y propone un ajuste de kcal.
 * Necesita al menos 2 semanas de datos para no reaccionar a fluctuaciones de agua.
 */
export function recomendacion(pesos, perfil, objetivos) {
  const t = tendencia(pesos);
  if (!t || t.dias < 13 || t.registros < 4) {
    return {
      tipo: 'info',
      texto: 'Pésate 2-3 veces por semana, en ayunas y después de ir al baño. Con dos semanas de datos podré decirte si conviene ajustar las calorías.',
    };
  }
  const peso = pesos.at(-1).peso;
  const pct = (t.kgSemana / peso) * 100; // % de peso corporal por semana
  const { objetivo } = perfil;
  const ritmo = `${t.kgSemana > 0 ? '+' : ''}${t.kgSemana.toFixed(2).replace('.', ',')} kg/semana`;

  if (objetivo === 'perder') {
    if (pct > -0.2) return { tipo: 'ajuste', ajuste: -150, texto: `Tu peso apenas baja (${ritmo}). Te propongo reducir 150 kcal al día.` };
    if (pct < -1.1) return { tipo: 'ajuste', ajuste: 150, texto: `Estás perdiendo peso muy rápido (${ritmo}); puedes perder músculo. Te propongo subir 150 kcal al día.` };
    return { tipo: 'ok', texto: `Vas a buen ritmo (${ritmo}). Seguimos igual.` };
  }
  if (objetivo === 'ganar') {
    if (pct < 0.1) return { tipo: 'ajuste', ajuste: 150, texto: `Tu peso no sube (${ritmo}). Te propongo añadir 150 kcal al día.` };
    if (pct > 0.6) return { tipo: 'ajuste', ajuste: -100, texto: `Estás subiendo demasiado rápido (${ritmo}); acumularás más grasa de la necesaria. Te propongo bajar 100 kcal.` };
    return { tipo: 'ok', texto: `Ganancia controlada (${ritmo}). Perfecto para ganar músculo.` };
  }
  if (objetivo === 'recomposicion') {
    if (pct > 0.25) return { tipo: 'ajuste', ajuste: -100, texto: `Tu peso sube (${ritmo}). Para recomponer te propongo bajar 100 kcal.` };
    if (pct < -0.6) return { tipo: 'ajuste', ajuste: 100, texto: `Estás bajando bastante (${ritmo}). Te propongo subir 100 kcal para proteger el músculo.` };
    return { tipo: 'ok', texto: `Peso estable (${ritmo}). Fíjate también en tus fotos y en tus marcas de entreno.` };
  }
  // mantener
  if (Math.abs(pct) > 0.3) {
    const ajuste = pct > 0 ? -100 : 100;
    return { tipo: 'ajuste', ajuste, texto: `Tu peso se mueve (${ritmo}). Te propongo ${ajuste > 0 ? 'subir' : 'bajar'} 100 kcal para mantenerte.` };
  }
  return { tipo: 'ok', texto: `Peso estable (${ritmo}). ¡Bien!` };
}
