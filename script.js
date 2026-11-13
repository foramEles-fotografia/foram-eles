/**
 * FORAM Eles — Script Principal
 * 1. Efeito do Primeiro Container: Cores vivas abstratas desfocadas ("respirando")
 *    que se movem sozinhas organicamente e acompanham o mouse quando o usuário interage.
 * 2. Filtro de Portfólio, Scroll Reveal e Menu Mobile.
 */

(function () {
  const canvas = document.getElementById('breathing-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Estado do mouse (acompanhamento suave com física elástica)
  const mouse = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    active: false,
    lastMove: 0
  };

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!mouse.active) {
      mouse.x = width / 2;
      mouse.y = height / 2;
      mouse.targetX = width / 2;
      mouse.targetY = height / 2;
    }
  }

  window.addEventListener('resize', resize);
  resize();

  // Paleta de cores vivas para os blobs abstratos que "respiram" (incluindo o Azul Royal da logo FORAM Eles.)
  const colorConfigs = [
    { r: 27,  g: 98,  b: 248, baseRadius: 310, breatheSpeed: 0.0016, orbitSpeedX: 0.0007, orbitSpeedY: 0.0009, mousePull: 0.65, phase: 0.0 }, // Azul Royal Oficial (FORAM Eles.)
    { r: 124, g: 92,  b: 255, baseRadius: 280, breatheSpeed: 0.0014, orbitSpeedX: 0.0006, orbitSpeedY: 0.0008, mousePull: 0.45, phase: 1.4 }, // Violeta elétrico
    { r: 0,   g: 210, b: 255, baseRadius: 240, breatheSpeed: 0.0021, orbitSpeedX: 0.0009, orbitSpeedY: 0.0006, mousePull: 0.60, phase: 2.8 }, // Ciano vibrante
    { r: 255, g: 95,  b: 65,  baseRadius: 230, breatheSpeed: 0.0018, orbitSpeedX: 0.0008, orbitSpeedY: 0.0010, mousePull: 0.50, phase: 4.1 }, // Coral vivo
    { r: 255, g: 185, b: 45,  baseRadius: 190, breatheSpeed: 0.0024, orbitSpeedX: 0.0011, orbitSpeedY: 0.0007, mousePull: 0.75, phase: 5.2 }  // Âmbar dourado (luz de lente)
  ];

  const blobs = colorConfigs.map((cfg, index) => ({
    ...cfg,
    x: width * (0.25 + (index * 0.13)),
    y: height * (0.3 + ((index % 3) * 0.2)),
    vx: 0,
    vy: 0
  }));

  // Eventos de mouse e toque no primeiro container
  const heroSection = document.getElementById('hero');
  if (heroSection) {
    heroSection.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.active = true;
      mouse.lastMove = performance.now();
    });

    heroSection.addEventListener('mouseleave', () => {
      mouse.active = false;
    });

    heroSection.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        mouse.targetX = e.touches[0].clientX - rect.left;
        mouse.targetY = e.touches[0].clientY - rect.top;
        mouse.active = true;
        mouse.lastMove = performance.now();
      }
    }, { passive: true });
  }

  function animate(time) {
    ctx.clearRect(0, 0, width, height);

    // Se o usuário parou de mexer o mouse por mais de 3.5s, volta suavemente ao movimento autônomo
    if (mouse.active && time - mouse.lastMove > 3500) {
      mouse.active = false;
    }

    // Interpolação suave da posição do cursor
    mouse.x += (mouse.targetX - mouse.x) * 0.08;
    mouse.y += (mouse.targetY - mouse.y) * 0.08;

    ctx.globalCompositeOperation = 'screen';

    blobs.forEach((blob, i) => {
      // Movimento autônomo orgânico (mesmo sem mouse, as cores se mexem sozinhas)
      const autonomousX =
        width * 0.5 +
        Math.cos(time * blob.orbitSpeedX + blob.phase) * (width * 0.28) +
        Math.sin(time * (blob.orbitSpeedX * 0.6) + i) * (width * 0.1);

      const autonomousY =
        height * 0.5 +
        Math.sin(time * blob.orbitSpeedY + blob.phase) * (height * 0.25) +
        Math.cos(time * (blob.orbitSpeedY * 0.7) + i) * (height * 0.08);

      // Quando o mouse está ativo, cada cor acompanha o mouse com um deslocamento orgânico próprio
      let desiredX = autonomousX;
      let desiredY = autonomousY;

      if (mouse.active) {
        const orbitOffsetAngle = time * 0.0015 + blob.phase;
        const orbitOffsetRadius = 55 + i * 22;
        const cursorClusterX = mouse.x + Math.cos(orbitOffsetAngle) * orbitOffsetRadius;
        const cursorClusterY = mouse.y + Math.sin(orbitOffsetAngle) * orbitOffsetRadius;

        desiredX = autonomousX * (1 - blob.mousePull) + cursorClusterX * blob.mousePull;
        desiredY = autonomousY * (1 - blob.mousePull) + cursorClusterY * blob.mousePull;
      }

      // Física de mola suave para transição fluida
      blob.vx += (desiredX - blob.x) * 0.035;
      blob.vy += (desiredY - blob.y) * 0.035;
      blob.vx *= 0.86;
      blob.vy *= 0.86;
      blob.x += blob.vx;
      blob.y += blob.vy;

      // Efeito "Respirando" (pulsação contínua de tamanho e intensidade de luz)
      const breatheWave = Math.sin(time * blob.breatheSpeed + blob.phase);
      const currentRadius = blob.baseRadius * (1 + breatheWave * 0.26);
      const alpha = 0.58 + breatheWave * 0.16;

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
