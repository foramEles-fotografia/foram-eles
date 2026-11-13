/**
 * FORAM Eles — Script Principal
 * 1. Efeito do 1º Container (Cores Vivas Desfocadas sobre Fundo Branco):
 *    - Cores bem visíveis e vibrantes.
 *    - Acompanha o mouse sem atraso exagerado (resposta fluida e imediata).
 *    - Quando o mouse para ou sai do container (ex: vai nas abas do navegador),
 *      NÃO reseta para o centro: permanece na última posição e continua se movendo
 *      e se dispersando bem devagarzinho.
 * 2. Efeito do 2º Container (Vídeo Expansivo GPU-Accelerated):
 *    - Começa em 60% da tela já no 1º container.
 *    - Cresce rápido até 100% da tela logo no início do scroll.
 *    - Permanece em 100% por 2 scrolls e depois reduz suavemente.
 * 3. Modal de Álbum com Fundo Desfocado ao clicar nos cards estilo Apple.
 */

(function () {
  const canvas = document.getElementById('breathing-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let initialized = false;

  // Âncora persistente: nunca reseta para o centro quando o mouse sai!
  const anchor = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    isMoving: false,
    lastMoveTime: 0,
    dispersion: 0.62,
    targetDispersion: 0.62
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
      anchor.y = height * 0.44;
      anchor.targetX = width * 0.5;
      anchor.targetY = height * 0.44;
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

  // Paleta de cores VIVAS e intensas sobre o fundo branco
  const colorConfigs = [
    { r: 27,  g: 98,  b: 248, baseRadius: 340, breatheSpeed: 0.00028, driftSpeedX: 0.00009, driftSpeedY: 0.00011, spreadX: 0.25, spreadY: 0.22, phase: 0.0 }, // Azul Royal FORAM Eles
    { r: 124, g: 58,  b: 237, baseRadius: 310, breatheSpeed: 0.00022, driftSpeedX: 0.00008, driftSpeedY: 0.00009, spreadX: 0.28, spreadY: 0.24, phase: 1.5 }, // Violeta Vivo
    { r: 0,   g: 195, b: 255, baseRadius: 290, breatheSpeed: 0.00030, driftSpeedX: 0.00010, driftSpeedY: 0.00008, spreadX: 0.24, spreadY: 0.20, phase: 3.0 }, // Ciano Intenso
    { r: 255, g: 77,  b: 109, baseRadius: 275, breatheSpeed: 0.00025, driftSpeedX: 0.00009, driftSpeedY: 0.00010, spreadX: 0.27, spreadY: 0.23, phase: 4.4 }, // Coral / Rosa Vivo
    { r: 255, g: 176, b: 25,  baseRadius: 245, breatheSpeed: 0.00029, driftSpeedX: 0.00011, driftSpeedY: 0.00009, spreadX: 0.21, spreadY: 0.19, phase: 5.6 }  // Âmbar Dourado
  ];

  const blobs = colorConfigs.map((cfg, i) => {
    const angle = (i / colorConfigs.length) * Math.PI * 2;
    return {
      ...cfg,
      x: anchor.x + Math.cos(angle) * (width * 0.14),
      y: anchor.y + Math.sin(angle) * (height * 0.14)
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
      // Quando o mouse se move, agrupa suavemente perto do cursor
      anchor.targetDispersion = 0.28;
    } else {
      // Saiu do container: mantém a última posição e dispersa devagar
      anchor.isMoving = false;
      anchor.targetDispersion = 0.72;
    }
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
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
        anchor.targetDispersion = 0.28;
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    anchor.isMoving = false;
    anchor.targetDispersion = 0.72;
  });

  function animate(time) {
    ctx.clearRect(0, 0, width, height);

    // Se o mouse parou por mais de 450ms, entra em modo pausado e dispersa devagarzinho
    if (anchor.isMoving && time - anchor.lastMoveTime > 450) {
      anchor.isMoving = false;
      anchor.targetDispersion = 0.72;
    }

    // Sem delay pesado quando o mouse mexe (0.12), e bem calmo quando parado (0.015)
    const followSpeed = anchor.isMoving ? 0.12 : 0.018;
    anchor.x += (anchor.targetX - anchor.x) * followSpeed;
    anchor.y += (anchor.targetY - anchor.y) * followSpeed;

    // Quando agrupa no mouse é ágil (0.06), quando dispersa parado é bem lento (0.0025)
    const dispersionSpeed = anchor.isMoving ? 0.06 : 0.0025;
    anchor.dispersion += (anchor.targetDispersion - anchor.dispersion) * dispersionSpeed;

    blobs.forEach((blob, i) => {
      const maxOffsetX = Math.min(width, 1080) * blob.spreadX * anchor.dispersion;
      const maxOffsetY = Math.min(height, 760) * blob.spreadY * anchor.dispersion;

      const organicOffsetX =
        Math.cos(time * blob.driftSpeedX + blob.phase) * maxOffsetX +
        Math.sin(time * (blob.driftSpeedX * 0.6) + i * 1.7) * (maxOffsetX * 0.32);

      const organicOffsetY =
        Math.sin(time * blob.driftSpeedY + blob.phase) * maxOffsetY +
        Math.cos(time * (blob.driftSpeedY * 0.65) + i * 1.7) * (maxOffsetY * 0.32);

      const desiredX = anchor.x + organicOffsetX;
      const desiredY = anchor.y + organicOffsetY;

      const blobFollow = anchor.isMoving ? 0.09 : 0.015;
      blob.x += (desiredX - blob.x) * blobFollow;
      blob.y += (desiredY - blob.y) * blobFollow;

      const breatheWave = Math.sin(time * blob.breatheSpeed + blob.phase);
      const currentRadius = blob.baseRadius * (1 + breatheWave * 0.15);
      // Opacidade bem mais viva para destacar no fundo branco!
      const alpha = 0.76 + breatheWave * 0.09;

      const grad = ctx.createRadialGradient(
        blob.x,
        blob.y,
        currentRadius * 0.04,
        blob.x,
        blob.y,
        currentRadius
      );

      grad.addColorStop(0, `rgba(${blob.r}, ${blob.g}, ${blob.b}, ${alpha})`);
      grad.addColorStop(0.5, `rgba(${blob.r}, ${blob.g}, ${blob.b}, ${alpha * 0.55})`);
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
 * 2º CONTAINER: Vídeo Expansivo com GPU Transform (Scale3D) e Crescimento Rápido
 * - Começa em 60% da tela já visível no 1º container
 * - Cresce rápido até 100% da tela logo no começo do scroll
 * - Fica travado em 100% por 2 scrolls e depois reduz suavemente
 */
(function () {
  const track = document.getElementById('destaque');
  const videoCard = document.getElementById('video-expand-card');
  const videoEl = document.getElementById('showcase-video');
  if (!track || !videoCard) return;

  // Garante reprodução automática contínua do vídeo enviado
  if (videoEl) {
    videoEl.muted = true;
    const tryPlay = () => {
      videoEl.play().catch(() => {});
    };
    tryPlay();
    window.addEventListener('scroll', tryPlay, { once: true, passive: true });
    window.addEventListener('click', tryPlay, { once: true, passive: true });
  }

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

    // Cresce rápido de 60% até 100% logo que você começa a rolar para baixo!
    const growStart = -vh * 0.38;
    const growEnd = vh * 0.12;

    // Permanece em 100% da tela durante 2 scrolls (1.55 * vh)
    const holdEnd = growEnd + vh * 1.55;

    // Reduz suavemente de volta para 60% no final
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
    currentFactor += (targetFactor - currentFactor) * 0.16;

    const isMobile = window.innerWidth <= 720;
    const minScale = isMobile ? 0.86 : 0.60; // 60% da tela no 1º container

    const scale = minScale + (1 - minScale) * currentFactor;
    const radius = 32 * (1 - currentFactor);

    videoCard.style.transform = `scale3d(${scale.toFixed(4)}, ${scale.toFixed(4)}, 1)`;
    videoCard.style.borderRadius = `${radius.toFixed(1)}px`;

    requestAnimationFrame(renderVideoLoop);
  }

  requestAnimationFrame(renderVideoLoop);
})();

/**
 * 3º CONTAINER: Modal de Álbum com Fundo Desfocado (abre ao clicar nos cards estilo Apple)
 */
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
