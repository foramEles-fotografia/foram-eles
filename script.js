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
   1º CONTAINER: CANVAS DE CORES INTERATIVO ULTRA-LEVE
   ========================================================================== */
(function () {
  const canvas = document.getElementById('breathing-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  let width = 0;
  let height = 0;
  let heroViewportH = window.innerHeight;
  let renderScale = 0.2;
  let initialized = false;
  let isHeroVisible = true;
  let rafId = 0;

  // Âncora persistente: nunca reseta para o centro quando o mouse para ou sai!
  const anchor = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    isMoving: false,
    lastMoveTime: 0,
    dispersion: 0.28,
    targetDispersion: 0.28
  };

  function resize() {
    const parent = canvas.parentElement;
    if (!parent) return;
    const prevWidth = width || parent.offsetWidth || window.innerWidth;
    const prevHeight = height || parent.offsetHeight || window.innerHeight * 2;

    width = parent.offsetWidth || window.innerWidth;
    height = parent.offsetHeight || window.innerHeight * 2;
    heroViewportH = window.innerHeight;

    // Buffer reduzido: 96% menos pixels para processar e desfoque natural via interpolação da GPU
    renderScale = width <= 768 ? 0.14 : 0.20;
    canvas.width = Math.max(64, Math.round(width * renderScale));
    canvas.height = Math.max(64, Math.round(height * renderScale));
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);

    if (!initialized) {
      anchor.x = width * 0.5;
      anchor.y = heroViewportH * 0.34;
      anchor.targetX = width * 0.5;
      anchor.targetY = heroViewportH * 0.34;
      initialized = true;
    } else {
      anchor.x = (anchor.x / prevWidth) * width;
      anchor.y = (anchor.y / prevHeight) * height;
      anchor.targetX = (anchor.targetX / prevWidth) * width;
      anchor.targetY = (anchor.targetY / prevHeight) * height;
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  // Gradientes radiais amplos e suaves (substituem o antigo CSS filter:blur pesado)
  const colorConfigs = [
    { r: 27,  g: 98,  b: 248, baseRadius: 275, breatheSpeed: 0.00028, driftSpeedX: 0.00009, driftSpeedY: 0.00011, spreadX: 0.12, spreadY: 0.07, phase: 0.0 }, // Azul Royal
    { r: 0,   g: 204, b: 255, baseRadius: 255, breatheSpeed: 0.00031, driftSpeedX: 0.00010, driftSpeedY: 0.00008, spreadX: 0.13, spreadY: 0.08, phase: 1.3 }, // Ciano / Aqua
    { r: 16,  g: 185, b: 129, baseRadius: 235, breatheSpeed: 0.00026, driftSpeedX: 0.00008, driftSpeedY: 0.00010, spreadX: 0.11, spreadY: 0.07, phase: 2.6 }, // Verde Esmeralda / Teal
    { r: 124, g: 58,  b: 237, baseRadius: 260, breatheSpeed: 0.00024, driftSpeedX: 0.00009, driftSpeedY: 0.00009, spreadX: 0.13, spreadY: 0.08, phase: 3.9 }, // Violeta / Índigo
    { r: 217, g: 70,  b: 239, baseRadius: 225, breatheSpeed: 0.00029, driftSpeedX: 0.00011, driftSpeedY: 0.00009, spreadX: 0.11, spreadY: 0.06, phase: 5.2 }  // Magenta / Lilás
  ];

  const blobs = colorConfigs.map((cfg, i) => {
    const angle = (i / colorConfigs.length) * Math.PI * 2;
    return {
      ...cfg,
      x: anchor.x + Math.cos(angle) * (width * 0.07),
      y: anchor.y + Math.sin(angle) * (heroViewportH * 0.07)
    };
  });

  // Blobs sutis de continuidade na faixa do vídeo (sem linha ou corte seco antes do vídeo)
  const lowerContinuationBlobs = [
    { r: 27,  g: 98,  b: 248, baseRadius: 310, xRatio: 0.34, yRatio: 0.46, speed: 0.00011, phase: 0.8 },
    { r: 0,   g: 204, b: 255, baseRadius: 285, xRatio: 0.66, yRatio: 0.54, speed: 0.00010, phase: 2.4 },
    { r: 124, g: 58,  b: 237, baseRadius: 270, xRatio: 0.50, yRatio: 0.66, speed: 0.00009, phase: 4.1 }
  ];

  window.addEventListener('mousemove', (e) => {
    if (!isHeroVisible) return;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const relX = e.clientX;
    const relY = e.clientY + scrollY;

    if (relY >= 0 && relY <= heroViewportH * 1.15 && relX >= 0 && relX <= width) {
      anchor.targetX = relX;
      anchor.targetY = Math.min(relY, heroViewportH * 0.85);
      anchor.isMoving = true;
      anchor.lastMoveTime = performance.now();
      anchor.targetDispersion = 0.16;
    } else {
      anchor.isMoving = false;
      anchor.targetDispersion = 0.34;
    }
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    anchor.isMoving = false;
    anchor.targetDispersion = 0.34;
  });

  function drawSoftBlob(x, y, rad, r, g, b, peakAlpha) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${peakAlpha.toFixed(3)})`);
    grad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${(peakAlpha * 0.62).toFixed(3)})`);
    grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${(peakAlpha * 0.22).toFixed(3)})`);
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

    if (anchor.isMoving && time - anchor.lastMoveTime > 900) {
      anchor.isMoving = false;
      anchor.targetDispersion = 0.34;
    }

    if (!anchor.isMoving) {
      anchor.targetX += Math.sin(time * 0.00018) * 0.16;
      anchor.targetY += Math.cos(time * 0.00015) * 0.14;

      const padX = width * 0.16;
      const minY = heroViewportH * 0.18;
      const maxY = heroViewportH * 0.82;
      if (anchor.targetX < padX) anchor.targetX += 0.25;
      if (anchor.targetX > width - padX) anchor.targetX -= 0.25;
      if (anchor.targetY < minY) anchor.targetY += 0.25;
      if (anchor.targetY > maxY) anchor.targetY -= 0.25;
    }

    const anchorEase = anchor.isMoving ? 0.14 : 0.025;
    anchor.x += (anchor.targetX - anchor.x) * anchorEase;
    anchor.y += (anchor.targetY - anchor.y) * anchorEase;

    const dispEase = anchor.isMoving ? 0.06 : 0.008;
    anchor.dispersion += (anchor.targetDispersion - anchor.dispersion) * dispEase;

    const mobileScale = width <= 768 ? 0.68 : 1;

    // 1. Blobs sutis de extensão atrás do vídeo
    for (let i = 0; i < lowerContinuationBlobs.length; i++) {
      const b = lowerContinuationBlobs[i];
      const bx = width * b.xRatio + Math.sin(time * b.speed + b.phase) * (width * 0.08);
      const by = height * b.yRatio + Math.cos(time * b.speed * 0.9 + b.phase) * (heroViewportH * 0.07);
      const rad = b.baseRadius * mobileScale * (1 + Math.sin(time * 0.00022 + b.phase) * 0.1);
      drawSoftBlob(bx, by, rad, b.r, b.g, b.b, 0.24);
    }

    // 2. Blobs principais interativos
    for (let idx = 0; idx < blobs.length; idx++) {
      const blob = blobs[idx];
      const angle = time * blob.driftSpeedX + blob.phase + idx * 1.25;
      const secondaryAngle = time * blob.driftSpeedY - blob.phase;

      const organicOffsetX =
        (Math.cos(angle) * (width * blob.spreadX) +
          Math.sin(secondaryAngle) * (width * 0.04)) *
        anchor.dispersion;

      const organicOffsetY =
        (Math.sin(angle * 0.9) * (heroViewportH * blob.spreadY * 1.6) +
          Math.cos(secondaryAngle * 1.1) * (heroViewportH * 0.04)) *
        anchor.dispersion;

      const desiredX = anchor.x + organicOffsetX;
      const desiredY = anchor.y + organicOffsetY;

      const blobFollow = anchor.isMoving ? 0.11 : 0.02;
      blob.x += (desiredX - blob.x) * blobFollow;
      blob.y += (desiredY - blob.y) * blobFollow;

      const breatheWave = Math.sin(time * blob.breatheSpeed + blob.phase);
      const currentRadius = blob.baseRadius * mobileScale * (1 + breatheWave * 0.11);
      const alpha = 0.46 + breatheWave * 0.05;

      drawSoftBlob(blob.x, blob.y, currentRadius, blob.r, blob.g, blob.b, alpha);
    }

    rafId = requestAnimationFrame(animate);
  }

  // Pausa o canvas do 1º container automaticamente quando ele sai da tela!
  if ('IntersectionObserver' in window && canvas.parentElement) {
    const heroObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isHeroVisible = entry.isIntersecting;
          if (isHeroVisible && !rafId) {
            rafId = requestAnimationFrame(animate);
          }
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

  // Pausa o vídeo automaticamente quando fora da tela para não gastar GPU/CPU à toa
  if (videoEl) {
    videoEl.muted = true;
    const tryPlay = () => {
      videoEl.play().catch(() => {});
    };

    if ('IntersectionObserver' in window) {
      const videoObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              tryPlay();
            } else {
              videoEl.pause();
            }
          });
        },
        { rootMargin: '150px 0px' }
      );
      videoObs.observe(track);
    } else {
      tryPlay();
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
});
