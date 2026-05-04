const LIGHT = {
  position: [13.0, 6.0, 13.0],
  color: [1.0, 0.95, 0.88]
};

const LIGHT_COLORS = [
  { name: 'Warm',  rgb: [1.0, 0.75, 0.45] },
  { name: 'Cool',  rgb: [0.3, 0.65, 1.0] },
  { name: 'Eerie', rgb: [0.35, 1.0, 0.35] },
];

let lightColorIdx = 0;

function cycleLightColor() {
  lightColorIdx = (lightColorIdx + 1) % LIGHT_COLORS.length;
  LIGHT.color = LIGHT_COLORS[lightColorIdx].rgb;

  const el = document.getElementById('hud-light-color');
  if (el) el.textContent = LIGHT_COLORS[lightColorIdx].name;

  console.log("Light changed to:", LIGHT_COLORS[lightColorIdx].name);
}

function applyLighting(gl, program, viewPos) {
  gl.uniform3fv(gl.getUniformLocation(program, 'u_lightPos'), LIGHT.position);
  gl.uniform3fv(gl.getUniformLocation(program, 'u_lightColor'), LIGHT.color);
  gl.uniform3fv(gl.getUniformLocation(program, 'u_viewPos'), viewPos);
}