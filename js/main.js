// ============================================================
// main.js  —  WebGL init, game loop, state management
// Maze Escape 3D  |  CS 4053
// Primary authors: Keyera & Reese
// ============================================================

// ---- Globals -----------------------------------------------

let gl, program;
let maze, objects, camera;
let gameRunning = false;
let lastTime = 0;
let startTime = 0;

// ---- Init --------------------------------------------------

function initWebGL() {
  const canvas = document.getElementById('glCanvas');

  // Match canvas resolution to display size
  canvas.width  = canvas.clientWidth  * window.devicePixelRatio;
  canvas.height = canvas.clientHeight * window.devicePixelRatio;

  gl = canvas.getContext('webgl');
  if (!gl) {
    alert('WebGL not supported in your browser. Please use Chrome or Firefox.');
    return false;
  }

  // Get shader source from script tags in index.html
  const vertSrc = document.getElementById('vertex-shader').textContent;
  const fragSrc = document.getElementById('fragment-shader').textContent;
  program = createProgram(gl, vertSrc, fragSrc);
  if (!program) return false;

  gl.useProgram(program);

  // WebGL state
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.clearColor(0.05, 0.05, 0.08, 1.0); // dark background

  return true;
}

function initScene() {
  maze    = new Maze(gl, program);
  objects = new ObjectManager(gl, program);
  camera  = new Camera(PLAYER_START.x, PLAYER_START.y, PLAYER_START.z);
}

// ---- Projection --------------------------------------------

function setProjection() {
  const canvas = gl.canvas;
  const aspect = canvas.width / canvas.height;
  const fovY   = 70 * Math.PI / 180; // 70° vertical FOV
  const proj   = Mat4.perspective(fovY, aspect, 0.1, 100.0);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projMatrix'), false, proj);
}

// ---- Game Loop ---------------------------------------------

function gameLoop(timestamp) {
  if (!gameRunning) return;

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = timestamp;

  update(dt);
  render();
  updateHUDTime();

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  // --- Camera / movement ---
  const { dx, dz } = camera.getMovementDelta(dt);
  const safe = resolveCollision(camera.x, camera.z, dx, dz);
  camera.move(safe.dx, safe.dz);

  // --- Object interactions ---
  const result = objects.update(dt, camera.x, camera.z);
  if (result === 'exit') {
    triggerWin();
  }
}

function render() {
  const canvas = gl.canvas;

  // Resize if window changed
  if (canvas.width !== canvas.clientWidth * window.devicePixelRatio ||
      canvas.height !== canvas.clientHeight * window.devicePixelRatio) {
    canvas.width  = canvas.clientWidth  * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  setProjection();

  // View matrix
  const view = camera.getViewMatrix();
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_viewMatrix'), false, view);

  // Lighting
  applyLighting(gl, program, camera.position);

  // Draw scene
  maze.draw();
  objects.draw();
}

// ---- HUD time update ---------------------------------------

function updateHUDTime() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = String(elapsed % 60).padStart(2, '0');
  document.getElementById('hud-time').textContent = `${m}:${s}`;
}

// ---- Game state controls -----------------------------------

function startGame() {
  if (!initWebGL()) return;
  initScene();

  document.getElementById('start-screen').style.display = 'none';
  camera.requestPointerLock();

  gameRunning = true;
  startTime   = Date.now();
  lastTime    = performance.now();
  requestAnimationFrame(gameLoop);
}

function restartGame() {
  document.getElementById('win-screen').style.display = 'none';
  document.getElementById('hud-exit-status').textContent = 'LOCKED';
  document.getElementById('hud-exit-status').style.color = '';

  initScene();
  camera.requestPointerLock();

  gameRunning = true;
  startTime   = Date.now();
  lastTime    = performance.now();
  requestAnimationFrame(gameLoop);
}

function triggerWin() {
  gameRunning = false;
  document.exitPointerLock();

  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = String(elapsed % 60).padStart(2, '0');

  const winScreen = document.getElementById('win-screen');
  document.getElementById('win-time').textContent = `You escaped in ${m}:${s}`;
  winScreen.style.display = 'flex';
}

// Handle window resize
window.addEventListener('resize', () => {
  const canvas = document.getElementById('glCanvas');
  canvas.width  = canvas.clientWidth  * window.devicePixelRatio;
  canvas.height = canvas.clientHeight * window.devicePixelRatio;
});

// Click canvas to re-lock pointer if it escapes
document.getElementById('glCanvas').addEventListener('click', () => {
  if (gameRunning && !camera?.pointerLocked) {
    camera?.requestPointerLock();
  }
});
// Keyboard shortcut: R restarts the game after winning or during play.
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'r') {
    if (gameRunning || document.getElementById('win-screen').style.display === 'flex') {
      restartGame();
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');

  if (startBtn) {
    startBtn.addEventListener('click', startGame);
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', restartGame);
  }
});