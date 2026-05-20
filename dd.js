// ─── SETUP ───────────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

let W = window.innerWidth;
let H = window.innerHeight;

function resizeCanvas() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width  = W;
  canvas.height = H;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ─── KONSTANTA ───────────────────────────────────────────────────────────────
const GRAVITY        = 0.6;
const JUMP_FORCE     = -17;
const PLATFORM_H     = 10;
const DOODLER_W      = 40;
const DOODLER_H      = 40;

// Responsif: HP layar kecil → lebih sedikit platform & lebih lebar
function getPlatformCount() {
  return window.innerWidth < 600 ? 14 : 22;
}
const PLATFORM_COUNT = getPlatformCount();

function maxPlatGap() { return Math.floor((JUMP_FORCE * JUMP_FORCE) / (2 * GRAVITY) * 0.35); }
function platW() {
  // HP: platform lebih lebar agar mudah terlihat tapi jumlahnya lebih sedikit
  const base = window.innerWidth < 600 ? 65 : 45;
  const extra = window.innerWidth < 600 ? 25 : 20;
  return base + Math.floor(Math.random() * extra);
}

// ─── STATE GAME ──────────────────────────────────────────────────────────────
let score       = 0;
let bestScore   = 0;
let gameStarted = false;
let gameEnded   = false;
let keys        = {};
let platforms   = [];
let particles   = [];
let doodler, cameraY;

// ─── INISIALISASI GAME ───────────────────────────────────────────────────────
function initGame() {
  score     = 0;
  gameEnded = false;
  platforms = [];
  particles = [];
  cameraY   = 0;
  document.getElementById('gameOver').style.display = 'none';
  document.getElementById('scoreDisplay').textContent = 'Score: 0';

  // Platform awal di bawah
  const pw = platW();
  platforms.push({
    x: W / 2 - pw / 2,
    y: H - 60,
    w: pw,
    h: PLATFORM_H,
    type: 'normal',
    spring: false
  });

  // Spawn platform awal — jarak rapat proporsional
  const gap = Math.min(maxPlatGap(), Math.round(H / PLATFORM_COUNT));
  for (let i = 1; i < PLATFORM_COUNT; i++) {
    spawnPlatform(H - 60 - i * gap);
  }

  // Buat karakter doodler
  doodler = {
    x: W / 2 - DOODLER_W / 2,
    y: H - 120,
    w: DOODLER_W,
    h: DOODLER_H,
    vx: 0,
    vy: 0,
    facing: 1  // 1 = kanan, -1 = kiri
  };

  doodler.vy = JUMP_FORCE; // langsung lompat saat mulai
}

// ─── SPAWN PLATFORM ──────────────────────────────────────────────────────────
function spawnPlatform(y) {
  let type = 'normal';
  const r  = Math.random();

  // Semakin tinggi score, platform makin bervariasi
  if (score > 500 && r < 0.10)      type = 'breaking';
  else if (score > 200 && r < 0.20) type = 'moving';

  const spring = score > 300 && Math.random() < 0.12;
  const pw     = platW();

  platforms.push({
    x:          Math.random() * (W - pw),
    y:          y,
    w:          pw,
    h:          PLATFORM_H,
    type:       type,
    vx:         type === 'moving' ? (Math.random() < 0.5 ? 2 : -2) : 0,
    broken:     false,
    breakTimer: 0,
    spring:     spring,
    springAnim: 0
  });
}

