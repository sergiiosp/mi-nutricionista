// Curvas de movimiento de la app (las mismas que --ease-out y --ease-drawer en app.css),
// como funciones para las transiciones de Svelte.

/** Curva cubic-bezier(x1, y1, x2, y2) → función t ∈ [0, 1] → progreso. */
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const x = (t) => ((ax * t + bx) * t + cx) * t;
  const y = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (p) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    // Newton-Raphson para encontrar t con x(t) = p; bisección si no converge
    let t = p;
    for (let i = 0; i < 6; i++) {
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      const t2 = t - (x(t) - p) / d;
      if (Math.abs(t2 - t) < 1e-6) { t = t2; break; }
      t = t2;
    }
    if (t < 0 || t > 1 || Math.abs(x(t) - p) > 1e-4) {
      let a = 0, b = 1;
      for (let i = 0; i < 30; i++) { t = (a + b) / 2; if (x(t) < p) a = t; else b = t; }
    }
    return y(t);
  };
}

/** Interfaz: arranca rápido y frena suave. */
export const salida = bezier(0.23, 1, 0.32, 1);
/** Hojas y cajones (la de iOS). */
export const cajon = bezier(0.32, 0.72, 0, 1);
