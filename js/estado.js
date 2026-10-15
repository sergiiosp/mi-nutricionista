// Estado persistente de la app (en localStorage del dispositivo).

const CLAVE = 'mi-nutricionista:v1';

const VACIO = () => ({
  version: 1,
  perfil: null,
  plan: null,
  hechas: {}, // "fecha|franja" → true
  compra: { marcados: {}, soloRestantes: false },
  pesos: [], // { fecha, peso, cintura? }
});

function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) return { ...VACIO(), ...JSON.parse(crudo) };
  } catch {
    // almacenamiento no disponible o datos corruptos: se empieza de cero
  }
  return VACIO();
}

export const estado = cargar();

export function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    // sin almacenamiento (modo privado): la app funciona, pero no recuerda nada
  }
}

export function reiniciar() {
  Object.assign(estado, VACIO());
  guardar();
}

export function exportar() {
  return JSON.stringify(estado, null, 2);
}

export function importar(texto) {
  const datos = JSON.parse(texto);
  if (!datos || typeof datos !== 'object' || !('perfil' in datos)) throw new Error('El archivo no parece una copia de seguridad de la app');
  Object.assign(estado, VACIO(), datos);
  guardar();
}
