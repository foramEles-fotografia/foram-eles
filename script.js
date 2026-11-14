/**
 * FORAM Eles. — Script Principal Ultra-Otimizado (60/120fps Liso no Desktop e Celular)
 *
 * Otimizações de Performance Aplicadas:
 * 1. Canvases (#breathing-canvas e #contact-breathing-canvas) renderizados em buffer interno
 *    reduzido (0.15x no celular / 0.20x no desktop) com gradientes radiais multi-stop suaves
 *    e interpolação bilinear nativa da GPU — eliminando 100% do pesado CSS filter:blur()!
 * 2. IntersectionObserver pausa automaticamente a animação do 1º container quando ele sai da tela
 *    e só ativa a animação do card do WhatsApp/Contato quando ele entra na tela.
 * 3. Vídeo (#showcase-video) pausado automaticamente fora da tela para economizar decodificação de GPU/bateria,
 *    e cálculo do scroll sem getBoundingClientRect() por frame (zero layout thrashing), parando o loop rAF
 *    assim que a interpolação estabiliza.
 */

/* ==========================================================================
   1º CONTAINER: MANCHA ÚNICA DE DUAS CORES (1:1 NATIVO, ZERO PIXELADO)
   - Uma só mancha suave, pequena, que se desfaz em degradê até o fundo.
   - Passeia devagar pela tela a partir de um ponto aleatório.
   - Desktop: acompanha o mouse; quanto mais o mouse mexe, mais rápido as cores mudam.
   - Celular: sem toque; a mancha passeia sozinha com elegância.
   ========================================================================== */
