/**
 * FORAM Eles. — Script Principal
 * 1. 1º Container (#breathing-canvas):
 *    - Degradê colorido mais concentrado (ocupando menos área para não tomar a tela toda).
 *    - Estende-se por trás do container do vídeo até perto do final do vídeo (sem linha ou corte seco).
 *    - Acompanha o mouse com fluidez; quando o cursor para ou sai da janela, permanece na última posição e dispersa devagar.
 * 2. 2º Container (#destaque / #video-expand-card):
 *    - No 1º scroll, enquanto o vídeo sobe até o centro da tela, ele já vai crescendo gradualmente de 60% até 100%,
 *      chegando em 100% da tela exatamente quando atinge o centro.
 *    - Permanece em 100% no centro por mais uma scrollada e depois volta suavemente para o tamanho de origem (60%).
 * 3. 3º Container (#portfolio / #album-modal):
 *    - Cards estilo pilhas de cartas Apple (de 2 commits atrás) + Modal com fundo desfocado ao clicar.
 * 4. 6º Container (#contact-breathing-canvas):
 *    - Mesmo efeito das cores em degradê desfocadas dentro do card limitado do WhatsApp/Contato,
 *      porém de forma autônoma (não interativa), apenas se movimentando suavemente lá dentro.
 */

/* ==========================================================================
   1º CONTAINER: CANVAS DE CORES INTERATIVO (MAIS CONCENTRADO E ESTENDIDO ATÉ O VÍDEO)
   ========================================================================== */
