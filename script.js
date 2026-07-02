// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

const REVEAL_DATE = "2026-07-02T17:08:00";
const KEEP_OPEN_AFTER_REVEAL = true;
const PRE_TEXT = "Pra sempre...";
const MAIN_TEXT = "Eu te amo.";
const SIGNATURE = "Com amor, Gabriel";

// ============================================================================
// Estado geral
// ============================================================================

const FINAL_COUNTDOWN_SECONDS = 10;
const SIGNATURE_DELAY_MS = 8000;
const RETURN_TO_COUNTDOWN_DELAY_MS = 45000;
const SKY_EASTER_DURATION_MS = 3200;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const dom = {};

const experienceState = {
  countdownTimer: null,
  hasRevealed: false,
  lastCountdownSecond: null,
  lastFinalNumber: null,
  musicButtonUsed: false,
  targetRevealDate: null
};

const sky = {
  canvas: null,
  context: null,
  width: 0,
  height: 0,
  dpr: 1,
  stars: [],
  shootingStars: [],
  lastFrameTime: 0,
  nextShootingStarAt: Number.POSITIVE_INFINITY,
  isVisible: false,
  pointer: {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0
  }
};

console.log("Se você está lendo isto, saiba que cada linha deste projeto foi escrita com amor. ❤️");

document.addEventListener("DOMContentLoaded", initExperience);

// ============================================================================
// Inicialização
// ============================================================================

function initExperience() {
  cacheDom();
  applyConfiguredTexts();
  initSky();
  initMusicControls();
  initKonamiCode();
  initCountdown();
}

function cacheDom() {
  dom.body = document.body;
  dom.preReveal = document.getElementById("preReveal");
  dom.reveal = document.getElementById("reveal");
  dom.countdown = document.getElementById("countdown");
  dom.finalCountdown = document.getElementById("finalCountdown");
  dom.days = document.getElementById("days");
  dom.hours = document.getElementById("hours");
  dom.minutes = document.getElementById("minutes");
  dom.seconds = document.getElementById("seconds");
  dom.preText = document.getElementById("preText");
  dom.mainText = document.getElementById("mainText");
  dom.loveBlock = document.getElementById("loveBlock");
  dom.signature = document.getElementById("signature");
  dom.musicButton = document.getElementById("musicButton");
  dom.audio = document.getElementById("backgroundMusic");
}

function applyConfiguredTexts() {
  dom.preText.textContent = PRE_TEXT;
  dom.mainText.textContent = MAIN_TEXT;
  dom.signature.textContent = SIGNATURE;
}

// ============================================================================
// Contagem regressiva e fluxo de revelação
// ============================================================================

function initCountdown() {
  experienceState.targetRevealDate = getNextRevealDate(new Date());
  updateCountdown();
  experienceState.countdownTimer = window.setInterval(updateCountdown, 250);
}

function getConfiguredRevealDate() {
  const configuredDate = new Date(REVEAL_DATE);

  if (Number.isNaN(configuredDate.getTime())) {
    console.warn("REVEAL_DATE inválida. A experiência será iniciada imediatamente.");
    return new Date();
  }

  return configuredDate;
}

function getNextRevealDate(now) {
  const configuredDate = getConfiguredRevealDate();

  if (KEEP_OPEN_AFTER_REVEAL || configuredDate > now) {
    return configuredDate;
  }

  const nextDate = new Date(configuredDate.getTime());

  while (nextDate <= now) {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }

  return nextDate;
}

function updateCountdown() {
  if (experienceState.hasRevealed) {
    return;
  }

  const now = new Date();
  const remainingMs = experienceState.targetRevealDate.getTime() - now.getTime();

  if (remainingMs <= 0) {
    startRevealSequence();
    return;
  }

  if (remainingMs <= FINAL_COUNTDOWN_SECONDS * 1000) {
    showFinalCountdown(remainingMs);
    return;
  }

  showTraditionalCountdown(remainingMs);
}

