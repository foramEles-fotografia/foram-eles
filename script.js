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
   1º CONTAINER: CANVAS DE CORES ULTRA-LEVE
   - Desktop: segue o mouse; quando o mouse para ou sai da tela, as cores ficam na última
     posição e passam a girar/vaguear devagar (nunca resetam).
   - Celular: sem interação; as cores andam e giram sozinhas.
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
  let renderScale = 0.2;
  let initialized = false;
  let isHeroVisible = true;
  let rafId = 0;

  // Âncora persistente: nunca volta para o centro
  const anchor = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    isMoving: false,
    lastMoveTime: 0,
    idleBlend: 1 // 0 = mouse ativo, 1 = vagueando sozinho
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

    renderScale = isMobile ? 0.14 : 0.2;
    canvas.width = Math.max(64, Math.round(width * renderScale));
    canvas.height = Math.max(64, Math.round(height * renderScale));
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);

    if (!initialized) {
      anchor.x = anchor.targetX = width * 0.5;
      anchor.y = anchor.targetY = viewH * 0.36;
      initialized = true;
    } else {
      anchor.x = (anchor.x / prevW) * width;
      anchor.y = (anchor.y / prevH) * height;
      anchor.targetX = (anchor.targetX / prevW) * width;
      anchor.targetY = (anchor.targetY / prevH) * height;
    }
  }

  // Ignora o "resize" causado pela barra de endereço do celular (só redimensiona se a largura mudar)
  window.addEventListener('resize', () => {
    const parent = canvas.parentElement;
    if (parent && parent.offsetWidth === width && Math.abs(window.innerHeight - viewH) < 160) return;
    resize();
  }, { passive: true });
  resize();

  // Cada cor tem seu próprio ângulo em volta da âncora, assim nenhuma cor engole as outras
  const palette = [
    { r: 27,  g: 98,  b: 248, radius: 250, angle: 0.0,  orbit: 1.0,  speed: 0.00042, breathe: 0.00028 }, // Azul
    { r: 0,   g: 212, b: 255, radius: 235, angle: 1.26, orbit: 1.15, speed: -0.00036, breathe: 0.00031 }, // Ciano
    { r: 20,  g: 205, b: 140, radius: 225, angle: 2.51, orbit: 0.95, speed: 0.00033, breathe: 0.00026 }, // Verde água
    { r: 150, g: 70,  b: 255, radius: 245, angle: 3.77, orbit: 1.2,  speed: -0.00039, breathe: 0.00024 }, // Violeta
    { r: 255, g: 90,  b: 200, radius: 215, angle: 5.03, orbit: 1.05, speed: 0.0003,  breathe: 0.00029 }  // Rosa
  ];

  const blobs = palette.map((p) => ({ ...p, x: 0, y: 0, ready: false }));

  // Manchas suaves por trás do vídeo (sem corte seco entre o 1º container e o vídeo)
  const lowerBlobs = [
    { r: 27,  g: 98,  b: 248, radius: 300, xr: 0.30, yr: 0.46, speed: 0.00011, phase: 0.8 },
    { r: 0,   g: 212, b: 255, radius: 280, xr: 0.68, yr: 0.54, speed: 0.0001,  phase: 2.4 },
    { r: 150, g: 70,  b: 255, radius: 265, xr: 0.50, yr: 0.66, speed: 0.00009, phase: 4.1 }
  ];

  function pointerMove(x, y) {
    if (isMobile || !isHeroVisible) return;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const absY = y + scrollY;
    if (absY >= 0 && absY <= viewH * 1.15 && x >= 0 && x <= width) {
      anchor.targetX = x;
      anchor.targetY = Math.min(absY, viewH * 0.85);
      anchor.isMoving = true;
      anchor.lastMoveTime = performance.now();
    } else {
      anchor.isMoving = false;
    }
  }

  window.addEventListener('mousemove', (e) => pointerMove(e.clientX, e.clientY), { passive: true });
  document.addEventListener('mouseleave', () => { anchor.isMoving = false; });

  function drawSoftBlob(x, y, rad, r, g, b, alpha) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`);
    grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.6).toFixed(3)})`);
    grad.addColorStop(0.75, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.2).toFixed(3)})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
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

    // Mouse parado por ~0,8s => passa a vaguear sozinho
    if (anchor.isMoving && time - anchor.lastMoveTime > 800) {
      anchor.isMoving = false;
    }

    // No celular está sempre vagueando; no desktop só quando o mouse não está ativo
    const wantIdle = isMobile || !anchor.isMoving ? 1 : 0;
    anchor.idleBlend += (wantIdle - anchor.idleBlend) * (wantIdle ? 0.012 : 0.08);

    if (isMobile) {
      // Caminho lento e orgânico pela parte de cima da tela
      anchor.targetX = width * (0.5 + 0.2 * Math.sin(time * 0.00021));
      anchor.targetY = viewH * (0.38 + 0.13 * Math.cos(time * 0.00017));
    }

    const follow = isMobile ? 0.03 : anchor.isMoving ? 0.14 : 0.03;
    anchor.x += (anchor.targetX - anchor.x) * follow;
    anchor.y += (anchor.targetY - anchor.y) * follow;

    // Vagueio a partir da última posição (cresce devagar, então não "salta")
    const wanderX = Math.sin(time * 0.00034) * width * 0.1 * anchor.idleBlend;
    const wanderY = Math.cos(time * 0.00028) * viewH * 0.09 * anchor.idleBlend;
    const centerX = anchor.x + wanderX;
    const centerY = Math.min(Math.max(anchor.y + wanderY, viewH * 0.14), viewH * 0.88);

    // Raio da órbita: junto no mouse ativo, aberto quando está livre
    const orbitBase = (isMobile ? 0.17 : 0.14) * width * (0.5 + 0.5 * anchor.idleBlend) + 40;
    const sizeScale = isMobile ? 0.7 : 1;

    // Faixa por trás do vídeo
    for (let i = 0; i < lowerBlobs.length; i++) {
      const b = lowerBlobs[i];
      const bx = width * b.xr + Math.sin(time * b.speed + b.phase) * width * 0.08;
      const by = height * b.yr + Math.cos(time * b.speed * 0.9 + b.phase) * viewH * 0.07;
      const rad = b.radius * sizeScale * (1 + Math.sin(time * 0.00022 + b.phase) * 0.1);
      drawSoftBlob(bx, by, rad, b.r, b.g, b.b, 0.22);
    }

    // Cores principais: giram em volta do centro, cada uma no seu ritmo
    for (let i = 0; i < blobs.length; i++) {
      const blob = blobs[i];
      const ang = blob.angle + time * blob.speed;
      const orbit = orbitBase * blob.orbit * (1 + 0.18 * Math.sin(time * 0.00021 + i));
      const desiredX = centerX + Math.cos(ang) * orbit;
      const desiredY = centerY + Math.sin(ang * 0.9) * orbit * 0.62;

      if (!blob.ready) {
        blob.x = desiredX;
        blob.y = desiredY;
        blob.ready = true;
      }
      const blobFollow = anchor.isMoving ? 0.1 : 0.05;
      blob.x += (desiredX - blob.x) * blobFollow;
      blob.y += (desiredY - blob.y) * blobFollow;

      const wave = Math.sin(time * blob.breathe + i * 1.3);
      const rad = blob.radius * sizeScale * (1 + wave * 0.1);
      drawSoftBlob(blob.x, blob.y, rad, blob.r, blob.g, blob.b, 0.58 + wave * 0.05);
    }

    rafId = requestAnimationFrame(animate);
  }

  // Pausa quando o 1º container sai da tela
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
   (Só roda quando o card de contato está visível na tela!)
   ========================================================================== */
