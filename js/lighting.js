// lighting.js
// Main overhead light + up to 4 torch point lights
// Light color options: natural and atmospheric, not gimmicky

const LIGHT = {
  position: [13.0, 6.0, 13.0],
  color:    [1.0, 0.92, 0.78]   // warm candlelight default
};

const LIGHT_COLORS = [
  { name: 'Torch',    rgb: [1.0,  0.92, 0.78] }, // warm candlelight
  { name: 'Daylight', rgb: [0.95, 0.98, 1.0]  }, // bright neutral white
  { name: 'Moonlit',  rgb: [0.55, 0.65, 0.85] }, // cool pale blue
];

let lightColorIdx = 0;

function cycleLightColor() {
  lightColorIdx = (lightColorIdx + 1) % LIGHT_COLORS.length;
  LIGHT.color = LIGHT_COLORS[lightColorIdx].rgb;
  const el = document.getElementById('hud-light-color');
  if (el) el.textContent = LIGHT_COLORS[lightColorIdx].name;
}

// Called every frame with current torch world positions
function applyLighting(gl, program, viewPos, torchPositions) {
  // Main light
  gl.uniform3fv(gl.getUniformLocation(program, 'u_lightPos'),   LIGHT.position);
  gl.uniform3fv(gl.getUniformLocation(program, 'u_lightColor'), LIGHT.color);
  gl.uniform3fv(gl.getUniformLocation(program, 'u_viewPos'),    viewPos);

  // Pack up to 4 torch point lights with flickering warm orange
  const MAX = 4;
  const tp = new Float32Array(MAX * 3);
  const tc = new Float32Array(MAX * 3);
  const torches = torchPositions || [];
  const now = Date.now();

  for (let i = 0; i < MAX; i++) {
    if (i < torches.length) {
      tp[i*3]   = torches[i][0];
      tp[i*3+1] = torches[i][1];
      tp[i*3+2] = torches[i][2];
      // Each torch flickers independently — warm deep orange
      const flicker = 0.75 + Math.sin(now * 0.005 + i * 1.9) * 0.25;
      tc[i*3]   = 1.0  * flicker;
      tc[i*3+1] = 0.45 * flicker;
      tc[i*3+2] = 0.05 * flicker;
    }
  }
  gl.uniform3fv(gl.getUniformLocation(program, 'u_torchPos'),   tp);
  gl.uniform3fv(gl.getUniformLocation(program, 'u_torchColor'), tc);
  gl.uniform1i( gl.getUniformLocation(program, 'u_numTorches'), Math.min(torches.length, MAX));
}