let gl, program;
let maze, objects, camera;
let gameRunning = false;
let lastTime = 0, startTime = 0;
let flashlightOn = true;
let keysAlreadyBound = false;

function initWebGL() {
  const canvas = document.getElementById('glCanvas');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;

  gl = canvas.getContext('webgl');
  if (!gl) { alert('WebGL not supported. Use Chrome or Firefox.'); return false; }

  const derivatives = gl.getExtension('OES_standard_derivatives');
  if (!derivatives) {
    alert('Your browser/GPU does not support normal mapping derivatives. Try Chrome or Edge.');
    return false;
  }

  const vertSrc = document.getElementById('vertex-shader').textContent;
  const fragSrc = document.getElementById('fragment-shader').textContent;
  program = createProgram(gl, vertSrc, fragSrc);
  if (!program) return false;

  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.clearColor(0.02, 0.02, 0.04, 1.0);
  return true;
}

function initScene() {
  maze = new Maze(gl, program);
  objects = new ObjectManager(gl, program);
  camera = new Camera(PLAYER_START.x, PLAYER_START.y, PLAYER_START.z);

  document.getElementById('hud-light-color').textContent = 'Warm';
  document.getElementById('hud-flashlight').textContent = 'ON';
}

function setProjection() {
  const aspect = gl.canvas.width / gl.canvas.height;
  const proj = Mat4.perspective(70 * Math.PI / 180, aspect, 0.1, 120.0);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projMatrix'), false, proj);
}

function gameLoop(ts) {
  if (!gameRunning) return;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  render();
  updateHUDTime();
  requestAnimationFrame(gameLoop);
}

function update(dt) {
  const { dx, dz } = camera.getMovementDelta(dt);
  const safe = resolveCollision(camera.x, camera.z, dx, dz);
  camera.move(safe.dx, safe.dz);

  const result = objects.update(dt, camera.x, camera.z);
  if (result === 'exit') triggerWin();
}

function render() {
  const canvas = gl.canvas;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== canvas.clientWidth * dpr ||
      canvas.height !== canvas.clientHeight * dpr) {
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  setProjection();

  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_viewMatrix'), false, camera.getViewMatrix());
  gl.uniform1f(gl.getUniformLocation(program, 'u_ambientStrength'), flashlightOn ? 0.45 : 0.07);
  applyLighting(gl, program, camera.position);

  applyLighting(gl, program, camera.position);
  maze.draw();
  objects.draw();
}

function updateHUDTime() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = String(elapsed % 60).padStart(2, '0');
  document.getElementById('hud-time').textContent = `${m}:${s}`;
}

function bindInteractionKeys() {
  document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();

    if (key === 'l') {
      e.preventDefault();
      cycleLightColor();
    }

    if (key === 'f') {
      e.preventDefault();
      flashlightOn = !flashlightOn;
      document.getElementById('hud-flashlight').textContent = flashlightOn ? 'ON' : 'OFF';
    }
  });
}

function startGame() {
  if (!initWebGL()) return;
  initScene();
  bindInteractionKeys();
  document.getElementById('start-screen').style.display = 'none';
  camera.requestPointerLock();
  gameRunning = true;
  startTime = Date.now();
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function restartGame() {
  document.getElementById('win-screen').style.display = 'none';
  document.getElementById('hud-exit-status').textContent = 'LOCKED';
  document.getElementById('hud-exit-status').style.color = '';
  flashlightOn = true;
  initScene();
  camera.requestPointerLock();
  gameRunning = true;
  startTime = Date.now();
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function triggerWin() {
  gameRunning = false;
  document.exitPointerLock();
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = String(elapsed % 60).padStart(2, '0');
  document.getElementById('win-time').textContent = `You escaped in ${m}:${s}`;
  document.getElementById('win-screen').style.display = 'flex';
}

window.addEventListener('resize', () => {
  const canvas = document.getElementById('glCanvas');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
});

document.getElementById('glCanvas').addEventListener('click', () => {
  if (gameRunning && camera && !camera.pointerLocked) camera.requestPointerLock();
});
