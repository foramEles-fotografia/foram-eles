/**
 * FORAM Eles — Script Principal
 * 1. Efeito do 1º Container (Fundo Branco estilo Antigravity):
 *    - Desfoque colorido MUITO lento, suave e orgânico.
 *    - Acompanha o mouse bem devagarzinho.
 *    - Quando o mouse para ou sai do container (ex: vai nas abas do navegador),
 *      permanece exatamente na última posição e vai se dispersando/movendo bem devagar,
 *      sem NUNCA resetar para o centro.
 * 2. Efeito do 2º Container (Vídeo Expansivo no Scroll):
 *    - Já começa ocupando 60% da largura da tela quando você está no 1º container.
 *    - Cresce até 100% da tela conforme rola para baixo.
 *    - Continua ocupando 100% da tela durante 2 scrolls completos (200vh).
 *    - Só depois vai reduzindo e descendo a tela.
 */

(function () {
  const canvas = document.getElementById('breathing-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let initialized = false;

  // Âncora persistente: guarda a última posição do mouse e NUNCA reseta para o centro!
  const anchor = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    isMoving: false,
    lastMoveTime: 0,
    // Dispersão suave: 0.42 quando acompanha o mouse em movimento; 0.72 quando pausado/fora
    dispersion: 0.68,
    targetDispersion: 0.68
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
      anchor.y = height * 0.45;
      anchor.targetX = width * 0.5;
      anchor.targetY = height * 0.45;
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

  // Velocidades ultra reduzidas para um movimento calmo, lento e contemplativo
  const colorConfigs = [
    { r: 27,  g: 98,  b: 248, baseRadius: 310, breatheSpeed: 0.00022, driftSpeedX: 0.00008, driftSpeedY: 0.00009, spreadX: 0.26, spreadY: 0.22, phase: 0.0 }, // Azul Royal FORAM Eles
    { r: 139, g: 92,  b: 246, baseRadius: 280, breatheSpeed: 0.00018, driftSpeedX: 0.00007, driftSpeedY: 0.00008, spreadX: 0.30, spreadY: 0.24, phase: 1.6 }, // Violeta suave
    { r: 14,  g: 185, b: 240, baseRadius: 260, breatheSpeed: 0.00025, driftSpeedX: 0.00009, driftSpeedY: 0.00007, spreadX: 0.24, spreadY: 0.20, phase: 3.1 }, // Ciano luminoso
    { r: 255, g: 105, b: 85,  baseRadius: 245, breatheSpeed: 0.00020, driftSpeedX: 0.00008, driftSpeedY: 0.00009, spreadX: 0.28, spreadY: 0.23, phase: 4.5 }, // Coral vivo
    { r: 250, g: 190, b: 50,  baseRadius: 215, breatheSpeed: 0.00024, driftSpeedX: 0.00010, driftSpeedY: 0.00008, spreadX: 0.21, spreadY: 0.19, phase: 5.7 }  // Âmbar quente
  ];

  const blobs = colorConfigs.map((cfg, i) => {
    const angle = (i / colorConfigs.length) * Math.PI * 2;
    return {
      ...cfg,
      x: anchor.x + Math.cos(angle) * (width * 0.14),
      y: anchor.y + Math.sin(angle) * (height * 0.14)
    };
  });

  // Atualiza a posição apenas quando o mouse se move dentro da área do 1º container.
  // Se o mouse sair (para as abas do navegador ou para fora da janela), targetX e targetY
  // continuam exatamente onde o mouse foi visto pela última vez!
  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    if (relY >= 0 && relY <= rect.height && relX >= 0 && relX <= rect.width) {
      anchor.targetX = relX;
      anchor.targetY = relY;
      anchor.isMoving = true;
      anchor.lastMoveTime = performance.now();
      anchor.targetDispersion = 0.40;
    } else {
      // Fora do container: não altera targetX/targetY (fica na última posição) e dispersa devagar
      anchor.isMoving = false;
      anchor.targetDispersion = 0.72;
    }
  });

  document.addEventListener('mouseleave', () => {
    // Saiu da janela: permanece na última posição e dispersa bem devagarzinho
    anchor.isMoving = false;
    anchor.targetDispersion = 0.72;
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
        anchor.targetDispersion = 0.40;
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    anchor.isMoving = false;
    anchor.targetDispersion = 0.72;
  });

  function animate(time) {
    ctx.clearRect(0, 0, width, height);

    // Se o cursor está parado há mais de 800ms, trata exatamente como pausado:
    // permanece onde está e começa a dispersar muito lentamente
    if (anchor.isMoving && time - anchor.lastMoveTime > 800) {
      anchor.isMoving = false;
      anchor.targetDispersion = 0.72;
    }

    // Inércia muito lenta e sedosa (0.008 para posição, 0.0018 para dispersão)
    anchor.x += (anchor.targetX - anchor.x) * 0.008;
    anchor.y += (anchor.targetY - anchor.y) * 0.008;
    anchor.dispersion += (anchor.targetDispersion - anchor.dispersion) * 0.0018;

    blobs.forEach((blob, i) => {
      const maxOffsetX = Math.min(width, 1050) * blob.spreadX * anchor.dispersion;
      const maxOffsetY = Math.min(height, 750) * blob.spreadY * anchor.dispersion;

      const organicOffsetX =
        Math.cos(time * blob.driftSpeedX + blob.phase) * maxOffsetX +
        Math.sin(time * (blob.driftSpeedX * 0.6) + i * 1.7) * (maxOffsetX * 0.32);

      const organicOffsetY =
        Math.sin(time * blob.driftSpeedY + blob.phase) * maxOffsetY +
        Math.cos(time * (blob.driftSpeedY * 0.65) + i * 1.7) * (maxOffsetY * 0.32);

      const desiredX = anchor.x + organicOffsetX;
      const desiredY = anchor.y + organicOffsetY;

      // Cada mancha de cor segue seu ponto orbital bem devagarzinho
      blob.x += (desiredX - blob.x) * 0.007;
      blob.y += (desiredY - blob.y) * 0.007;

      const breatheWave = Math.sin(time * blob.breatheSpeed + blob.phase);
      const currentRadius = blob.baseRadius * (1 + breatheWave * 0.14);
      const alpha = 0.35 + breatheWave * 0.06;

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
 * 2º CONTAINER: Coreografia de Scroll do Vídeo com Interpolação Suave
 * - Começa ocupando 60% da tela enquanto o usuário está no 1º container
 * - Cresce até 100% da tela conforme rola para baixo
 * - Permanece em 100% da tela por 2 scrolls completos (200vh)
 * - Depois reduz suavemente para 60% e continua descendo a tela
 */
(function () {
  const track = document.getElementById('destaque');
  const videoCard = document.getElementById('video-expand-card');
  if (!track || !videoCard) return;

  let currentFactor = 0;
  let targetFactor = 0;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function computeTargetFactor() {
    const rect = track.getBoundingClientRect();
    const vh = window.innerHeight;
    const totalScrollable = track.offsetHeight - vh;
    const scrolled = -rect.top;

    // Cresce de 60% para 100% conforme o usuário rola do 1º container para o 2º
    const growStart = -vh * 0.25;
    const growEnd = vh * 0.70;

    // Fica travado em 100% da tela por exatos 2 scrolls completos (2.0 * vh)
    const holdEnd = growEnd + vh * 2.0;

    // Depois dos 2 scrolls em 100%, reduz de volta para 60% antes de descer
    const shrinkEnd = totalScrollable;

    if (scrolled <= growStart) {
      targetFactor = 0;
    } else if (scrolled > growStart && scrolled < growEnd) {
      const t = clamp((scrolled - growStart) / (growEnd - growStart), 0, 1);
      targetFactor = t * t * (3 - 2 * t);
    } else if (scrolled >= growEnd && scrolled <= holdEnd) {
      targetFactor = 1;
    } else if (scrolled > holdEnd && scrolled < shrinkEnd) {
      const t = clamp((scrolled - holdEnd) / (shrinkEnd - holdEnd), 0, 1);
      const smoothT = t * t * (3 - 2 * t);
      targetFactor = 1 - smoothT;
    } else {
      targetFactor = 0;
    }
  }

  function renderVideoLoop() {
    computeTargetFactor();
    // Suaviza a transição do tamanho do vídeo para nunca parecer brusco no scroll
    currentFactor += (targetFactor - currentFactor) * 0.12;

    const isMobile = window.innerWidth <= 720;
    const minW = isMobile ? 86 : 60; // 60% da tela no 1º container
    const minH = isMobile ? 54 : 60;

    const w = minW + (100 - minW) * currentFactor;
    const h = minH + (100 - minH) * currentFactor;
    const radius = 28 * (1 - currentFactor);

    videoCard.style.width = `${w.toFixed(2)}vw`;
    videoCard.style.height = `${h.toFixed(2)}vh`;
    videoCard.style.borderRadius = `${radius.toFixed(1)}px`;

    requestAnimationFrame(renderVideoLoop);
  }

  requestAnimationFrame(renderVideoLoop);
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
