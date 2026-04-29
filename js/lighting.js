// ============================================================
// lighting.js  —  Phong lighting setup & uniform upload
// Maze Escape 3D  |  CS 4053
// Primary author: Shared (Keyera & Reese)
// ============================================================

// A single point light positioned above the maze center.
// You can add more lights by extending the shader and this module.

const LIGHT = {
  position:  [13.0, 6.0, 13.0], // above maze center
  color:     [1.0,  0.95, 0.88] // warm white
};

// Upload all lighting uniforms for a given shader program
function applyLighting(gl, program, viewPos) {
  const lp = gl.getUniformLocation(program, 'u_lightPos');
  const lc = gl.getUniformLocation(program, 'u_lightColor');
  const vp = gl.getUniformLocation(program, 'u_viewPos');

  gl.uniform3fv(lp, LIGHT.position);
  gl.uniform3fv(lc, LIGHT.color);
  gl.uniform3fv(vp, viewPos);
}