(function () {
  const canvas = document.getElementById('breathing-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  const mobileQuery = window.matchMedia('(max-width: 768px), (pointer: coarse)');
  let isMobile = mobileQuery.matches;

  let width = 0;
  let height = 0;
  let viewH = window.innerHeight;
  let initialized = false;
  let isHeroVisible = true;
  let rafId = 0;

  // Âncora persistente: rastreia o mouse e vagueia dinamicamente quando parado
  const anchor = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    isMoving: false,
    lastMoveTime: 0,
    idleBlend: 1 // 0 = mouse em movimento rápido, 1 = vagueando dinamicamente
  };

  function resize() {
    const parent = canvas.parentElement;
    if (!parent) return;
    const prevW = width || parent.offsetWidth || window.innerWidth;
    const prevH = height || parent.offsetHeight || window.innerHeight * 2;

    isMobile = mobileQuery.matches;
    syncBlobsPalette(isMobile);
    width = parent.offsetWidth || window.innerWidth;
    height = parent.offsetHeight || window.innerHeight * 2;
    viewH = window.innerHeight;

    // Resolução 1:1 direta: elimina 100% de quadriculados, serrilhados ou aspecto pixelado
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (!initialized) {
      anchor.x = anchor.targetX = width * 0.5;
      anchor.y = anchor.targetY = viewH * 0.38;
      initialized = true;
    } else {
      anchor.x = (anchor.x / prevW) * width;
      anchor.y = (anchor.y / prevH) * height;
      anchor.targetX = (anchor.targetX / prevW) * width;
      anchor.targetY = (anchor.targetY / prevH) * height;
    }
  }

  // ==========================================================================
  // MANCHA ÚNICA DE DUAS CORES (suave, pequena e sem bordas)
  // - Nasce em um ponto aleatório e passeia bem devagar pela tela.
  // - Com o mouse na tela, ela acompanha o cursor; quanto mais o mouse mexe,
  //   mais rápido as cores mudam.
  // - Ocupa só um pedaço da tela e se desfaz em degradê até o fundo branco.
  // - Cores vizinhas no círculo cromático (nunca opostas) = sem tons sujos.
  // ==========================================================================
  const colorRing = [
    { r: 110, g: 185, b: 255 }, // Azul bebê
    { r: 105, g: 225, b: 240 }, // Ciano claro
    { r: 120, g: 235, b: 190 }, // Verde menta
    { r: 250, g: 225, b: 130 }, // Amarelo manteiga
    { r: 255, g: 185, b: 130 }, // Pêssego
    { r: 255, g: 160, b: 200 }, // Rosa
    { r: 200, g: 170, b: 255 }  // Lilás
  ];

  function ringColor(pos) {
    const n = colorRing.length;
    const p = ((pos % n) + n) % n;
    const i = Math.floor(p);
    const f = p - i;
    const a = colorRing[i];
    const b = colorRing[(i + 1) % n];
    return {
      r: Math.round(a.r + (b.r - a.r) * f),
      g: Math.round(a.g + (b.g - a.g) * f),
      b: Math.round(a.b + (b.b - a.b) * f)
    };
  }

  const stain = {
    phaseX: Math.random() * Math.PI * 2,   // ponto de partida aleatório
    phaseY: Math.random() * Math.PI * 2,
    colorPos: Math.random() * colorRing.length,
    x: 0,
    y: 0,
    placed: false,
    influence: 0,        // 0 = passeando sozinha, 1 = seguindo o mouse
    mouseEnergy: 0,      // energia do movimento do mouse (acelera a troca de cor)
    lastTime: 0
  };

  let lastMouseX = 0;
  let lastMouseY = 0;

  function syncBlobsPalette() { /* mantido por compatibilidade com resize() */ }

  // Redimensionamento inteligente sem quebrar no scroll mobile
  window.addEventListener('resize', () => {
    const parent = canvas.parentElement;
    if (parent && parent.offsetWidth === width && Math.abs(window.innerHeight - viewH) < 160) return;
    resize();
  }, { passive: true });
  resize();

  function pointerMove(x, y) {
    if (isMobile || !isHeroVisible) return;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const absY = y + scrollY;
    if (absY >= 0 && absY <= viewH * 1.25 && x >= 0 && x <= width) {
      const dist = Math.hypot(x - lastMouseX, y - lastMouseY);
      lastMouseX = x;
      lastMouseY = y;
      anchor.targetX = x;
      anchor.targetY = Math.min(absY, viewH * 0.95);
      anchor.isMoving = true;
      anchor.lastMoveTime = performance.now();
      stain.mouseEnergy = Math.min(1, stain.mouseEnergy + dist / 160);
    } else {
      anchor.isMoving = false;
    }
  }

  window.addEventListener('mousemove', (e) => pointerMove(e.clientX, e.clientY), { passive: true });
  document.addEventListener('mouseleave', () => { anchor.isMoving = false; });

  // Gradiente radial com queda em cosseno: chega a zero na borda com inclinação zero (sem contorno visível)
  function drawSoftBlob(x, y, rad, r, g, b, alpha) {
    if (rad <= 0 || alpha <= 0) return;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const steps = 10;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const a = alpha * 0.5 * (1 + Math.cos(Math.PI * t));
      grad.addColorStop(t, `rgba(${r}, ${g}, ${b}, ${a.toFixed(4)})`);
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  function animate(time) {
    if (!isHeroVisible) {
      rafId = 0;
      stain.lastTime = 0;
      return;
    }

    const dt = stain.lastTime ? Math.min(time - stain.lastTime, 64) : 16;
    stain.lastTime = time;

    ctx.clearRect(0, 0, width, height);

    // Mouse parado por ~2.5s: a mancha volta a passear sozinha
    if (anchor.isMoving && time - anchor.lastMoveTime > 2500) {
      anchor.isMoving = false;
    }
    const wantInfluence = (!isMobile && anchor.isMoving) ? 1 : 0;
    stain.influence += (wantInfluence - stain.influence) * (wantInfluence ? 0.06 : 0.012);

    // Energia do mouse decai sozinha (cores aceleram só enquanto o mouse mexe)
    stain.mouseEnergy *= 0.94;

    // Passeio lento e contínuo (período ~40-55s), começando em ponto aleatório
    const t = time * 0.00014;
    const wanderX = width * (0.5 + 0.30 * Math.sin(t * 1.00 + stain.phaseX) + 0.07 * Math.sin(t * 2.3 + stain.phaseY));
    const wanderY = viewH * (0.46 + 0.26 * Math.sin(t * 0.83 + stain.phaseY) + 0.06 * Math.cos(t * 1.9 + stain.phaseX));

    const mouseX = anchor.targetX;
    const mouseY = anchor.targetY;
    const goalX = wanderX + (mouseX - wanderX) * stain.influence;
    const goalY = wanderY + (mouseY - wanderY) * stain.influence;

    if (!stain.placed) {
      stain.x = goalX;
      stain.y = goalY;
      stain.placed = true;
    }
    const follow = 0.02 + 0.05 * stain.influence;
    stain.x += (goalX - stain.x) * follow;
    stain.y += (goalY - stain.y) * follow;

    // Cores: giro lento no círculo cromático; acelera quando o mouse mexe
    stain.colorPos += dt * (0.00018 + 0.0020 * stain.mouseEnergy);
    const c1 = ringColor(stain.colorPos);
    const c2 = ringColor(stain.colorPos + 1.15);

    // Tamanho: só um pedaço da tela
    const base = isMobile ? width * 0.52 : Math.min(width, viewH * 1.25) * 0.27;
    const radius = base * (1 + 0.06 * Math.sin(time * 0.0006));
    const alpha = isMobile ? 0.40 : 0.30;

    // Dois lóbulos próximos (uma cor em cada) que se misturam em degradê e giram devagar
    const spin = time * 0.00035 + stain.phaseX;
    const off = radius * 0.34;
    const ox = Math.cos(spin) * off;
    const oy = Math.sin(spin) * off * 0.8;

    drawSoftBlob(stain.x - ox, stain.y - oy, radius, c1.r, c1.g, c1.b, alpha);
    drawSoftBlob(stain.x + ox, stain.y + oy, radius, c2.r, c2.g, c2.b, alpha);

    rafId = requestAnimationFrame(animate);
  }

  // Pausa com IntersectionObserver quando o hero estiver totalmente fora do viewport
  if ('IntersectionObserver' in window && canvas.parentElement) {
    const heroObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isHeroVisible = entry.isIntersecting;
          if (isHeroVisible && !rafId) rafId = requestAnimationFrame(animate);
        });
      },
      { rootMargin: '100px 0px' }
    );
    heroObs.observe(canvas.parentElement);
  } else {
    rafId = requestAnimationFrame(animate);
  }
})();

