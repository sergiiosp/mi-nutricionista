<script>
  // Confeti ligero en canvas para celebrar (día completado, logros)
  import { fiesta } from '../stores/ui.js';

  let lienzo;
  let primera = true;
  $effect(() => {
    $fiesta;
    if (primera) { primera = false; return; }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !lienzo) return;
    const ctx = lienzo.getContext('2d');
    const W = (lienzo.width = innerWidth);
    const H = (lienzo.height = innerHeight);
    const colores = ['#12a86b', '#ff6f56', '#f5a524', '#4b8cf5', '#8576ef', '#ffd2c9'];
    const piezas = Array.from({ length: 110 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 80, y: H * 0.35,
      vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 13 - 4,
      r: Math.random() * 6 + 4, giro: Math.random() * 6, c: colores[Math.floor(Math.random() * colores.length)],
    }));
    let t = 0;
    let id;
    const paso = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of piezas) {
        p.vy += 0.38; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.giro += 0.2;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.giro);
        ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
      }
      if (++t < 140) id = requestAnimationFrame(paso);
      else ctx.clearRect(0, 0, W, H);
    };
    paso();
    return () => cancelAnimationFrame(id);
  });
</script>

<canvas bind:this={lienzo} class="confeti" aria-hidden="true"></canvas>

<style>
  .confeti { position: fixed; inset: 0; pointer-events: none; z-index: 70; }
</style>