// ─── GAMBAR DOODLER (Kucing Lucu) ────────────────────────────────────────────
function drawDoodler() {
  const d       = doodler;
  const screenY = d.y - cameraY;
  const bounce  = doodler.vy < 0 ? Math.min(8, -doodler.vy * 0.4) : 0;

  ctx.save();
  ctx.translate(d.x + d.w / 2, screenY + d.h / 2);
  ctx.scale(d.facing, 1);

  // ── Ekor ──
  ctx.strokeStyle = '#FF8FAB';
  ctx.lineWidth   = 3;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-18, 14, -22, -4, -14, -12);
  ctx.stroke();

  // ── Badan ──
  ctx.fillStyle = '#FFB3C6';
  ctx.beginPath();
  ctx.ellipse(0, 4 - bounce * 0.3, 14 + bounce * 0.4, 12 - bounce * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Kepala ──
  ctx.fillStyle = '#FFB3C6';
  ctx.beginPath();
  ctx.ellipse(2, -8 + bounce * 0.2, 13, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Telinga kiri ──
  ctx.fillStyle = '#FFB3C6';
  ctx.beginPath();
  ctx.moveTo(-8, -17); ctx.lineTo(-14, -26); ctx.lineTo(-2, -22);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FF8FAB';
  ctx.beginPath();
  ctx.moveTo(-8, -19); ctx.lineTo(-12, -25); ctx.lineTo(-4, -22);
  ctx.closePath(); ctx.fill();

  // ── Telinga kanan ──
  ctx.fillStyle = '#FFB3C6';
  ctx.beginPath();
  ctx.moveTo(10, -17); ctx.lineTo(16, -26); ctx.lineTo(5, -22);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FF8FAB';
  ctx.beginPath();
  ctx.moveTo(10, -19); ctx.lineTo(14, -25); ctx.lineTo(6, -22);
  ctx.closePath(); ctx.fill();

  // ── Mata kiri ──
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.ellipse(-4, -9, 4.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.ellipse(-3.5, -9, 3, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(-2, -10.5, 1.2, 0, Math.PI * 2); ctx.fill();

  // ── Mata kanan ──
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.ellipse(8, -9, 4.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.ellipse(8.5, -9, 3, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(10, -10.5, 1.2, 0, Math.PI * 2); ctx.fill();

  // ── Hidung ──
  ctx.fillStyle = '#FF6B9D';
  ctx.beginPath(); ctx.ellipse(2, -4, 2.5, 1.8, 0, 0, Math.PI * 2); ctx.fill();

  // ── Mulut senyum ──
  ctx.strokeStyle = '#FF6B9D';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(-1, -2.5); ctx.quadraticCurveTo(2, 0, 5, -2.5);
  ctx.stroke();

  // ── Kumis ──
  ctx.strokeStyle = 'rgba(180,100,130,0.7)';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(-14, -5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(-13, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -4);  ctx.lineTo(16, -5);  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -3);  ctx.lineTo(15, -1);  ctx.stroke();

  // ── Pipi blush ──
  ctx.fillStyle = 'rgba(255,120,150,0.25)';
  ctx.beginPath(); ctx.ellipse(-6, -5, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(10, -5, 5, 3, 0, 0, Math.PI * 2); ctx.fill();

  // ── Kaki ──
  ctx.fillStyle = '#FFB3C6';
  ctx.beginPath(); ctx.ellipse(-7, 14 - bounce * 0.2, 5, 4, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(7,  14 - bounce * 0.2, 5, 4,  0.2, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ─── GAMBAR PLATFORM ─────────────────────────────────────────────────────────
function drawPlatform(p) {
  const sy = p.y - cameraY;
  if (sy > H + 20 || sy < -20) return; // skip jika di luar layar

  ctx.globalAlpha = 1;

  if (p.type === 'breaking') {
    if (p.broken) {
      ctx.globalAlpha = Math.max(0, 1 - p.breakTimer / 20);
      ctx.fillStyle = '#E57373';
    } else {
      ctx.fillStyle = '#EF9A9A';
    }
  } else if (p.type === 'moving') {
    ctx.fillStyle = '#64B5F6';
  } else {
    ctx.fillStyle = '#81C784';
  }

  // Badan platform
  ctx.beginPath();
  ctx.roundRect(p.x, sy, p.w, p.h, 6);
  ctx.fill();

  // Highlight atas platform
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.roundRect(p.x + 4, sy + 2, p.w - 8, 4, 3);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Gambar spring jika ada
  if (p.spring) {
    const sh = p.springAnim > 0 ? Math.max(4, 12 - p.springAnim) : 12;
    ctx.fillStyle = '#FF9800';
    ctx.fillRect(p.x + p.w / 2 - 6, sy - sh, 12, sh);
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, sy - sh, 6, 0, Math.PI * 2);
    ctx.fill();
    if (p.springAnim > 0) p.springAnim--;
  }
}

// ─── EFEK PARTIKEL ───────────────────────────────────────────────────────────
function spawnParticles(x, y) {
  for (let i = 0; i < 6; i++) {
    particles.push({
      x,
      y,
      vx:    (Math.random() - 0.5) * 4,
      vy:    (Math.random() - 2) * 3,
      life:  30,
      color: `hsl(${Math.random() * 60 + 90}, 70%, 60%)`
    });
  }
}

// ─── UPDATE (LOGIKA GAME) ────────────────────────────────────────────────────
function update() {
  if (!gameStarted || gameEnded) return;

  // Terapkan gravitasi
  doodler.vy += GRAVITY;

  // Input keyboard
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
    doodler.vx     = -8;
    doodler.facing = -1;
  } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
    doodler.vx     = 8;
    doodler.facing = 1;
  } else {
    doodler.vx *= 0.8; // friction
  }

  // Gerak karakter
  doodler.x += doodler.vx;
  doodler.y += doodler.vy;

  // Wrap kiri-kanan (tembus layar)
  if (doodler.x + doodler.w < 0) doodler.x = W;
  if (doodler.x > W)              doodler.x = -doodler.w;

  // Geser kamera ke atas saat karakter naik
  const targetCamera = doodler.y - H * 0.4;
  if (targetCamera < cameraY) {
    cameraY = targetCamera;
    score   = Math.round(-cameraY / 10);
    document.getElementById('scoreDisplay').textContent = 'Score: ' + score;
  }

  // ── Deteksi Collision dengan Platform ──
  if (doodler.vy > 0) { // hanya saat turun
    for (const p of platforms) {
      if (p.broken) {
        p.breakTimer++;
        continue;
      }

      const dy    = (doodler.y + doodler.h) - p.y;
      const prev  = dy - doodler.vy;
      const onTop = prev <= 0;
      const hitX  = doodler.x + doodler.w > p.x + 8 &&
                    doodler.x              < p.x + p.w - 8;

      if (onTop && dy >= 0 && dy < 20 && hitX) {
        if (p.type === 'breaking') {
          // Platform rapuh: hancur saat diinjak
          p.broken = true;
          spawnParticles(p.x + p.w / 2, p.y - cameraY);
        } else {
          // Lompat normal atau dengan spring
          doodler.vy   = p.spring ? JUMP_FORCE * 1.6 : JUMP_FORCE;
          p.springAnim = p.spring ? 15 : 0;
          spawnParticles(doodler.x + doodler.w / 2, doodler.y + doodler.h - cameraY);
        }
      }
    }
  }

  // Hapus platform yang sudah di bawah layar atau sudah hancur
  platforms = platforms.filter(p => {
    if (p.broken && p.breakTimer > 20) return false;
    if (p.y - cameraY > H + 40)       return false;
    return true;
  });

  // Tambah platform baru di atas — jarak rapat agar selalu bisa dicapai
  const safeGap = maxPlatGap();
  let topY = Math.min(...platforms.map(p => p.y));
  while (platforms.length < getPlatformCount() + 2) {
    spawnPlatform(topY - Math.random() * safeGap * 0.5 - safeGap * 0.15);
    topY -= safeGap * 0.35;
  }

  // Gerakkan platform moving
  for (const p of platforms) {
    if (p.type === 'moving') {
      p.x += p.vx;
      if (p.x < 0 || p.x + p.w > W) p.vx *= -1;
    }
  }

  // Update partikel
  particles = particles.filter(p => {
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.2;
    p.life--;
    return p.life > 0;
  });

  // Game Over jika karakter jatuh ke bawah
  if (doodler.y - cameraY > H + 60) {
    endGame();
  }
}

// ─── GAMBAR BACKGROUND (Colorful) ────────────────────────────────────────────
// Data awan & bintang statis supaya tidak bergerak acak setiap frame
const CLOUDS = Array.from({ length: 6 }, (_, i) => ({
  x: (i * 173) % W,
  relY: (i * 97) % 600,
  r: 18 + (i * 7) % 14
}));
const STARS = Array.from({ length: 30 }, (_, i) => ({
  x: (i * 113) % W,
  relY: (i * 79) % 2000,
  r: 1 + (i % 3) * 0.7,
  hue: (i * 47) % 360
}));

function drawCloud(x, y, r) {
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.beginPath();
  ctx.arc(x,       y,      r,       0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.arc(x + r,   y + 4,  r * 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.arc(x - r,   y + 5,  r * 0.75,0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.arc(x + r * 1.8, y + 7, r * 0.6, 0, Math.PI * 2); ctx.fill();
}

function drawBackground() {
  // ── Gradient warna-warni berubah sesuai ketinggian ──
  const t    = Math.max(0, Math.min(1, -cameraY / 4000));
  const grad = ctx.createLinearGradient(0, 0, 0, H);

  if (t < 0.33) {
    // Bawah: kuning-merah muda (siang cerah)
    const p = t / 0.33;
    grad.addColorStop(0,   `hsl(${200 - p*60},  90%, ${80 - p*10}%)`);
    grad.addColorStop(0.5, `hsl(${50  - p*10},  95%, ${88 - p*8}%)`);
    grad.addColorStop(1,   `hsl(${340 + p*20},  80%, ${85 - p*5}%)`);
  } else if (t < 0.66) {
    // Tengah: ungu-biru (sore/senja)
    const p = (t - 0.33) / 0.33;
    grad.addColorStop(0,   `hsl(${270 - p*30}, 70%, ${70 - p*20}%)`);
    grad.addColorStop(0.5, `hsl(${320 + p*20}, 80%, ${65 - p*15}%)`);
    grad.addColorStop(1,   `hsl(${20  + p*10}, 90%, ${75 - p*20}%)`);
  } else {
    // Atas: biru gelap berbintang (malam)
    const p = (t - 0.66) / 0.34;
    grad.addColorStop(0,   `hsl(${240 - p*20}, 60%, ${40 - p*15}%)`);
    grad.addColorStop(0.5, `hsl(${260 + p*10}, 50%, ${30 - p*10}%)`);
    grad.addColorStop(1,   `hsl(${220},        55%, ${25 - p*5 }%)`);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // ── Pelangi kecil di zona siang ──
  if (t < 0.4) {
    const alpha = (1 - t / 0.4) * 0.18;
    const colors = ['#FF6B6B','#FF9F43','#FECA57','#48DBFB','#54A0FF','#5F27CD'];
    for (let i = 0; i < colors.length; i++) {
      ctx.strokeStyle = colors[i];
      ctx.lineWidth   = 8;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(W * 0.75, H * 0.6, 55 + i * 10, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ── Awan (parallax lambat) ──
  if (t < 0.7) {
    for (const c of CLOUDS) {
      const sy = ((c.relY - cameraY * 0.15) % (H + 80) + H + 80) % (H + 80) - 40;
      drawCloud(c.x, sy, c.r);
    }
  }

  // ── Bintang warna-warni (muncul makin tinggi) ──
  const starAlpha = Math.max(0, (t - 0.3) / 0.3);
  if (starAlpha > 0) {
    for (const s of STARS) {
      const sy = ((s.relY - cameraY * 0.05) % (H + 100) + H + 100) % (H + 100) - 20;
      ctx.globalAlpha = starAlpha * (0.6 + 0.4 * Math.sin(Date.now() / 600 + s.x));
      ctx.fillStyle   = `hsl(${s.hue}, 90%, 75%)`;
      ctx.beginPath();
      ctx.arc(s.x, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Confetti dot kecil di zona warna-warni ──
  if (t < 0.5) {
    const dotHues = [0, 40, 80, 160, 200, 280, 320];
    for (let i = 0; i < 14; i++) {
      const dx = (i * 167 + 30) % W;
      const dy = ((i * 113 - cameraY * 0.08) % (H + 60) + H + 60) % (H + 60) - 20;
      ctx.globalAlpha = 0.18;
      ctx.fillStyle   = `hsl(${dotHues[i % dotHues.length]}, 90%, 65%)`;
      ctx.beginPath();
      ctx.arc(dx, dy, 4 + (i % 3) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ─── RENDER ──────────────────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();

  // Gambar semua platform
  for (const p of platforms) drawPlatform(p);

  // Gambar doodler
  drawDoodler();

  // Gambar partikel
  for (const p of particles) {
    ctx.globalAlpha = p.life / 30;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Layar "Tap untuk Mulai"
  if (!gameStarted) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 100, H / 2 - 28, 200, 56, 12);
    ctx.fill();
    ctx.fillStyle  = '#333';
    ctx.font       = '600 15px Segoe UI';
    ctx.textAlign  = 'center';
    ctx.fillText('Klik / Tap untuk Mulai', W / 2, H / 2 + 6);
  }
}

// ─── GAME OVER ───────────────────────────────────────────────────────────────
function endGame() {
  gameEnded = true;
  if (score > bestScore) {
    bestScore = score;
    document.getElementById('bestDisplay').textContent = 'Best: ' + bestScore;
  }
  document.getElementById('finalScore').textContent =
    'Score kamu: ' + score + '  |  Best: ' + bestScore;
  document.getElementById('gameOver').style.display = 'block';
}

// ─── RESTART ─────────────────────────────────────────────────────────────────
function restartGame() {
  initGame();
  gameStarted = true;
}

// ─── GAME LOOP ───────────────────────────────────────────────────────────────
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ─── INPUT KEYBOARD ──────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (!gameStarted) gameStarted = true;
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

// ─── INPUT MOUSE ─────────────────────────────────────────────────────────────
canvas.addEventListener('click', () => {
  if (!gameStarted) gameStarted = true;
  else if (gameEnded) restartGame();
});

// ─── INPUT TOUCH (MOBILE) ────────────────────────────────────────────────────
let touchStartX = null;

canvas.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  if (!gameStarted) gameStarted = true;
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  if (touchStartX !== null) {
    const dx = e.touches[0].clientX - touchStartX;
    if (dx < -10) {
      keys['ArrowLeft']  = true;
      keys['ArrowRight'] = false;
      doodler.facing     = -1;
    } else if (dx > 10) {
      keys['ArrowRight'] = true;
      keys['ArrowLeft']  = false;
      doodler.facing     = 1;
    }
  }
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', e => {
  keys['ArrowLeft']  = false;
  keys['ArrowRight'] = false;
  e.preventDefault();
}, { passive: false });

// ─── MULAI ───────────────────────────────────────────────────────────────────
initGame();
gameLoop();
