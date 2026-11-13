/**
 * FORAM Eles — Script Principal
 * 1. Efeito do 1º Container (Fundo Branco estilo Antigravity):
 *    - Desfoque colorido lento e orgânico.
 *    - Acompanha o mouse suavemente.
 *    - Quando o mouse sai ou para, permanece na última posição e se movimenta bem devagar.
 * 2. Efeito do 2º Container (Vídeo Expansivo no Scroll):
 *    - Inicia em 60% da tela já visível a partir do 1º container.
 *    - Cresce até 100% da tela conforme rola para baixo.
 *    - Permanece em 100% da tela por 2 scrolls completos (200vh).
 *    - Depois reduz suavemente e segue descendo a página.
 */

(function () {
  const canvas = document.getElementById('breathing-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let initialized = false;

  // Âncora persistente: nunca reseta para o centro quando o mouse sai da tela!
  const anchor = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    isInside: false,
    lastMoveTime: 0,
    dispersion: 0.75,
    targetDispersion: 0.75
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
      anchor.y = height * 0.46;
      anchor.targetX = width * 0.5;
      anchor.targetY = height * 0.46;
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

  // Cores vivas suaves sobre o fundo branco (estilo Antigravity)
  const colorConfigs = [
    { r: 27,  g: 98,  b: 248, baseRadius: 310, breatheSpeed: 0.00045, driftSpeedX: 0.00018, driftSpeedY: 0.00022, spreadX: 0.28, spreadY: 0.24, phase: 0.0 }, // Azul Royal FORAM Eles
    { r: 139, g: 92,  b: 246, baseRadius: 280, breatheSpeed: 0.00038, driftSpeedX: 0.00015, driftSpeedY: 0.00019, spreadX: 0.32, spreadY: 0.26, phase: 1.6 }, // Violeta suave
    { r: 14,  g: 185, b: 240, baseRadius: 260, breatheSpeed: 0.00052, driftSpeedX: 0.00021, driftSpeedY: 0.00017, spreadX: 0.26, spreadY: 0.22, phase: 3.1 }, // Ciano luminoso
    { r: 255, g: 105, b: 85,  baseRadius: 245, breatheSpeed: 0.00042, driftSpeedX: 0.00017, driftSpeedY: 0.00021, spreadX: 0.30, spreadY: 0.25, phase: 4.5 }, // Coral vivo
    { r: 250, g: 190, b: 50,  baseRadius: 215, breatheSpeed: 0.00055, driftSpeedX: 0.00023, driftSpeedY: 0.00018, spreadX: 0.22, spreadY: 0.20, phase: 5.7 }  // Âmbar quente
  ];

  const blobs = colorConfigs.map((cfg, i) => {
    const angle = (i / colorConfigs.length) * Math.PI * 2;
    return {
      ...cfg,
      x: anchor.x + Math.cos(angle) * (width * 0.14),
      y: anchor.y + Math.sin(angle) * (height * 0.14)
    };
  });

  // Escuta o mouse na janela toda quando estiver perto do topo para não dar corte nas bordas
  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    // Se o mouse está dentro da área visível do 1º container
    if (relY >= -40 && relY <= rect.height + 40 && relX >= 0 && relX <= rect.width) {
      anchor.targetX = relX;
      anchor.targetY = relY;
      anchor.isInside = true;
      anchor.lastMoveTime = performance.now();
      anchor.targetDispersion = 0.28;
    } else {
      // Saiu do container (ex: foi para as abas do navegador):
      // Permanece na última posição registrada e apenas dispersa lentamente!
      anchor.isInside = false;
      anchor.targetDispersion = 0.78;
    }
  });

  document.addEventListener('mouseleave', () => {
    // Saiu da janela do navegador: mantém targetX e targetY exatamente onde parou
    anchor.isInside = false;
    anchor.targetDispersion = 0.80;
  });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const relX = e.touches[0].clientX - rect.left;
      const relY = e.touches[0].clientY - rect.top;
      if (relY >= 0 && relY <= rect.height) {
        anchor.targetX = relX;
        anchor.targetY = relY;
        anchor.isInside = true;
        anchor.lastMoveTime = performance.now();
        anchor.targetDispersion = 0.28;
      }
    }
  }, { passive: true });

  function animate(time) {
    ctx.clearRect(0, 0, width, height);

    // Se o cursor ficou parado por mais de 1.2s, começa a se espalhar bem devagarzinho ali mesmo
    if (anchor.isInside && time - anchor.lastMoveTime > 1200) {
      anchor.targetDispersion = 0.68;
    }

    // Interpolação super lenta e fluida (sem voltas bruscas)
    anchor.x += (anchor.targetX - anchor.x) * 0.016;
    anchor.y += (anchor.targetY - anchor.y) * 0.016;
    anchor.dispersion += (anchor.targetDispersion - anchor.dispersion) * 0.006;

    blobs.forEach((blob, i) => {
      const maxOffsetX = Math.min(width, 1100) * blob.spreadX * anchor.dispersion;
      const maxOffsetY = Math.min(height, 800) * blob.spreadY * anchor.dispersion;

      const organicOffsetX =
        Math.cos(time * blob.driftSpeedX + blob.phase) * maxOffsetX +
        Math.sin(time * (blob.driftSpeedX * 0.6) + i * 1.7) * (maxOffsetX * 0.35);

      const organicOffsetY =
        Math.sin(time * blob.driftSpeedY + blob.phase) * maxOffsetY +
        Math.cos(time * (blob.driftSpeedY * 0.65) + i * 1.7) * (maxOffsetY * 0.35);

      const desiredX = anchor.x + organicOffsetX;
      const desiredY = anchor.y + organicOffsetY;

      blob.x += (desiredX - blob.x) * 0.014;
      blob.y += (desiredY - blob.y) * 0.014;

      const breatheWave = Math.sin(time * blob.breatheSpeed + blob.phase);
      const currentRadius = blob.baseRadius * (1 + breatheWave * 0.16);
      const alpha = 0.34 + breatheWave * 0.08;

      const grad = ctx.createRadialGradient(
        blob.x,
        blob.y,
        currentRadius * 0.05,
        blob.x,
        blob.y,
        currentRadius
      );

      grad.addColorStop(0, `rgba(${blob.r}, ${blob.g}, ${blob.b}, ${alpha})`);
      grad.addColorStop(0.55, `rgba(${blob.r}, ${blob.g}, ${blob.b}, ${alpha * 0.45})`);
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

/**
 * 2º CONTAINER: Coreografia de Scroll do Vídeo
 * - Começa ocupando 60% da tela enquanto o usuário está no 1º container
 * - Cresce até 100% da tela conforme rola para baixo
 * - Permanece travado em 100% da tela por 2 scrolls completos (200vh)
 * - Depois reduz suavemente para 60% e continua descendo a tela
 */
(function () {
  const track = document.getElementById('destaque');
  const videoCard = document.getElementById('video-expand-card');
  if (!track || !videoCard) return;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function updateVideoScale() {
    const rect = track.getBoundingClientRect();
    const vh = window.innerHeight;
    // Distância total que o container fica "sticky" (track.height - 100vh)
    const totalScrollable = track.offsetHeight - vh;
    // Quanto já rolamos dentro da área do track (incluindo a aproximação antes de colar no topo)
    const scrolled = -rect.top;

    // Fase A: Aproximação e crescimento (de -0.45 * vh até 0.75 * vh -> cresce de 60% até 100%)
    const growStart = -vh * 0.35;
    const growEnd = vh * 0.75;

    // Fase B: Permanece em 100% da tela por 2 scrolls inteiros (2.0 * vh)
    const holdEnd = growEnd + vh * 2.0;

    // Fase C: Reduz de 100% para 62% no trecho final antes de descolar e descer
    const shrinkEnd = totalScrollable;

    let factor = 0; // 0 = 60% da tela | 1 = 100% da tela

    if (scrolled <= growStart) {
      factor = 0;
    } else if (scrolled > growStart && scrolled < growEnd) {
      const t = (scrolled - growStart) / (growEnd - growStart);
      // Curva suave ease-in-out
      factor = t * t * (3 - 2 * t);
    } else if (scrolled >= growEnd && scrolled <= holdEnd) {
      // Travado em 100% durante 2 scrolls completos!
      factor = 1;
    } else if (scrolled > holdEnd && scrolled < shrinkEnd) {
      const t = clamp((scrolled - holdEnd) / (shrinkEnd - holdEnd), 0, 1);
      const smoothT = t * t * (3 - 2 * t);
      factor = 1 - smoothT;
    } else {
      factor = 0;
    }

    const isMobile = window.innerWidth <= 720;
    const minW = isMobile ? 86 : 60; // 60% da largura da tela no desktop
    const minH = isMobile ? 54 : 62; // 62% da altura da tela

    const currentW = minW + (100 - minW) * factor;
    const currentH = minH + (100 - minH) * factor;
    const currentRadius = 28 * (1 - factor);

    videoCard.style.width = `${currentW}vw`;
    videoCard.style.height = `${currentH}vh`;
    videoCard.style.borderRadius = `${currentRadius}px`;
  }

  window.addEventListener('scroll', () => {
    requestAnimationFrame(updateVideoScale);
  }, { passive: true });

  window.addEventListener('resize', updateVideoScale);
  updateVideoScale();
})();

// Interações de UI: Navbar, Menu Mobile, Filtro de Portfólio e Scroll Reveal
document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  // Filtro de Portfólio (Cartas estilo Apple)
  const filterBtns = document.querySelectorAll('.filter-btn');
  const portfolioItems = document.querySelectorAll('.apple-stack-item');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      portfolioItems.forEach((item) => {
        const category = item.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // Scroll Reveal
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.12 }
  );

  reveals.forEach((el) => observer.observe(el));
});