(function () {
  const contactCanvas = document.getElementById('contact-breathing-canvas');
  if (!contactCanvas) return;
  const ctx = contactCanvas.getContext('2d', { alpha: true });

  let width = 0;
  let height = 0;
  let renderScale = 0.18;
  let isContactVisible = false;
  let contactRafId = 0;

  function resizeContactCanvas() {
    const parent = contactCanvas.parentElement;
    if (!parent) return;
    width = Math.max(260, parent.offsetWidth);
    height = Math.max(220, parent.offsetHeight);
    renderScale = width <= 768 ? 0.14 : 0.18;
    contactCanvas.width = Math.max(48, Math.round(width * renderScale));
    contactCanvas.height = Math.max(48, Math.round(height * renderScale));
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  }

  window.addEventListener('resize', resizeContactCanvas, { passive: true });
  resizeContactCanvas();

  const autonomousBlobs = [
    { r: 27,  g: 98,  b: 248, baseRadius: 245, xRatio: 0.22, yRatio: 0.32, speedX: 0.00024, speedY: 0.00019, ampX: 0.22, ampY: 0.24, phase: 0.0 },
    { r: 0,   g: 204, b: 255, baseRadius: 225, xRatio: 0.76, yRatio: 0.28, speedX: 0.00021, speedY: 0.00025, ampX: 0.20, ampY: 0.22, phase: 1.4 },
    { r: 16,  g: 185, b: 129, baseRadius: 210, xRatio: 0.48, yRatio: 0.72, speedX: 0.00019, speedY: 0.00022, ampX: 0.24, ampY: 0.20, phase: 2.8 },
    { r: 124, g: 58,  b: 237, baseRadius: 235, xRatio: 0.80, yRatio: 0.74, speedX: 0.00023, speedY: 0.00018, ampX: 0.21, ampY: 0.23, phase: 4.2 },
    { r: 217, g: 70,  b: 239, baseRadius: 200, xRatio: 0.26, yRatio: 0.68, speedX: 0.00025, speedY: 0.00021, ampX: 0.19, ampY: 0.21, phase: 5.5 }
  ];

  function animateContact(time) {
    if (!isContactVisible) {
      contactRafId = 0;
      return;
    }

    ctx.clearRect(0, 0, width, height);
    const mobileScale = width <= 600 ? 0.72 : 1;

    for (let i = 0; i < autonomousBlobs.length; i++) {
      const b = autonomousBlobs[i];
      const x =
        width * b.xRatio +
        Math.sin(time * b.speedX + b.phase) * (width * b.ampX) +
        Math.cos(time * b.speedY * 0.8 - b.phase) * (width * 0.06);

      const y =
        height * b.yRatio +
        Math.cos(time * b.speedY + b.phase) * (height * b.ampY) +
        Math.sin(time * b.speedX * 0.7 + b.phase) * (height * 0.06);

      const breathe = Math.sin(time * 0.0003 + b.phase);
      const rad = b.baseRadius * mobileScale * (1 + breathe * 0.12);
      const alpha = 0.36 + breathe * 0.04;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, `rgba(${b.r}, ${b.g}, ${b.b}, ${alpha.toFixed(3)})`);
      grad.addColorStop(0.4, `rgba(${b.r}, ${b.g}, ${b.b}, ${(alpha * 0.58).toFixed(3)})`);
      grad.addColorStop(0.75, `rgba(${b.r}, ${b.g}, ${b.b}, ${(alpha * 0.2).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${b.r}, ${b.g}, ${b.b}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
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
    const maxRadius = isMobileView ? 22 : 32;

    const scale = minScale + (1 - minScale) * factor;
    const radius = maxRadius * (1 - factor);

    videoCard.style.transform = `scale3d(${scale.toFixed(4)}, ${scale.toFixed(4)}, 1)`;
    videoCard.style.borderRadius = `${radius.toFixed(1)}px`;
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
