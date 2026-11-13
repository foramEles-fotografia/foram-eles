/**
 * FORAM Eles — Script Principal
 * 1. Efeito do Primeiro Container: Cores vivas abstratas desfocadas ("respirando")
 *    - Movimento lento, calmo e orgânico.
 *    - Acompanha o mouse suavemente.
 *    - Quando o mouse para ou sai do container (ex.: indo para as abas do navegador),
 *      NÃO reseta para o centro: permanece na última posição conhecida e vai se
 *      dispersando bem devagarzinho a partir dali.
 * 2. Filtro de Portfólio, Scroll Reveal e Menu Mobile.
 */

(function () {
  const canvas = document.getElementById('breathing-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let initialized = false;

  // Âncora persistente: guarda a posição onde o cluster de cores gravita.
  // Nunca reseta ao sair da tela — permanece onde o cursor esteve por último.
  const anchor = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    isInside: false,
    lastMoveTime: 0,
    // dispersion: 0.25 = mais próximo do mouse em movimento; 1.0 = espalhado suavemente pelo container
    dispersion: 0.85,
    targetDispersion: 0.85
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
      anchor.y = height * 0.5;
      anchor.targetX = width * 0.5;
      anchor.targetY = height * 0.5;
      initialized = true;
    } else {
      // Mantém a proporção relativa caso a janela seja redimensionada
      anchor.x = (anchor.x / prevWidth) * width;
      anchor.y = (anchor.y / prevHeight) * height;
      anchor.targetX = (anchor.targetX / prevWidth) * width;
      anchor.targetY = (anchor.targetY / prevHeight) * height;
    }
  }

  window.addEventListener('resize', resize);
  resize();

  // Paleta de cores vivas (exclusiva do 1º container) com movimentos bem lentos
  const colorConfigs = [
    { r: 27,  g: 98,  b: 248, baseRadius: 320, breatheSpeed: 0.00055, driftSpeedX: 0.00022, driftSpeedY: 0.00027, spreadX: 0.30, spreadY: 0.26, phase: 0.0 }, // Azul Royal FORAM Eles
    { r: 124, g: 92,  b: 255, baseRadius: 290, breatheSpeed: 0.00045, driftSpeedX: 0.00019, driftSpeedY: 0.00024, spreadX: 0.34, spreadY: 0.28, phase: 1.5 }, // Violeta
    { r: 0,   g: 205, b: 255, baseRadius: 260, breatheSpeed: 0.00062, driftSpeedX: 0.00025, driftSpeedY: 0.00020, spreadX: 0.28, spreadY: 0.25, phase: 3.1 }, // Ciano vivo
    { r: 255, g: 95,  b: 65,  baseRadius: 250, breatheSpeed: 0.00050, driftSpeedX: 0.00021, driftSpeedY: 0.00026, spreadX: 0.32, spreadY: 0.27, phase: 4.4 }, // Coral quente
    { r: 255, g: 185, b: 45,  baseRadius: 210, breatheSpeed: 0.00068, driftSpeedX: 0.00028, driftSpeedY: 0.00022, spreadX: 0.24, spreadY: 0.22, phase: 5.6 }  // Âmbar dourado
  ];

  const blobs = colorConfigs.map((cfg, i) => {
    const startAngle = (i / colorConfigs.length) * Math.PI * 2;
    return {
      ...cfg,
      x: anchor.x + Math.cos(startAngle) * (width * 0.15),
      y: anchor.y + Math.sin(startAngle) * (height * 0.15)
    };
  });

  // Eventos no primeiro container
  const heroSection = document.getElementById('hero');
  if (heroSection) {
    heroSection.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      anchor.targetX = e.clientX - rect.left;
      anchor.targetY = e.clientY - rect.top;
      anchor.isInside = true;
      anchor.lastMoveTime = performance.now();
      // Quando o mouse se move, as cores se aproximam suavemente do cursor
      anchor.targetDispersion = 0.26;
    });

    heroSection.addEventListener('mouseleave', () => {
      // Quando o mouse sai (ex: vai para as abas do navegador), NÃO mudamos targetX/targetY!
      // Ele fica exatamente onde saiu e apenas aumenta a dispersão bem devagar.
      anchor.isInside = false;
      anchor.targetDispersion = 0.92;
    });

    heroSection.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        anchor.targetX = e.touches[0].clientX - rect.left;
        anchor.targetY = e.touches[0].clientY - rect.top;
        anchor.isInside = true;
        anchor.lastMoveTime = performance.now();
        anchor.targetDispersion = 0.26;
      }
    }, { passive: true });

    heroSection.addEventListener('touchend', () => {
      anchor.isInside = false;
      anchor.targetDispersion = 0.92;
    });
  }

  function animate(time) {
    ctx.clearRect(0, 0, width, height);

    // Se o cursor estiver parado dentro do container por mais de 1.2s,
    // começa a dispersar lentamente ao redor do próprio cursor parado
    if (anchor.isInside && time - anchor.lastMoveTime > 1200) {
      anchor.targetDispersion = 0.72;
    }

    // Quando o mouse está fora por bastante tempo, a âncora deriva ultra devagar
    // a partir de onde parou, sem nunca dar "salto" para o centro
    if (!anchor.isInside) {
      const gentleCenterPull = 0.00035;
      anchor.targetX += (width * 0.5 - anchor.targetX) * gentleCenterPull;
      anchor.targetY += (height * 0.5 - anchor.targetY) * gentleCenterPull;
    }

    // Interpolação bem suave da âncora e da dispersão (sem movimentos bruscos)
    anchor.x += (anchor.targetX - anchor.x) * 0.022;
    anchor.y += (anchor.targetY - anchor.y) * 0.022;
    anchor.dispersion += (anchor.targetDispersion - anchor.dispersion) * 0.008;

    ctx.globalCompositeOperation = 'screen';

    blobs.forEach((blob, i) => {
      // Deslocamento orgânico lento ao redor da âncora atual
      const maxOffsetX = Math.min(width, 1100) * blob.spreadX * anchor.dispersion;
      const maxOffsetY = Math.min(height, 800) * blob.spreadY * anchor.dispersion;

      const organicOffsetX =
        Math.cos(time * blob.driftSpeedX + blob.phase) * maxOffsetX +
        Math.sin(time * (blob.driftSpeedX * 0.65) + i * 1.7) * (maxOffsetX * 0.35);

      const organicOffsetY =
        Math.sin(time * blob.driftSpeedY + blob.phase) * maxOffsetY +
        Math.cos(time * (blob.driftSpeedY * 0.7) + i * 1.7) * (maxOffsetY * 0.35);

      const desiredX = anchor.x + organicOffsetX;
      const desiredY = anchor.y + organicOffsetY;

      // Movimento super fluido e calmo de cada mancha de cor
      blob.x += (desiredX - blob.x) * 0.018;
      blob.y += (desiredY - blob.y) * 0.018;

      // Efeito "Respirando" bem calmo (pulsação lenta de raio e luz)
      const breatheWave = Math.sin(time * blob.breatheSpeed + blob.phase);
      const currentRadius = blob.baseRadius * (1 + breatheWave * 0.18);
      const alpha = 0.52 + breatheWave * 0.12;

      const grad = ctx.createRadialGradient(
        blob.x,
        blob.y,
        currentRadius * 0.05,
        blob.x,
        blob.y,
        currentRadius
      );

      grad.addColorStop(0, `rgba(${blob.r}, ${blob.g}, ${blob.b}, ${alpha})`);
      grad.addColorStop(0.55, `rgba(${blob.r}, ${blob.g}, ${blob.b}, ${alpha * 0.42})`);
      grad.addColorStop(1, `rgba(${blob.r}, ${blob.g}, ${blob.b}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, currentRadius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
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

  // Filtro de Portfólio
  const filterBtns = document.querySelectorAll('.filter-btn');
  const portfolioItems = document.querySelectorAll('.portfolio-item');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      portfolioItems.forEach((item) => {
        const category = item.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          item.style.display = 'block';
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
