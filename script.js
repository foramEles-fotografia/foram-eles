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

  // Paleta Desktop: alta transparência e orbes amplos e desfocados para visual etéreo, suave e elegante
  const desktopPalette = [
    { r: 138, g: 43,  b: 226, radius: 520, angle: 0.00, orbitX: 1.15, orbitY: 0.95, speed:  0.00078, breathe: 0.00045, alpha: 0.34 }, // Roxo / Violeta suave
    { r: 255, g: 108, b: 20,  radius: 540, angle: 0.95, orbitX: 1.28, orbitY: 1.10, speed: -0.00068, breathe: 0.00048, alpha: 0.32 }, // Laranja pôr-do-sol
    { r: 27,  g: 98,  b: 248, radius: 560, angle: 1.95, orbitX: 0.95, orbitY: 1.05, speed:  0.00060, breathe: 0.00038, alpha: 0.35 }, // Azul Royal da marca
    { r: 0,   g: 216, b: 255, radius: 490, angle: 2.95, orbitX: 1.22, orbitY: 0.88, speed: -0.00065, breathe: 0.00044, alpha: 0.32 }, // Ciano elétrico
    { r: 242, g: 42,  b: 142, radius: 500, angle: 3.90, orbitX: 1.05, orbitY: 1.22, speed:  0.00070, breathe: 0.00040, alpha: 0.32 }, // Rosa / Magenta vivo
    { r: 255, g: 168, b: 24,  radius: 480, angle: 4.85, orbitX: 1.18, orbitY: 0.92, speed: -0.00058, breathe: 0.00042, alpha: 0.30 }, // Âmbar solar
    { r: 112, g: 38,  b: 238, radius: 530, angle: 5.65, orbitX: 0.92, orbitY: 1.18, speed:  0.00064, breathe: 0.00039, alpha: 0.34 }  // Violeta profundo
  ];

  const desktopLowerBlobs = [
    { r: 138, g: 43,  b: 226, radius: 600, xr: 0.28, yr: 0.44, speed: 0.00028, phase: 0.8,  alpha: 0.17 }, // Roxo
    { r: 255, g: 110, b: 20,  radius: 580, xr: 0.72, yr: 0.48, speed: 0.00024, phase: 2.1,  alpha: 0.16 }, // Laranja
    { r: 27,  g: 98,  b: 248, radius: 620, xr: 0.48, yr: 0.58, speed: 0.00022, phase: 3.6,  alpha: 0.18 }, // Azul Royal
    { r: 0,   g: 215, b: 255, radius: 550, xr: 0.22, yr: 0.68, speed: 0.00025, phase: 4.9,  alpha: 0.15 }, // Ciano
    { r: 242, g: 42,  b: 142, radius: 570, xr: 0.76, yr: 0.72, speed: 0.00026, phase: 1.2,  alpha: 0.16 }  // Magenta
  ];

  // Espectro dinâmico para mobile: dominado por azuis vibrantes (royal, ciano, celeste, safira),
  // calor de laranja/âmbar solar e apenas um toque sutil e translúcido de turquesa/menta (zero excesso de verde, zero roxo).
  const mobileColorSpectrum = [
    { r: 27,  g: 98,  b: 248 }, // Azul Royal dominante da marca
    { r: 0,   g: 212, b: 255 }, // Ciano Sky límpido e elétrico
    { r: 255, g: 125, b: 24  }, // Laranja Solar vivo e contrastante
    { r: 16,  g: 140, b: 252 }, // Azul Celeste radiante
    { r: 22,  g: 200, b: 214 }, // Turquesa / Aqua suave límpido
    { r: 255, g: 175, b: 35  }, // Âmbar Dourado solar
    { r: 20,  g: 88,  b: 240 }, // Azul Safira elegante
    { r: 42,  g: 218, b: 178 }  // Toque suave e leve de menta fresca
  ];

  function getMobileMorphColor(time, offset) {
    // Cicla com rapidez e fluidez contínua entre os tons do espectro
    const cycle = (time * 0.00165 + offset) % mobileColorSpectrum.length;
    const i1 = Math.floor(cycle);
    const i2 = (i1 + 1) % mobileColorSpectrum.length;
    const blend = cycle - i1;
    const c1 = mobileColorSpectrum[i1];
    const c2 = mobileColorSpectrum[i2];
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * blend),
      g: Math.round(c1.g + (c2.g - c1.g) * blend),
      b: Math.round(c1.b + (c2.b - c1.b) * blend)
    };
  }

  // Paleta Mobile exclusiva: alta transparência (alphas 0.20-0.24), movimento e rotação acelerados (~3x mais rápidos)
  // e troca dinâmica contínua de cores para eliminar o excesso de verde e dar protagonismo ao azul e solar
  const mobilePalette = [
    { r: 27,  g: 98,  b: 248, radius: 420, angle: 0.00, orbitX: 1.12, orbitY: 0.94, speed:  0.00185, breathe: 0.00098, alpha: 0.24, colorCycle: true, colorOffset: 0.0 },
    { r: 255, g: 125, b: 24,  radius: 380, angle: 0.92, orbitX: 1.25, orbitY: 1.08, speed: -0.00175, breathe: 0.00105, alpha: 0.22, colorCycle: true, colorOffset: 1.15 },
    { r: 16,  g: 140, b: 252, radius: 410, angle: 1.88, orbitX: 0.96, orbitY: 1.05, speed:  0.00180, breathe: 0.00092, alpha: 0.24, colorCycle: true, colorOffset: 2.30 },
    { r: 22,  g: 200, b: 214, radius: 370, angle: 2.82, orbitX: 1.22, orbitY: 0.90, speed: -0.00190, breathe: 0.00108, alpha: 0.20, colorCycle: true, colorOffset: 3.45 },
    { r: 0,   g: 212, b: 255, radius: 390, angle: 3.75, orbitX: 1.05, orbitY: 1.22, speed:  0.00195, breathe: 0.00095, alpha: 0.22, colorCycle: true, colorOffset: 4.60 },
    { r: 255, g: 175, b: 35,  radius: 360, angle: 4.70, orbitX: 1.16, orbitY: 0.92, speed: -0.00170, breathe: 0.00102, alpha: 0.20, colorCycle: true, colorOffset: 5.75 },
    { r: 20,  g: 88,  b: 240, radius: 400, angle: 5.58, orbitX: 0.92, orbitY: 1.15, speed:  0.00175, breathe: 0.00094, alpha: 0.23, colorCycle: true, colorOffset: 6.90 }
  ];

  const mobileLowerBlobs = [
    { r: 27,  g: 98,  b: 248, radius: 450, xr: 0.28, yr: 0.45, speed: 0.00055, phase: 0.8, alpha: 0.12, colorOffset: 0.5 },
    { r: 255, g: 125, b: 24,  radius: 410, xr: 0.72, yr: 0.50, speed: 0.00050, phase: 2.2, alpha: 0.11, colorOffset: 2.3 },
    { r: 0,   g: 212, b: 255, radius: 430, xr: 0.48, yr: 0.60, speed: 0.00048, phase: 3.7, alpha: 0.12, colorOffset: 4.2 },
    { r: 16,  g: 140, b: 252, radius: 400, xr: 0.22, yr: 0.70, speed: 0.00052, phase: 5.0, alpha: 0.10, colorOffset: 5.9 },
    { r: 22,  g: 200, b: 214, radius: 420, xr: 0.76, yr: 0.72, speed: 0.00050, phase: 1.4, alpha: 0.11, colorOffset: 7.3 }
  ];

  let blobs = [];
  let lowerBlobs = [];
  let appliedDeviceIsMobile = null;

  function syncBlobsPalette(mobile) {
    if (appliedDeviceIsMobile === mobile && blobs.length > 0) return;
    appliedDeviceIsMobile = mobile;
    const pal = mobile ? mobilePalette : desktopPalette;
    blobs = pal.map((p) => ({ ...p, x: 0, y: 0, ready: false }));
    const low = mobile ? mobileLowerBlobs : desktopLowerBlobs;
    lowerBlobs = low.map((p) => ({ ...p }));
  }

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
      // Movimento dinâmico mais ágil, fluido e gracioso no celular
      anchor.targetX = width * (0.50 + 0.25 * Math.sin(time * 0.00072));
      anchor.targetY = viewH * (0.40 + 0.18 * Math.cos(time * 0.00062));
    }

    // Segue o mouse rapidamente quando em movimento (0.13), ou flutua suavemente quando parado (0.045)
    const follow = isMobile ? 0.055 : (anchor.isMoving ? 0.13 : 0.045);
    anchor.x += (anchor.targetX - anchor.x) * follow;
    anchor.y += (anchor.targetY - anchor.y) * follow;

    // Vagueio dinâmico rico quando o cursor está parado: as cores continuam dançando e passeando
    const wanderSpeedMul = isMobile ? 1.8 : 1.0;
    const wanderX = (Math.sin(time * 0.00050 * wanderSpeedMul) * 0.15 + Math.cos(time * 0.00029 * wanderSpeedMul) * 0.08) * width * anchor.idleBlend;
    const wanderY = (Math.cos(time * 0.00044 * wanderSpeedMul) * 0.13 + Math.sin(time * 0.00058 * wanderSpeedMul) * 0.06) * viewH * anchor.idleBlend;
    const centerX = anchor.x + wanderX;
    const centerY = Math.min(Math.max(anchor.y + wanderY, viewH * 0.12), viewH * 0.95);

    // Raio da órbita das bolinhas: concentrado no cursor ativo e dançante quando solto
    const orbitBase = (isMobile ? 0.18 : 0.15) * width * (0.65 + 0.45 * anchor.idleBlend) + 50;
    const sizeScale = isMobile ? 0.72 : 1.0;

    // Manchas inferiores de transição com o vídeo (leves e transparentes)
    for (let i = 0; i < lowerBlobs.length; i++) {
      const b = lowerBlobs[i];
      const bx = width * b.xr + Math.sin(time * b.speed + b.phase) * width * 0.09;
      const by = height * b.yr + Math.cos(time * b.speed * 0.85 + b.phase) * viewH * 0.08;
      const wave = Math.sin(time * 0.00028 + b.phase);
      const rad = b.radius * sizeScale * (1 + wave * 0.12);

      let lr = b.r;
      let lg = b.g;
      let lb = b.b;
      if (isMobile && b.colorOffset !== undefined) {
        const mc = getMobileMorphColor(time * 0.75, b.colorOffset);
        lr = mc.r;
        lg = mc.g;
        lb = mc.b;
      }
      drawSoftBlob(bx, by, rad, lr, lg, lb, b.alpha + wave * 0.02);
    }

    // Cores principais: no mobile trocam de cor dinamicamente e com rapidez entre azuis, solar e toque menta
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

      let r = blob.r;
      let g = blob.g;
      let b = blob.b;
      if (isMobile && blob.colorCycle) {
        const mc = getMobileMorphColor(time, blob.colorOffset);
        r = mc.r;
        g = mc.g;
        b = mc.b;
      }

      const wave = Math.sin(time * blob.breathe + i * 1.25);
      const rad = blob.radius * sizeScale * (1 + wave * 0.12);
      drawSoftBlob(blob.x, blob.y, rad, r, g, b, blob.alpha + wave * 0.03);
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
        'assets/albuns/jessica/foto-01.jpg',
        'assets/albuns/jessica/foto-02.jpg',
        'assets/albuns/jessica/foto-03.jpg'
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
