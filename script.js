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
   1º CONTAINER: CANVAS DE CORES VIBRANTES E VELUDO (1:1 NATIVO, ZERO PIXELADO)
   - Resolução 1:1 nativa da tela com interpolação de alta precisão (sem quadriculado).
   - Mix rico de cores: roxo vibrante, laranja pôr do sol, azul royal da marca,
     ciano neon, magenta quente e âmbar dourado.
   - Bordas com desfoque amplo e gradientes radiais suaves multi-stop.
   - Desktop: segue o mouse suavemente; quando o mouse para ou sai da tela,
     as cores ganham movimento dinâmico contínuo e orgânico (nunca congelam).
   - Celular: sem interferência de toque; as cores vagueiam e giram com elegância.
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

  // Redimensionamento inteligente sem quebrar no scroll mobile
  window.addEventListener('resize', () => {
    const parent = canvas.parentElement;
    if (parent && parent.offsetWidth === width && Math.abs(window.innerHeight - viewH) < 160) return;
    resize();
  }, { passive: true });
  resize();

  // Mix de cores vibrantes com roxo, laranja, azul royal, ciano elétrico, magenta e âmbar
  // Bolinhas maiores com órbitas elípticas e velocidades dinâmicas para movimento vivo e fluido
  const palette = [
    { r: 138, g: 43,  b: 226, radius: 380, angle: 0.00, orbitX: 1.15, orbitY: 0.95, speed:  0.00078, breathe: 0.00045, alpha: 0.72 }, // Roxo / Violeta vibrante
    { r: 255, g: 108, b: 20,  radius: 410, angle: 0.95, orbitX: 1.28, orbitY: 1.10, speed: -0.00068, breathe: 0.00048, alpha: 0.68 }, // Laranja pôr-do-sol
    { r: 27,  g: 98,  b: 248, radius: 440, angle: 1.95, orbitX: 0.95, orbitY: 1.05, speed:  0.00060, breathe: 0.00038, alpha: 0.70 }, // Azul Royal da marca
    { r: 0,   g: 216, b: 255, radius: 360, angle: 2.95, orbitX: 1.22, orbitY: 0.88, speed: -0.00065, breathe: 0.00044, alpha: 0.65 }, // Ciano elétrico
    { r: 242, g: 42,  b: 142, radius: 370, angle: 3.90, orbitX: 1.05, orbitY: 1.22, speed:  0.00070, breathe: 0.00040, alpha: 0.66 }, // Rosa / Magenta vivo
    { r: 255, g: 168, b: 24,  radius: 350, angle: 4.85, orbitX: 1.18, orbitY: 0.92, speed: -0.00058, breathe: 0.00042, alpha: 0.62 }, // Âmbar solar
    { r: 112, g: 38,  b: 238, radius: 390, angle: 5.65, orbitX: 0.92, orbitY: 1.18, speed:  0.00064, breathe: 0.00039, alpha: 0.68 }  // Violeta profundo
  ];

  const blobs = palette.map((p) => ({ ...p, x: 0, y: 0, ready: false }));

  // Manchas suaves que se estendem por trás do vídeo para conexão perfeita
  const lowerBlobs = [
    { r: 138, g: 43,  b: 226, radius: 480, xr: 0.28, yr: 0.44, speed: 0.00028, phase: 0.8,  alpha: 0.36 }, // Roxo
    { r: 255, g: 110, b: 20,  radius: 460, xr: 0.72, yr: 0.48, speed: 0.00024, phase: 2.1,  alpha: 0.34 }, // Laranja
    { r: 27,  g: 98,  b: 248, radius: 500, xr: 0.48, yr: 0.58, speed: 0.00022, phase: 3.6,  alpha: 0.38 }, // Azul Royal
    { r: 0,   g: 215, b: 255, radius: 430, xr: 0.22, yr: 0.68, speed: 0.00025, phase: 4.9,  alpha: 0.32 }, // Ciano
    { r: 242, g: 42,  b: 142, radius: 450, xr: 0.76, yr: 0.72, speed: 0.00026, phase: 1.2,  alpha: 0.34 }  // Magenta
  ];

  function pointerMove(x, y) {
    if (isMobile || !isHeroVisible) return;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const absY = y + scrollY;
    if (absY >= 0 && absY <= viewH * 1.25 && x >= 0 && x <= width) {
      anchor.targetX = x;
      anchor.targetY = Math.min(absY, viewH * 0.95);
      anchor.isMoving = true;
      anchor.lastMoveTime = performance.now();
    } else {
      anchor.isMoving = false;
    }
  }

  window.addEventListener('mousemove', (e) => pointerMove(e.clientX, e.clientY), { passive: true });
  document.addEventListener('mouseleave', () => { anchor.isMoving = false; });

  // Gradiente radial com decaimento suave em 5 paradas (zero arestas secas ou pixeladas)
  function drawSoftBlob(x, y, rad, r, g, b, alpha) {
    if (rad <= 0 || alpha <= 0) return;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0.00, `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`);
    grad.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.72).toFixed(3)})`);
    grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.36).toFixed(3)})`);
    grad.addColorStop(0.80, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.10).toFixed(3)})`);
    grad.addColorStop(1.00, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  function animate(time) {
    if (!isHeroVisible) {
      rafId = 0;
      return;
    }

    ctx.clearRect(0, 0, width, height);

    // Quando o mouse para por ~0.5s, transiciona suavemente para o modo dinâmico autônomo
    if (anchor.isMoving && time - anchor.lastMoveTime > 500) {
      anchor.isMoving = false;
    }

    const wantIdle = isMobile || !anchor.isMoving ? 1 : 0;
    anchor.idleBlend += (wantIdle - anchor.idleBlend) * (wantIdle ? 0.03 : 0.12);

    if (isMobile) {
      // Movimento dinâmico e gracioso no celular (sem precisar de toque)
      anchor.targetX = width * (0.50 + 0.22 * Math.sin(time * 0.00034));
      anchor.targetY = viewH * (0.40 + 0.16 * Math.cos(time * 0.00028));
    }

    // Segue o mouse rapidamente quando em movimento (0.13), ou flutua suavemente quando parado (0.045)
    const follow = isMobile ? 0.045 : (anchor.isMoving ? 0.13 : 0.045);
    anchor.x += (anchor.targetX - anchor.x) * follow;
    anchor.y += (anchor.targetY - anchor.y) * follow;

    // Vagueio dinâmico rico quando o cursor está parado: as cores continuam dançando e passeando
    const wanderX = (Math.sin(time * 0.00050) * 0.15 + Math.cos(time * 0.00029) * 0.08) * width * anchor.idleBlend;
    const wanderY = (Math.cos(time * 0.00044) * 0.13 + Math.sin(time * 0.00058) * 0.06) * viewH * anchor.idleBlend;
    const centerX = anchor.x + wanderX;
    const centerY = Math.min(Math.max(anchor.y + wanderY, viewH * 0.12), viewH * 0.95);

    // Raio da órbita das bolinhas: concentrado no cursor ativo e dançante quando solto
    const orbitBase = (isMobile ? 0.18 : 0.15) * width * (0.65 + 0.45 * anchor.idleBlend) + 50;
    const sizeScale = isMobile ? 0.72 : 1.0;

    // Manchas inferiores de transição com o vídeo
    for (let i = 0; i < lowerBlobs.length; i++) {
      const b = lowerBlobs[i];
      const bx = width * b.xr + Math.sin(time * b.speed + b.phase) * width * 0.09;
      const by = height * b.yr + Math.cos(time * b.speed * 0.85 + b.phase) * viewH * 0.08;
      const wave = Math.sin(time * 0.00028 + b.phase);
      const rad = b.radius * sizeScale * (1 + wave * 0.12);
      drawSoftBlob(bx, by, rad, b.r, b.g, b.b, b.alpha + wave * 0.04);
    }

    // Cores principais: giram em órbitas contínuas e tecem um degradê vivo de roxo, laranja, azul e ciano
    for (let i = 0; i < blobs.length; i++) {
      const blob = blobs[i];
      const ang = blob.angle + time * blob.speed;
      const orbitX = orbitBase * blob.orbitX * (1 + 0.22 * Math.sin(time * 0.00032 + i * 0.9));
      const orbitY = orbitBase * blob.orbitY * (1 + 0.18 * Math.cos(time * 0.00028 + i * 1.1));
      const desiredX = centerX + Math.cos(ang) * orbitX;
      const desiredY = centerY + Math.sin(ang * 0.92) * orbitY * 0.68;

      if (!blob.ready) {
        blob.x = desiredX;
        blob.y = desiredY;
        blob.ready = true;
      }

      const blobFollow = anchor.isMoving ? 0.12 : 0.06;
      blob.x += (desiredX - blob.x) * blobFollow;
      blob.y += (desiredY - blob.y) * blobFollow;

      const wave = Math.sin(time * blob.breathe + i * 1.25);
      const rad = blob.radius * sizeScale * (1 + wave * 0.12);
      drawSoftBlob(blob.x, blob.y, rad, blob.r, blob.g, blob.b, blob.alpha + wave * 0.06);
    }

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

  const autonomousBlobs = [
    { r: 138, g: 43,  b: 226, baseRadius: 280, xRatio: 0.24, yRatio: 0.35, speedX:  0.00052, speedY:  0.00038, ampX: 0.22, ampY: 0.24, phase: 0.0, alpha: 0.46 }, // Roxo
    { r: 255, g: 110, b: 20,  baseRadius: 260, xRatio: 0.78, yRatio: 0.30, speedX: -0.00045, speedY:  0.00046, ampX: 0.20, ampY: 0.22, phase: 1.5, alpha: 0.44 }, // Laranja
    { r: 27,  g: 98,  b: 248, baseRadius: 310, xRatio: 0.50, yRatio: 0.70, speedX:  0.00042, speedY: -0.00040, ampX: 0.25, ampY: 0.20, phase: 3.1, alpha: 0.48 }, // Azul Royal
    { r: 0,   g: 215, b: 255, baseRadius: 250, xRatio: 0.82, yRatio: 0.75, speedX: -0.00048, speedY:  0.00036, ampX: 0.21, ampY: 0.23, phase: 4.4, alpha: 0.40 }, // Ciano
    { r: 242, g: 42,  b: 142, baseRadius: 240, xRatio: 0.22, yRatio: 0.68, speedX:  0.00050, speedY: -0.00042, ampX: 0.19, ampY: 0.21, phase: 5.6, alpha: 0.42 }, // Magenta
    { r: 255, g: 168, b: 24,  baseRadius: 230, xRatio: 0.55, yRatio: 0.32, speedX: -0.00039, speedY:  0.00049, ampX: 0.23, ampY: 0.19, phase: 2.3, alpha: 0.38 }  // Âmbar
  ];

  function drawContactBlob(x, y, rad, r, g, b, alpha) {
    if (rad <= 0 || alpha <= 0) return;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0.00, `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`);
    grad.addColorStop(0.28, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.70).toFixed(3)})`);
    grad.addColorStop(0.58, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.34).toFixed(3)})`);
    grad.addColorStop(0.82, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.10).toFixed(3)})`);
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
      const alpha = b.alpha + breathe * 0.05;

      drawContactBlob(x, y, rad, b.r, b.g, b.b, alpha);
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
    const minScale = isMobileView ? 0.88 : 0.60;
    const scale = minScale + (1 - minScale) * factor;
    videoCard.style.transform = `scale3d(${scale.toFixed(4)}, ${scale.toFixed(4)}, 1)`;
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

  // Dados dos Álbuns (Fotos de cada card)
  const albumsData = [
    {
      category: 'Retratos Corporativos',
      title: 'Posicionamento & Naturalidade',
      photos: [
        'assets/foto-socios.jpg',
        'assets/foto-socios-2.jpg',
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    {
      category: 'Profissionais Trabalhando',
      title: 'Rotina Executiva & Equipes',
      photos: [
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    {
      category: 'Audiovisual',
      title: 'Storytelling de Marca',
      photos: [
        'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    {
      category: 'Profissionais Trabalhando',
      title: 'Bastidores & Autenticidade',
      photos: [
        'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    {
      category: 'Retratos Corporativos',
      title: 'Direção Executiva',
      photos: [
        'assets/foto-socios-2.jpg',
        'assets/foto-socios.jpg',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    {
      category: 'Audiovisual & Set',
      title: 'Captação de Alta Performance',
      photos: [
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80'
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