function showTraditionalCountdown(remainingMs) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));

  if (experienceState.lastCountdownSecond === totalSeconds) {
    return;
  }

  experienceState.lastCountdownSecond = totalSeconds;
  experienceState.lastFinalNumber = null;
  dom.preReveal.classList.remove("pre-reveal-final");
  dom.finalCountdown.setAttribute("aria-hidden", "true");

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  dom.days.textContent = formatTimeUnit(days);
  dom.hours.textContent = formatTimeUnit(hours);
  dom.minutes.textContent = formatTimeUnit(minutes);
  dom.seconds.textContent = formatTimeUnit(seconds);
}

function showFinalCountdown(remainingMs) {
  const nextNumber = Math.max(1, Math.min(10, Math.ceil(remainingMs / 1000)));

  dom.preReveal.classList.add("pre-reveal-final");
  dom.finalCountdown.removeAttribute("aria-hidden");

  if (experienceState.lastFinalNumber === nextNumber) {
    return;
  }

  experienceState.lastFinalNumber = nextNumber;
  dom.finalCountdown.classList.add("is-fading");

  window.setTimeout(() => {
    dom.finalCountdown.textContent = String(nextNumber);
    dom.finalCountdown.classList.remove("is-fading");
  }, prefersReducedMotion ? 0 : 170);
}

function formatTimeUnit(value) {
  return String(value).padStart(2, "0");
}

async function startRevealSequence() {
  if (experienceState.hasRevealed) {
    return;
  }

  experienceState.hasRevealed = true;
  window.clearInterval(experienceState.countdownTimer);

  dom.finalCountdown.classList.add("is-fading");
  dom.preReveal.classList.remove("state--visible");

  await wait(prefersReducedMotion ? 80 : 900);
  await wait(prefersReducedMotion ? 120 : 2000);

  revealSky();
  tryStartMusic();

  dom.reveal.classList.add("state--visible");
  dom.reveal.removeAttribute("aria-hidden");

  await wait(prefersReducedMotion ? 120 : 3200);
  showElement(dom.preText);

  await wait(prefersReducedMotion ? 900 : 4000);
  hideElement(dom.preText);

  await wait(prefersReducedMotion ? 400 : 2000);
  showElement(dom.loveBlock);
  dom.loveBlock.removeAttribute("aria-hidden");

  await wait(prefersReducedMotion ? 900 : SIGNATURE_DELAY_MS);
  showElement(dom.signature);
  dom.signature.removeAttribute("aria-hidden");

  if (!KEEP_OPEN_AFTER_REVEAL) {
    window.setTimeout(returnToCountdown, RETURN_TO_COUNTDOWN_DELAY_MS);
  }
}

function returnToCountdown() {
  experienceState.hasRevealed = false;
  experienceState.lastCountdownSecond = null;
  experienceState.lastFinalNumber = null;
  experienceState.targetRevealDate = getNextRevealDate(new Date());

  hideElement(dom.preText);
  hideElement(dom.loveBlock);
  hideElement(dom.signature);

  dom.reveal.classList.remove("state--visible");
  dom.reveal.setAttribute("aria-hidden", "true");
  dom.loveBlock.setAttribute("aria-hidden", "true");
  dom.signature.setAttribute("aria-hidden", "true");
  dom.body.classList.remove("is-sky-visible");
  sky.isVisible = false;

  dom.preReveal.classList.remove("pre-reveal-final");
  dom.preReveal.classList.add("state--visible");

  updateCountdown();
  experienceState.countdownTimer = window.setInterval(updateCountdown, 250);
}

function showElement(element) {
  element.classList.add("is-visible-content");
}

function hideElement(element) {
  element.classList.remove("is-visible-content");
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// ============================================================================
// Música
// ============================================================================

function initMusicControls() {
  dom.audio.volume = 0.72;

  dom.musicButton.addEventListener("click", async () => {
    experienceState.musicButtonUsed = true;
    hideMusicButton();

    try {
      await dom.audio.play();
    } catch (error) {
      console.warn("Não foi possível iniciar a música após o clique.", error);
    }
  });
}

function tryStartMusic() {
  const playPromise = dom.audio.play();

  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      if (!experienceState.musicButtonUsed) {
        showMusicButton();
      }
    });
  }
}