(function () {
  const canvas = document.getElementById('breathing-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let heroViewportH = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let initialized = false;

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
    const rect = canvas.parentElement.getBoundingClientRect();
    const prevWidth = width || rect.width;
    const prevHeight = height || rect.height;

    width = rect.width;
    height = rect.height;
    heroViewportH = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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

  window.addEventListener('resize', resize);
  resize();

  // Raios menores e espalhamento reduzido para não ocupar a tela toda, mantendo o degradê rico
  const colorConfigs = [
    { r: 27,  g: 98,  b: 248, baseRadius: 210, breatheSpeed: 0.00028, driftSpeedX: 0.00009, driftSpeedY: 0.00011, spreadX: 0.12, spreadY: 0.07, phase: 0.0 }, // Azul Royal
    { r: 0,   g: 204, b: 255, baseRadius: 190, breatheSpeed: 0.00031, driftSpeedX: 0.00010, driftSpeedY: 0.00008, spreadX: 0.13, spreadY: 0.08, phase: 1.3 }, // Ciano / Aqua
    { r: 16,  g: 185, b: 129, baseRadius: 175, breatheSpeed: 0.00026, driftSpeedX: 0.00008, driftSpeedY: 0.00010, spreadX: 0.11, spreadY: 0.07, phase: 2.6 }, // Verde Esmeralda / Teal
    { r: 124, g: 58,  b: 237, baseRadius: 195, breatheSpeed: 0.00024, driftSpeedX: 0.00009, driftSpeedY: 0.00009, spreadX: 0.13, spreadY: 0.08, phase: 3.9 }, // Violeta / Índigo
    { r: 217, g: 70,  b: 239, baseRadius: 165, breatheSpeed: 0.00029, driftSpeedX: 0.00011, driftSpeedY: 0.00009, spreadX: 0.11, spreadY: 0.06, phase: 5.2 }  // Magenta / Lilás
  ];

  const blobs = colorConfigs.map((cfg, i) => {
    const angle = (i / colorConfigs.length) * Math.PI * 2;
    return {
      ...cfg,
      x: anchor.x + Math.cos(angle) * (width * 0.07),
      y: anchor.y + Math.sin(angle) * (heroViewportH * 0.07)
    };
  });

  // Blobs sutis de continuidade na faixa do vídeo (para que o 1º container se estenda até lá pro final do vídeo sem corte)
  const lowerContinuationBlobs = [
    { r: 27,  g: 98,  b: 248, baseRadius: 235, xRatio: 0.34, yRatio: 0.46, speed: 0.00011, phase: 0.8 },
    { r: 0,   g: 204, b: 255, baseRadius: 215, xRatio: 0.66, yRatio: 0.54, speed: 0.00010, phase: 2.4 },
    { r: 124, g: 58,  b: 237, baseRadius: 205, xRatio: 0.50, yRatio: 0.66, speed: 0.00009, phase: 4.1 }
  ];

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    // Interage na região superior/central sem puxar tudo para fora nem resetar
    if (relY >= 0 && relY <= heroViewportH * 1.15 && relX >= 0 && relX <= rect.width) {
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

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const relX = e.touches[0].clientX - rect.left;
      const relY = e.touches[0].clientY - rect.top;
      if (relY >= 0 && relY <= heroViewportH * 1.15 && relX >= 0 && relX <= rect.width) {
        anchor.targetX = relX;
        anchor.targetY = Math.min(relY, heroViewportH * 0.85);
        anchor.isMoving = true;
        anchor.lastMoveTime = performance.now();
        anchor.targetDispersion = 0.16;
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    anchor.isMoving = false;
    anchor.targetDispersion = 0.34;
  });

  function animate(time) {
    ctx.clearRect(0, 0, width, height);

    if (anchor.isMoving && time - anchor.lastMoveTime > 900) {
      anchor.isMoving = false;
      anchor.targetDispersion = 0.34;
    }

    if (!anchor.isMoving) {
      // Movimento orgânico bem lento na última posição conhecida (nunca volta para o centro!)
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

    // 1. Desenha os blobs sutis de extensão atrás do container do vídeo
    lowerContinuationBlobs.forEach((b) => {
      const bx = width * b.xRatio + Math.sin(time * b.speed + b.phase) * (width * 0.09);
      const by = height * b.yRatio + Math.cos(time * b.speed * 0.9 + b.phase) * (heroViewportH * 0.08);
      const rad = b.baseRadius * (1 + Math.sin(time * 0.00022 + b.phase) * 0.12);

      const grad = ctx.createRadialGradient(bx, by, rad * 0.05, bx, by, rad);
      grad.addColorStop(0, `rgba(${b.r}, ${b.g}, ${b.b}, 0.34)`);
      grad.addColorStop(0.55, `rgba(${b.r}, ${b.g}, ${b.b}, 0.16)`);
      grad.addColorStop(1, `rgba(${b.r}, ${b.g}, ${b.b}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, rad, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Desenha o grupo principal interativo em degradê mais concentrado
    blobs.forEach((blob, idx) => {
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
      const currentRadius = blob.baseRadius * (1 + breatheWave * 0.12);
      const alpha = 0.64 + breatheWave * 0.07;

      const grad = ctx.createRadialGradient(
        blob.x,
        blob.y,
        currentRadius * 0.04,
        blob.x,
        blob.y,
        currentRadius
      );

      grad.addColorStop(0, `rgba(${blob.r}, ${blob.g}, ${blob.b}, ${alpha})`);
      grad.addColorStop(0.52, `rgba(${blob.r}, ${blob.g}, ${blob.b}, ${alpha * 0.52})`);
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

/* ==========================================================================
   6º CONTAINER: CANVAS DE CORES AUTÔNOMO DENTRO DO CARD DO WHATSAPP/CONTATO
   (Mesmo degradê colorido do 1º container, porém não interativo — apenas se movendo lá dentro)
   ========================================================================== */
(function () {
  const contactCanvas = document.getElementById('contact-breathing-canvas');
  if (!contactCanvas) return;
  const ctx = contactCanvas.getContext('2d');

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resizeContactCanvas() {
    const rect = contactCanvas.parentElement.getBoundingClientRect();
    width = Math.max(300, rect.width);
    height = Math.max(240, rect.height);
    contactCanvas.width = width * dpr;
    contactCanvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resizeContactCanvas);
  resizeContactCanvas();

  const autonomousBlobs = [
    { r: 27,  g: 98,  b: 248, baseRadius: 195, xRatio: 0.22, yRatio: 0.32, speedX: 0.00024, speedY: 0.00019, ampX: 0.22, ampY: 0.24, phase: 0.0 }, // Azul Royal
    { r: 0,   g: 204, b: 255, baseRadius: 180, xRatio: 0.76, yRatio: 0.28, speedX: 0.00021, speedY: 0.00025, ampX: 0.20, ampY: 0.22, phase: 1.4 }, // Ciano
    { r: 16,  g: 185, b: 129, baseRadius: 165, xRatio: 0.48, yRatio: 0.72, speedX: 0.00019, speedY: 0.00022, ampX: 0.24, ampY: 0.20, phase: 2.8 }, // Verde Esmeralda
    { r: 124, g: 58,  b: 237, baseRadius: 185, xRatio: 0.80, yRatio: 0.74, speedX: 0.00023, speedY: 0.00018, ampX: 0.21, ampY: 0.23, phase: 4.2 }, // Violeta
    { r: 217, g: 70,  b: 239, baseRadius: 160, xRatio: 0.26, yRatio: 0.68, speedX: 0.00025, speedY: 0.00021, ampX: 0.19, ampY: 0.21, phase: 5.5 }  // Lilás / Magenta
  ];

  function animateContact(time) {
    ctx.clearRect(0, 0, width, height);

    autonomousBlobs.forEach((b) => {
      const x =
        width * b.xRatio +
        Math.sin(time * b.speedX + b.phase) * (width * b.ampX) +
        Math.cos(time * b.speedY * 0.8 - b.phase) * (width * 0.06);

      const y =
        height * b.yRatio +
        Math.cos(time * b.speedY + b.phase) * (height * b.ampY) +
        Math.sin(time * b.speedX * 0.7 + b.phase) * (height * 0.06);

      const breathe = Math.sin(time * 0.0003 + b.phase);
      const rad = b.baseRadius * (1 + breathe * 0.14);
      const alpha = 0.52 + breathe * 0.06;

      const grad = ctx.createRadialGradient(x, y, rad * 0.05, x, y, rad);
      grad.addColorStop(0, `rgba(${b.r}, ${b.g}, ${b.b}, ${alpha})`);
      grad.addColorStop(0.55, `rgba(${b.r}, ${b.g}, ${b.b}, ${alpha * 0.5})`);
      grad.addColorStop(1, `rgba(${b.r}, ${b.g}, ${b.b}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(animateContact);
  }

  requestAnimationFrame(animateContact);
})();

/* ==========================================================================
   2º CONTAINER: TRANSIÇÃO GRADUAL DO VÍDEO DESDE O PRIMEIRO SCROLL
   - No scrollY = 0, o vídeo já está visível em 60% na parte de baixo do 1º container.
   - Conforme você faz o 1º scroll e o vídeo vai subindo até o centro da tela,
     ele já vai crescendo gradualmente para, quando chegar no centro, já estar em 100%!
   - Mais uma scrollada mantém 100% ali no meio.
   - Depois ele vai voltando suavemente para o tamanho de origem (60%).
   ========================================================================== */
(function () {
  const track = document.getElementById('destaque');
  const videoCard = document.getElementById('video-expand-card');
  const videoEl = document.getElementById('showcase-video');
  if (!track || !videoCard) return;

  if (videoEl) {
    videoEl.muted = true;
    const tryPlay = () => {
      videoEl.play().catch(() => {});
    };
    tryPlay();
    window.addEventListener('scroll', tryPlay, { once: true, passive: true });
    window.addEventListener('click', tryPlay, { once: true, passive: true });
  }

  let initialTrackTop = 0;
  let currentFactor = 0;
  let targetFactor = 0;

  function measureTrackOrigin() {
    const rect = track.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset || 0;
    initialTrackTop = Math.max(120, rect.top + scrollY);
  }

  window.addEventListener('resize', measureTrackOrigin);
  window.addEventListener('load', measureTrackOrigin);
  measureTrackOrigin();

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function smoothstep(t) {
    const c = clamp(t, 0, 1);
    return c * c * (3 - 2 * c);
  }

  function computeTargetFactor() {
    const rect = track.getBoundingClientRect();
    const vh = window.innerHeight;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    if (rect.top > 0) {
      // FASE 1 (1º Scroll): Enquanto o vídeo sobe da posição inicial até o centro da tela (rect.top === 0),
      // ele cresce gradualmente de 0 (60%) até 1 (100% da tela)!
      const growDist = Math.max(100, initialTrackTop);
      const rawGrow = clamp(scrollY / growDist, 0, 1);
      targetFactor = smoothstep(rawGrow);
    } else {
      // O vídeo já chegou no centro da tela (sticky top: 0)!
      const pinnedScrolled = -rect.top;
      const totalPinnedScroll = Math.max(1, track.offsetHeight - vh);

      // FASE 2: Mais uma scrollada mantendo 100% no meio da tela (~48% do curso sticky)
      const holdLimit = totalPinnedScroll * 0.48;

      if (pinnedScrolled <= holdLimit) {
        targetFactor = 1;
      } else if (pinnedScrolled < totalPinnedScroll) {
        // FASE 3: Volta suavemente para o tamanho de origem (60%)
        const shrinkSpan = Math.max(1, totalPinnedScroll - holdLimit);
        const rawShrink = clamp((pinnedScrolled - holdLimit) / shrinkSpan, 0, 1);
        targetFactor = 1 - smoothstep(rawShrink);
      } else {
        targetFactor = 0;
      }
    }
  }

  function renderVideoLoop() {
    computeTargetFactor();
    currentFactor += (targetFactor - currentFactor) * 0.22;

    const isMobile = window.innerWidth <= 720;
    const minScale = isMobile ? 0.86 : 0.60; // 60% de origem

    const scale = minScale + (1 - minScale) * currentFactor;
    const radius = 32 * (1 - currentFactor);

    videoCard.style.transform = `scale3d(${scale.toFixed(4)}, ${scale.toFixed(4)}, 1)`;
    videoCard.style.borderRadius = `${radius.toFixed(1)}px`;

    requestAnimationFrame(renderVideoLoop);
  }

  requestAnimationFrame(renderVideoLoop);
})();

/* ==========================================================================
   3º CONTAINER: TRABALHOS REALIZADOS (CARDS ESTILO APPLE + MODAL COM BLUR)
   ========================================================================== */
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
  }, { passive: true });

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
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85'
      ]
    },
    {
      category: 'Profissionais Trabalhando',
      title: 'Rotina Executiva & Equipes',
      photos: [
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=85'
      ]
    },
    {
      category: 'Audiovisual',
      title: 'Storytelling de Marca',
      photos: [
        'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1200&q=85'
      ]
    },
    {
      category: 'Profissionais Trabalhando',
      title: 'Bastidores & Autenticidade',
      photos: [
        'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=85'
      ]
    },
    {
      category: 'Retratos Corporativos',
      title: 'Direção Executiva',
      photos: [
        'assets/foto-socios-2.jpg',
        'assets/foto-socios.jpg',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=1200&q=85'
      ]
    },
    {
      category: 'Audiovisual & Set',
      title: 'Captação de Alta Performance',
      photos: [
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=85',
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=85'
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
      thumb.innerHTML = `<img src="${src}" alt="Miniatura ${idx + 1}" />`;
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

  if (modalClose) modalClose.addEventListener('click', closeAlbum);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeAlbum);

  window.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') closeAlbum();
    if (e.key === 'ArrowLeft' && prevBtn) prevBtn.click();
    if (e.key === 'ArrowRight' && nextBtn) nextBtn.click();
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