/* ==========================================================================
   6º CONTAINER: CANVAS DE CORES AUTÔNOMO DENTRO DO CARD DO WHATSAPP/CONTATO
   - Mesmo mix vivo (roxo, laranja, azul royal, ciano, rosa) em movimento contínuo
   - Exclusivo no card limitado (~60-70% da tela) com resolução 1:1 límpida
   - Roda 100% liso apenas quando a seção estiver visível
   ========================================================================== */
(function () {
  const contactCanvas = document.getElementById('contact-breathing-canvas');
  if (!contactCanvas) return;
  const ctx = contactCanvas.getContext('2d', { alpha: true });

  let width = 0;
  let height = 0;
  let isContactVisible = false;
  let contactRafId = 0;

  function resizeContactCanvas() {
    const parent = contactCanvas.parentElement;
    if (!parent) return;
    width = Math.max(260, parent.offsetWidth);
    height = Math.max(220, parent.offsetHeight);
    contactCanvas.width = Math.round(width);
    contactCanvas.height = Math.round(height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  window.addEventListener('resize', resizeContactCanvas, { passive: true });
  resizeContactCanvas();

  // Paleta de tons pastéis alegres, claros e luminosos (alta claridade, zero tons escuros/mortos)
  const contactBrandPalette = [
    { r: 255, g: 160, b: 210 }, // Rosa pastel alegre e vivo
    { r: 200, g: 172, b: 255 }, // Lavanda / Lilás pastel luminoso
    { r: 140, g: 212, b: 255 }, // Azul céu pastel radiante
    { r: 130, g: 242, b: 230 }, // Menta / Ciano pastel fresco
    { r: 255, g: 192, b: 140 }, // Pêssego pastel solar
    { r: 255, g: 226, b: 132 }  // Amarelo manteiga / Âmbar claro alegre
  ];

  // Cores pastéis suaves, unidas no centro e mudando continuamente entre tons claros e alegres
  const autonomousBlobs = [
    { baseRadius: 370, xRatio: 0.46, yRatio: 0.46, speedX:  0.00135, speedY:  0.00110, ampX: 0.16, ampY: 0.15, phase: 0.0, colorOffset: 0.0, baseAlpha: 0.38 },
    { baseRadius: 350, xRatio: 0.54, yRatio: 0.43, speedX: -0.00125, speedY:  0.00122, ampX: 0.15, ampY: 0.16, phase: 1.5, colorOffset: 1.0, baseAlpha: 0.36 },
    { baseRadius: 390, xRatio: 0.50, yRatio: 0.54, speedX:  0.00115, speedY: -0.00110, ampX: 0.17, ampY: 0.14, phase: 3.1, colorOffset: 2.0, baseAlpha: 0.40 },
    { baseRadius: 340, xRatio: 0.57, yRatio: 0.52, speedX: -0.00130, speedY:  0.00105, ampX: 0.14, ampY: 0.15, phase: 4.4, colorOffset: 3.0, baseAlpha: 0.34 },
    { baseRadius: 350, xRatio: 0.43, yRatio: 0.55, speedX:  0.00140, speedY: -0.00118, ampX: 0.15, ampY: 0.14, phase: 5.6, colorOffset: 4.0, baseAlpha: 0.37 },
    { baseRadius: 330, xRatio: 0.48, yRatio: 0.39, speedX: -0.00110, speedY:  0.00125, ampX: 0.16, ampY: 0.13, phase: 2.3, colorOffset: 5.0, baseAlpha: 0.34 }
  ];

  function getInterpolatedContactColor(time, offset) {
    // Muda continuamente entre os tons pastéis alegres da paleta
    const cycle = (time * 0.00065 + offset) % contactBrandPalette.length;
    const i1 = Math.floor(cycle);
    const i2 = (i1 + 1) % contactBrandPalette.length;
    const blend = cycle - i1;
    const c1 = contactBrandPalette[i1];
    const c2 = contactBrandPalette[i2];
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * blend),
      g: Math.round(c1.g + (c2.g - c1.g) * blend),
      b: Math.round(c1.b + (c2.b - c1.b) * blend)
    };
  }

  function drawContactBlob(x, y, rad, r, g, b, alpha) {
    if (rad <= 0 || alpha <= 0) return;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
    // Gradiente aveludado e luminoso que clareia o fundo com elegância
    grad.addColorStop(0.00, `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`);
    grad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.72).toFixed(3)})`);
    grad.addColorStop(0.68, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.35).toFixed(3)})`);
    grad.addColorStop(0.88, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.10).toFixed(3)})`);
    grad.addColorStop(1.00, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  function animateContact(time) {
    if (!isContactVisible) {
      contactRafId = 0;
      return;
    }

    ctx.clearRect(0, 0, width, height);
    const mobileScale = width <= 600 ? 0.78 : 1.0;

    for (let i = 0; i < autonomousBlobs.length; i++) {
      const b = autonomousBlobs[i];
      const x =
        width * b.xRatio +
        Math.sin(time * b.speedX + b.phase) * (width * b.ampX) +
        Math.cos(time * b.speedY * 0.8 - b.phase) * (width * 0.07);

      const y =
        height * b.yRatio +
        Math.cos(time * b.speedY + b.phase) * (height * b.ampY) +
        Math.sin(time * b.speedX * 0.7 + b.phase) * (height * 0.07);

      const breathe = Math.sin(time * 0.00032 + b.phase);
      const rad = b.baseRadius * mobileScale * (1 + breathe * 0.12);
      const alpha = b.baseAlpha + breathe * 0.03;

      const col = getInterpolatedContactColor(time, b.colorOffset);

      drawContactBlob(x, y, rad, col.r, col.g, col.b, alpha);
    }

    contactRafId = requestAnimationFrame(animateContact);
  }

  if ('IntersectionObserver' in window && contactCanvas.parentElement) {
    const contactObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isContactVisible = entry.isIntersecting;
          if (isContactVisible && !contactRafId) {
            resizeContactCanvas();
            contactRafId = requestAnimationFrame(animateContact);
          }
        });
      },
      { rootMargin: '120px 0px' }
    );
    contactObs.observe(contactCanvas.parentElement);
  } else {
    isContactVisible = true;
    contactRafId = requestAnimationFrame(animateContact);
  }
})();

/* ==========================================================================
   2º CONTAINER: TRANSIÇÃO GRADUAL DO VÍDEO (ZERO LAYOUT THRASHING + AUTO PAUSE)
   ========================================================================== */
(function () {
  const track = document.getElementById('destaque');
  const videoCard = document.getElementById('video-expand-card');
  const videoEl = document.getElementById('showcase-video');
  if (!track || !videoCard) return;

  // O vídeo começa pausado e só toca quando pelo menos 20% dele (em altura) aparece na tela.
  // Abaixo disso ele pausa de novo, assim ninguém pega o vídeo "pela metade".
  if (videoEl) {
    videoEl.muted = true;
    videoEl.removeAttribute('autoplay');
    if (window.matchMedia('(max-width: 768px)').matches) {
      videoEl.setAttribute('poster', 'assets/video-poster-mobile.jpg');
    }

    const MIN_VISIBLE = 0.2;
    const tryPlay = () => {
      const p = videoEl.play();
      if (p && p.catch) p.catch(() => {});
    };

    if ('IntersectionObserver' in window) {
      const thresholds = [0, 0.05, 0.1, 0.15, 0.19, 0.2, 0.21, 0.25, 0.35, 0.5, 0.75, 1];
      const videoObs = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (entry.isIntersecting && entry.intersectionRatio >= MIN_VISIBLE) {
            tryPlay();
          } else {
            videoEl.pause();
          }
        },
        { threshold: thresholds }
      );
      videoObs.observe(videoCard);
    }
  }
  let trackOffsetTop = 0;
  let trackHeight = 0;
  let viewportH = window.innerHeight;
  let isMobileView = window.innerWidth <= 768;
  let currentFactor = 0;
  let targetFactor = 0;
  let videoRafId = 0;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function smoothstep(t) {
    const c = clamp(t, 0, 1);
    return c * c * (3 - 2 * c);
  }

  function measureTrackMetrics() {
    const rect = track.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset || 0;
    trackOffsetTop = Math.max(80, rect.top + scrollY);
    trackHeight = track.offsetHeight;
    viewportH = window.innerHeight;
    isMobileView = window.innerWidth <= 768;
    updateTargetFromScroll();
    applyVideoTransform(currentFactor);
  }

  function updateTargetFromScroll() {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const distToTop = trackOffsetTop - scrollY;

    if (distToTop > 0) {
      // FASE 1 (1º Scroll): Sobe e cresce gradualmente até atingir o centro (distToTop === 0)
      const rawGrow = clamp(scrollY / trackOffsetTop, 0, 1);
      targetFactor = smoothstep(rawGrow);
    } else {
      // O vídeo já chegou no centro da tela
      const pinnedScrolled = -distToTop;
      const totalPinnedScroll = Math.max(1, trackHeight - viewportH);
      const holdLimit = totalPinnedScroll * 0.48;

      if (pinnedScrolled <= holdLimit) {
        targetFactor = 1;
      } else if (pinnedScrolled < totalPinnedScroll) {
        const shrinkSpan = Math.max(1, totalPinnedScroll - holdLimit);
        const rawShrink = clamp((pinnedScrolled - holdLimit) / shrinkSpan, 0, 1);
        targetFactor = 1 - smoothstep(rawShrink);
      } else {
        targetFactor = 0;
      }
    }

    if (!videoRafId && Math.abs(targetFactor - currentFactor) > 0.0005) {
      videoRafId = requestAnimationFrame(tickVideo);
    }
  }

  function applyVideoTransform(factor) {
    const minScale = isMobileView ? 0.82 : 0.60;
    const maxRadius = isMobileView ? 24 : 32;
    const scale = minScale + (1 - minScale) * factor;
    const radius = Math.round(maxRadius * (1 - factor));

    videoCard.style.transform = `scale3d(${scale.toFixed(4)}, ${scale.toFixed(4)}, 1)`;
    videoCard.style.borderRadius = `${radius}px`;
  }

  function tickVideo() {
    const diff = targetFactor - currentFactor;
    if (Math.abs(diff) < 0.0008) {
      currentFactor = targetFactor;
      applyVideoTransform(currentFactor);
      videoRafId = 0;
      return;
    }

    currentFactor += diff * 0.24;
    applyVideoTransform(currentFactor);
    videoRafId = requestAnimationFrame(tickVideo);
  }

  window.addEventListener('scroll', updateTargetFromScroll, { passive: true });
  window.addEventListener('resize', measureTrackMetrics, { passive: true });
  window.addEventListener('load', measureTrackMetrics);
  measureTrackMetrics();
})();

/* ==========================================================================
   3º CONTAINER: TRABALHOS REALIZADOS (CARDS ESTILO APPLE + MODAL COM SUPORTE TOUCH)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');

  let isScrolled = false;
  window.addEventListener('scroll', () => {
    const shouldBeScrolled = (window.scrollY || window.pageYOffset) > 36;
    if (shouldBeScrolled !== isScrolled) {
      isScrolled = shouldBeScrolled;
      navbar.classList.toggle('scrolled', isScrolled);
    }
  }, { passive: true });

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      menuToggle.classList.toggle('active', isOpen);
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        menuToggle.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Filtro de Portfólio
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

  // Dados dos Álbuns 100% reais (Projetos e ensaios realizados pela Foram Eles)
  const albumsData = [
    {
      category: 'Harmonização Orofacial',
      title: 'Dra. Joyce Menezes',
      photos: [
        'assets/albuns/joyce/foto-06.jpg',
        'assets/albuns/joyce/foto-01.jpg',
        'assets/albuns/joyce/foto-02.jpg',
        'assets/albuns/joyce/foto-03.jpg',
        'assets/albuns/joyce/foto-04.jpg',
        'assets/albuns/joyce/foto-05.jpg',
        'assets/albuns/joyce/foto-07.jpg',
        'assets/albuns/joyce/foto-08.jpg',
        'assets/albuns/joyce/foto-09.jpg',
        'assets/albuns/joyce/foto-10.jpg',
        'assets/albuns/joyce/foto-11.jpg'
      ]
    },
    {
      category: 'Invisalign Doctor',
      title: 'Dra. Izabela Freitas',
      photos: [
        'assets/albuns/izabela/foto-01.jpg',
        'assets/albuns/izabela/foto-02.jpg',
        'assets/albuns/izabela/foto-03.jpg',
        'assets/albuns/izabela/foto-04.jpg'
      ]
    },
    {
      category: 'Odontologia & Estética',
      title: 'Dra. Jéssica Cardoso',
      photos: [
        'assets/albuns/jessica/jessica-3.jpg',
        'assets/albuns/jessica/foto-01.jpg',
        'assets/albuns/jessica/foto-02.jpg'
      ]
    },
    {
      category: 'Retratos & Atendimento',
      title: 'Profissionais',
      photos: [
        'assets/albuns/profissionais/foto-01.jpg',
        'assets/albuns/profissionais/foto-02.jpg',
        'assets/albuns/profissionais/foto-03.jpg',
        'assets/albuns/profissionais/foto-04.jpg'
      ]
    },
    {
      category: 'Estrutura, Espaços & Equipe',
      title: 'Institucional',
      photos: [
        'assets/albuns/institucional/foto-02.jpg',
        'assets/albuns/institucional/foto-01.jpg',
        'assets/albuns/institucional/foto-03.jpg',
        'assets/albuns/institucional/foto-04.jpg'
      ]
    },
    {
      category: 'Texturas, Produtos & Essência',
      title: 'Branding & Detalhes',
      photos: [
        'assets/albuns/branding/foto-08.jpg',
        'assets/albuns/branding/foto-01.jpg',
        'assets/albuns/branding/foto-02.jpg',
        'assets/albuns/branding/foto-03.jpg',
        'assets/albuns/branding/foto-04.jpg',
        'assets/albuns/branding/foto-05.jpg',
        'assets/albuns/branding/foto-06.jpg',
        'assets/albuns/branding/foto-07.jpg'
      ]
    }
  ];

  const modal = document.getElementById('album-modal');
  const modalBackdrop = document.getElementById('album-modal-backdrop');
  const modalClose = document.getElementById('album-modal-close');
  const modalCat = document.getElementById('album-modal-cat');
  const modalTitle = document.getElementById('album-modal-title');
  const modalCounter = document.getElementById('album-modal-counter');
  const modalMainImg = document.getElementById('album-main-img');
  const modalThumbs = document.getElementById('album-thumbs');
  const albumViewer = document.getElementById('album-viewer');
  const prevBtn = document.getElementById('album-prev');
  const nextBtn = document.getElementById('album-next');

  let currentAlbumIndex = 0;
  let currentPhotoIndex = 0;

  function renderAlbumPhoto() {
    const album = albumsData[currentAlbumIndex];
    if (!album) return;

    modalCat.textContent = album.category;
    modalTitle.textContent = album.title;
    modalCounter.textContent = `${currentPhotoIndex + 1} / ${album.photos.length}`;
    modalMainImg.src = album.photos[currentPhotoIndex];

    const thumbEls = modalThumbs.querySelectorAll('.album-thumb');
    thumbEls.forEach((t, idx) => {
      t.classList.toggle('active', idx === currentPhotoIndex);
    });
  }

  function openAlbum(albumIdx) {
    const album = albumsData[albumIdx];
    if (!album) return;
    currentAlbumIndex = albumIdx;
    currentPhotoIndex = 0;

    modalThumbs.innerHTML = '';
    album.photos.forEach((src, idx) => {
      const thumb = document.createElement('div');
      thumb.className = `album-thumb ${idx === 0 ? 'active' : ''}`;
      thumb.innerHTML = `<img src="${src}" alt="Miniatura ${idx + 1}" loading="lazy" decoding="async" />`;
      thumb.addEventListener('click', () => {
        currentPhotoIndex = idx;
        renderAlbumPhoto();
      });
      modalThumbs.appendChild(thumb);
    });

    renderAlbumPhoto();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeAlbum() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  portfolioItems.forEach((item) => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.getAttribute('data-album') || '0', 10);
      openAlbum(idx);
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const idx = parseInt(item.getAttribute('data-album') || '0', 10);
        openAlbum(idx);
      }
    });
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const album = albumsData[currentAlbumIndex];
      if (!album) return;
      currentPhotoIndex = (currentPhotoIndex - 1 + album.photos.length) % album.photos.length;
      renderAlbumPhoto();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const album = albumsData[currentAlbumIndex];
      if (!album) return;
      currentPhotoIndex = (currentPhotoIndex + 1) % album.photos.length;
      renderAlbumPhoto();
    });
  }

  // Suporte a gesto de deslizar (Swipe) no celular dentro do modal de fotos
  if (albumViewer) {
    let touchStartX = 0;
    albumViewer.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
      }
    }, { passive: true });

    albumViewer.addEventListener('touchend', (e) => {
      if (e.changedTouches.length > 0) {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(deltaX) > 45) {
          if (deltaX < 0 && nextBtn) nextBtn.click();
          if (deltaX > 0 && prevBtn) prevBtn.click();
        }
      }
    }, { passive: true });
  }

  if (modalClose) modalClose.addEventListener('click', closeAlbum);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeAlbum);

  window.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') closeAlbum();
    if (e.key === 'ArrowLeft' && prevBtn) prevBtn.click();
    if (e.key === 'ArrowRight' && nextBtn) nextBtn.click();
  });

  // Scroll Reveal otimizado (para de observar após revelar)
  const reveals = document.querySelectorAll('.reveal:not(.visible)');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('visible'));
  }

  // Inicializa o CookieConsent v3 (LGPD)
  initCookieConsent();
});

/* ==========================================================================
   AVISO DE COOKIES (LGPD) — CookieConsent v3 (orestbida/cookieconsent)
   ========================================================================== */
function initCookieConsent() {
  if (typeof CookieConsent === 'undefined') return;

  CookieConsent.run({
    guiOptions: {
      consentModal: {
        layout: 'box',
        position: 'bottom right',
        equalWeightButtons: true,
        flipButtons: false
      },
      preferencesModal: {
        layout: 'box',
        position: 'right',
        equalWeightButtons: true,
        flipButtons: false
      }
    },
    categories: {
      necessary: {
        readOnly: true
      },
      analytics: {}
    },
    language: {
      default: 'pt',
      translations: {
        pt: {
          consentModal: {
            title: 'Privacidade & Cookies',
            description: 'Utilizamos cookies essenciais para o funcionamento seguro do site e cookies analíticos para mensurar e aprimorar a experiência de navegação, em conformidade com a LGPD.',
            acceptAllBtn: 'Aceitar todos',
            acceptNecessaryBtn: 'Apenas necessários',
            showPreferencesBtn: 'Preferências'
          },
          preferencesModal: {
            title: 'Preferências de Cookies',
            acceptAllBtn: 'Aceitar todos',
            acceptNecessaryBtn: 'Rejeitar opcionais',
            savePreferencesBtn: 'Salvar preferências',
            closeIconLabel: 'Fechar',
            sections: [
              {
                title: 'Transparência e Privacidade (LGPD)',
                description: 'Valorizamos a sua privacidade e fornecemos controle total sobre os dados e cookies armazenados durante sua visita.'
              },
              {
                title: 'Cookies Estritamente Necessários <span class="pm__badge">Sempre Ativo</span>',
                description: 'Essenciais para a segurança, carregamento rápido de mídias e navegação estável. Não podem ser desativados.',
                linkedCategory: 'necessary'
              },
              {
                title: 'Cookies de Análise e Métricas',
                description: 'Ajudam nossa equipe a entender métricas agregadas de visitas e navegação para constante melhoria da plataforma.',
                linkedCategory: 'analytics'
              }
            ]
          }
        }
      }
    }
  });
}