function showMusicButton() {
  dom.musicButton.hidden = false;
  window.requestAnimationFrame(() => showElement(dom.musicButton));
}

function hideMusicButton() {
  hideElement(dom.musicButton);
  window.setTimeout(() => {
    dom.musicButton.hidden = true;
  }, prefersReducedMotion ? 0 : 700);
}

// ============================================================================
// Céu em Canvas
// ============================================================================

function initSky() {
  sky.canvas = document.getElementById("starCanvas");
  sky.context = sky.canvas.getContext("2d", { alpha: true });

  resizeSky();
  scheduleNextShootingStar(performance.now());

  window.addEventListener("resize", resizeSky, { passive: true });
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("deviceorientation", handleDeviceOrientation, { passive: true });
  window.requestAnimationFrame(animateSky);
}

function resizeSky() {
  sky.width = window.innerWidth;
  sky.height = window.innerHeight;
  sky.dpr = Math.min(window.devicePixelRatio || 1, 2);

  sky.canvas.width = Math.floor(sky.width * sky.dpr);
  sky.canvas.height = Math.floor(sky.height * sky.dpr);
  sky.canvas.style.width = `${sky.width}px`;
  sky.canvas.style.height = `${sky.height}px`;
  sky.context.setTransform(sky.dpr, 0, 0, sky.dpr, 0, 0);

  createStars();
}

function createStars() {
  const screenArea = sky.width * sky.height;
  const starCount = Math.min(720, Math.max(280, Math.round(screenArea / 3000)));

  sky.stars = Array.from({ length: starCount }, () => ({
    x: Math.random() * sky.width,
    y: Math.random() * sky.height,
    radius: 0.18 + Math.pow(Math.random(), 2.4) * 1.45,
    depth: 0.16 + Math.random() * 0.84,
    alpha: 0.24 + Math.random() * 0.58,
    twinkle: 0.04 + Math.random() * 0.24,
    twinkleSpeed: 0.00025 + Math.random() * 0.00105,
    phase: Math.random() * Math.PI * 2,
    driftX: (Math.random() - 0.5) * 0.003,
    driftY: (Math.random() - 0.5) * 0.002
  }));
}

function revealSky() {
  sky.isVisible = true;
  dom.body.classList.add("is-sky-visible");
}

function animateSky(now) {
  const deltaMs = Math.min(50, now - (sky.lastFrameTime || now));
  sky.lastFrameTime = now;

  drawSky(now, deltaMs);
  window.requestAnimationFrame(animateSky);
}

function drawSky(now, deltaMs) {
  const context = sky.context;
  context.clearRect(0, 0, sky.width, sky.height);

  sky.pointer.x += (sky.pointer.targetX - sky.pointer.x) * 0.035;
  sky.pointer.y += (sky.pointer.targetY - sky.pointer.y) * 0.035;

  const parallaxX = sky.pointer.x * 22;
  const parallaxY = sky.pointer.y * 16;
  const timeDrift = prefersReducedMotion ? 0 : now;

  context.save();
  context.fillStyle = "#ffffff";

  for (const star of sky.stars) {
    const x = wrap(star.x + parallaxX * star.depth + timeDrift * star.driftX * star.depth, sky.width);
    const y = wrap(star.y + parallaxY * star.depth + timeDrift * star.driftY * star.depth, sky.height);
    const twinkle = prefersReducedMotion ? 0 : Math.sin(now * star.twinkleSpeed + star.phase) * star.twinkle;

    context.globalAlpha = clamp(star.alpha + twinkle, 0.12, 0.92);
    context.beginPath();
    context.arc(x, y, star.radius * (0.72 + star.depth * 0.7), 0, Math.PI * 2);
    context.fill();
  }

  context.restore();

  if (sky.isVisible && !prefersReducedMotion && now >= sky.nextShootingStarAt) {
    spawnShootingStar(false);
    scheduleNextShootingStar(now);
  }

  updateAndDrawShootingStars(deltaMs);
}

