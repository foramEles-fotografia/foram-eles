/**
 * FORAM Eles — Script Principal
 * 1. Efeito do 1º Container (#breathing-canvas):
 *    - Degradê colorido fluido, muito desfocado e sem excesso de laranja.
 *    - Paleta harmônica: Azul Royal (#1b62f8), Ciano Celeste, Verde-Água/Esmeralda,
 *      Violeta/Índigo e Lilás/Magenta suave que se misturam criando degradê entre si.
 *    - Acompanha o mouse de forma fluida e sem atraso pesado.
 *    - Quando o mouse sai do container ou para, permanece na última posição e
 *      continua se movendo devagarzinho (sem nunca resetar para o centro).
 * 2. Fallback para o vídeo do 2º container caso o navegador não suporte view-timeline CSS.
 * 3. Fechamento de álbuns com tecla ESC.
 */

(function () {
  const canvas = document.getElementById('breathing-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let initialized = false;

  const anchor = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    isMoving: false,
    lastMoveTime: 0,
    dispersion: 0.56,
    targetDispersion: 0.56
  };

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const prevWidth = width || rect.width;
    const prevHeight = height || rect.height;

    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!initialized) {
      anchor.x = width * 0.5;
      anchor.y = height * 0.48;
      anchor.targetX = width * 0.5;
      anchor.targetY = height * 0.48;
      initialized = true;
    } else {
      anchor.x = (anchor.x / prevWidth) * width;
      anchor.y = (anchor.y / prevHeight) * height;
      anchor.targetX = (anchor.targetX / prevWidth) * width;
      anchor.targetY = (anchor.targetY / prevHeight) * height;
    }
  }

  window.addEventListener('resize', resize);
  resize();

  // Paleta com degradê rico entre cores (sem excesso de laranja):
  // Azul Royal + Ciano Celeste + Esmeralda/Verde-Água + Violeta Profundo + Magenta/Lilás
  const colorConfigs = [
    { r: 27,  g: 98,  b: 248, baseRadius: 420, breatheSpeed: 0.00032, driftSpeedX: 0.00011, driftSpeedY: 0.00013, spreadX: 0.22, spreadY: 0.20, phase: 0.0 }, // Azul Royal FORAM Eles
    { r: 0,   g: 198, b: 255, baseRadius: 390, breatheSpeed: 0.00028, driftSpeedX: 0.00010, driftSpeedY: 0.00012, spreadX: 0.25, spreadY: 0.22, phase: 1.2 }, // Ciano Celeste
    { r: 6,   g: 214, b: 160, baseRadius: 360, breatheSpeed: 0.00035, driftSpeedX: 0.00012, driftSpeedY: 0.00009, spreadX: 0.24, spreadY: 0.21, phase: 2.4 }, // Verde-Água / Esmeralda Luminoso
    { r: 124, g: 58,  b: 237, baseRadius: 400, breatheSpeed: 0.00026, driftSpeedX: 0.00009, driftSpeedY: 0.00011, spreadX: 0.26, spreadY: 0.23, phase: 3.6 }, // Violeta / Índigo
    { r: 217, g: 70,  b: 239, baseRadius: 350, breatheSpeed: 0.00030, driftSpeedX: 0.00011, driftSpeedY: 0.00010, spreadX: 0.23, spreadY: 0.20, phase: 4.8 }, // Lilás / Magenta Suave
    { r: 244, g: 63,  b: 110, baseRadius: 290, breatheSpeed: 0.00034, driftSpeedX: 0.00012, driftSpeedY: 0.00011, spreadX: 0.20, spreadY: 0.18, phase: 5.9 }  // Rosa Quartzo (toque quente sutil)
  ];

  const blobs = colorConfigs.map((cfg, i) => {
    const angle = (i / colorConfigs.length) * Math.PI * 2;
    return {
      ...cfg,
      x: anchor.x + Math.cos(angle) * (width * 0.12),
      y: anchor.y + Math.sin(angle) * (height * 0.12)
    };
  });

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    if (relY >= 0 && relY <= rect.height && relX >= 0 && relX <= rect.width) {
      anchor.targetX = relX;
      anchor.targetY = relY;
      anchor.isMoving = true;
      anchor.lastMoveTime = performance.now();
      anchor.targetDispersion = 0.24;
    } else {
      // Saiu do container: não reseta targetX/targetY! Continua de onde parou.
      anchor.isMoving = false;
      anchor.targetDispersion = 0.62;
    }
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    anchor.isMoving = false;
    anchor.targetDispersion = 0.62;
  });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const relX = e.touches[0].clientX - rect.left;
      const relY = e.touches[0].clientY - rect.top;
      if (relY >= 0 && relY <= rect.height && relX >= 0 && relX <= rect.width) {
        anchor.targetX = relX;
        anchor.targetY = relY;
        anchor.isMoving = true;
        anchor.lastMoveTime = performance.now();
        anchor.targetDispersion = 0.24;
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    anchor.isMoving = false;
    anchor.targetDispersion = 0.62;
  });

  function animate(time) {
    ctx.clearRect(0, 0, width, height);

    if (anchor.isMoving && time - anchor.lastMoveTime > 420) {
      anchor.isMoving = false;
      anchor.targetDispersion = 0.62;
    }

    // Acompanha o mouse com fluidez imediata (0.14) e move devagar quando parado (0.02)
    const followSpeed = anchor.isMoving ? 0.14 : 0.02;
    anchor.x += (anchor.targetX - anchor.x) * followSpeed;
    anchor.y += (anchor.targetY - anchor.y) * followSpeed;

    const dispersionSpeed = anchor.isMoving ? 0.065 : 0.003;
    anchor.dispersion += (anchor.targetDispersion - anchor.dispersion) * dispersionSpeed;

    blobs.forEach((blob, i) => {
      const maxOffsetX = Math.min(width, 1050) * blob.spreadX * anchor.dispersion;
      const maxOffsetY = Math.min(height, 740) * blob.spreadY * anchor.dispersion;

      const organicOffsetX =
        Math.cos(time * blob.driftSpeedX + blob.phase) * maxOffsetX +
        Math.sin(time * (blob.driftSpeedX * 0.65) + i * 1.5) * (maxOffsetX * 0.35);

      const organicOffsetY =
        Math.sin(time * blob.driftSpeedY + blob.phase) * maxOffsetY +
        Math.cos(time * (blob.driftSpeedY * 0.7) + i * 1.5) * (maxOffsetY * 0.35);

      const desiredX = anchor.x + organicOffsetX;
      const desiredY = anchor.y + organicOffsetY;

      const blobFollow = anchor.isMoving ? 0.11 : 0.018;
      blob.x += (desiredX - blob.x) * blobFollow;
      blob.y += (desiredY - blob.y) * blobFollow;

      const breatheWave = Math.sin(time * blob.breatheSpeed + blob.phase);
      const currentRadius = blob.baseRadius * (1 + breatheWave * 0.16);
      const alpha = 0.68 + breatheWave * 0.08;

      const grad = ctx.createRadialGradient(
        blob.x,
        blob.y,
        currentRadius * 0.02,
        blob.x,
        blob.y,
        currentRadius
      );

      grad.addColorStop(0, `rgba(${blob.r}, ${blob.g}, ${blob.b}, ${alpha})`);
      grad.addColorStop(0.42, `rgba(${blob.r}, ${blob.g}, ${blob.b}, ${alpha * 0.62})`);
      grad.addColorStop(0.75, `rgba(${blob.r}, ${blob.g}, ${blob.b}, ${alpha * 0.25})`);
      grad.addColorStop(1, `rgba(${blob.r}, ${blob.g}, ${blob.b}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, currentRadius, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();

// Garante reprodução do vídeo e suporte a fechar álbuns com ESC
document.addEventListener('DOMContentLoaded', () => {
  const videoEl = document.getElementById('showcase-video');
  if (videoEl) {
    videoEl.muted = true;
    const playVideo = () => videoEl.play().catch(() => {});
    playVideo();
    window.addEventListener('scroll', playVideo, { once: true, passive: true });
    window.addEventListener('click', playVideo, { once: true, passive: true });
  }

  // Permite fechar qualquer álbum aberto apertando ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.location.hash.startsWith('#album-')) {
      window.location.hash = '#fechar-album';
    }
  });
});