function updateAndDrawShootingStars(deltaMs) {
  if (!sky.shootingStars.length) {
    return;
  }

  const context = sky.context;

  sky.shootingStars = sky.shootingStars.filter((star) => {
    star.age += deltaMs;
    const progress = star.age / star.duration;

    if (progress >= 1) {
      return false;
    }

    star.x += star.vx * (deltaMs / 1000);
    star.y += star.vy * (deltaMs / 1000);

    const alpha = Math.sin(progress * Math.PI) * star.opacity;
    const tailX = star.x - star.unitX * star.length;
    const tailY = star.y - star.unitY * star.length;
    const gradient = context.createLinearGradient(tailX, tailY, star.x, star.y);

    gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
    gradient.addColorStop(0.68, `rgba(255, 255, 255, ${0.22 * alpha})`);
    gradient.addColorStop(1, `rgba(255, 255, 255, ${0.9 * alpha})`);

    context.save();
    context.lineCap = "round";
    context.lineWidth = star.lineWidth;
    context.strokeStyle = gradient;
    context.beginPath();
    context.moveTo(tailX, tailY);
    context.lineTo(star.x, star.y);
    context.stroke();
    context.restore();

    return true;
  });
}

function scheduleNextShootingStar(now) {
  sky.nextShootingStarAt = now + randomBetween(20000, 40000);
}

function spawnShootingStar(forceFullScreen) {
  const diagonal = Math.hypot(sky.width, sky.height);
  const duration = forceFullScreen ? 2200 : randomBetween(1700, 2400);
  const fromLeft = forceFullScreen || Math.random() > 0.5;
  const direction = fromLeft ? 1 : -1;
  const angle = randomBetween(18, 31) * (Math.PI / 180);
  const distance = diagonal + sky.width * 0.32;
  const speed = distance / (duration / 1000);
  const vx = Math.cos(angle) * speed * direction;
  const vy = Math.sin(angle) * speed;
  const magnitude = Math.hypot(vx, vy);

  sky.shootingStars.push({
    x: fromLeft ? -sky.width * 0.18 : sky.width * 1.18,
    y: forceFullScreen ? sky.height * 0.18 : randomBetween(-sky.height * 0.08, sky.height * 0.34),
    vx,
    vy,
    unitX: vx / magnitude,
    unitY: vy / magnitude,
    age: 0,
    duration,
    length: forceFullScreen ? Math.min(360, diagonal * 0.28) : randomBetween(150, 270),
    lineWidth: forceFullScreen ? 1.55 : randomBetween(0.85, 1.35),
    opacity: forceFullScreen ? 0.95 : randomBetween(0.52, 0.82)
  });
}

function handlePointerMove(event) {
  setParallaxTarget(event.clientX, event.clientY);
}

function handleDeviceOrientation(event) {
  if (typeof event.gamma !== "number" || typeof event.beta !== "number") {
    return;
  }

  sky.pointer.targetX = clamp(event.gamma / 42, -1, 1);
  sky.pointer.targetY = clamp((event.beta - 38) / 42, -1, 1);
}

function setParallaxTarget(x, y) {
  sky.pointer.targetX = clamp((x / sky.width - 0.5) * 2, -1, 1);
  sky.pointer.targetY = clamp((y / sky.height - 0.5) * 2, -1, 1);
}

function wrap(value, max) {
  return ((value % max) + max) % max;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

// ============================================================================
// Easter egg
// ============================================================================

function initKonamiCode() {
  const sequence = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a"
  ];
  let currentIndex = 0;

  window.addEventListener("keydown", (event) => {
    const normalizedKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const expectedKey = sequence[currentIndex];

    if (normalizedKey === expectedKey) {
      currentIndex += 1;

      if (currentIndex === sequence.length) {
        currentIndex = 0;
        triggerKonamiShootingStar();
      }

      return;
    }

    currentIndex = normalizedKey === sequence[0] ? 1 : 0;
  });
}

function triggerKonamiShootingStar() {
  spawnShootingStar(true);

  if (!sky.isVisible) {
    dom.body.classList.add("is-easter-visible");

    window.setTimeout(() => {
      dom.body.classList.remove("is-easter-visible");
    }, SKY_EASTER_DURATION_MS);
  }
}
