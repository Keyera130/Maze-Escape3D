// ============================================================
// utils.js  —  Math helpers & WebGL setup utilities
// Maze Escape 3D  |  CS 4053
// ============================================================

// ---- 4x4 Matrix (column-major, Float32Array) ---------------

const Mat4 = {
  identity() {
    return new Float32Array([
      1,0,0,0,
      0,1,0,0,
      0,0,1,0,
      0,0,0,1
    ]);
  },

  multiply(a, b) {
    const out = new Float32Array(16);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[row + k * 4] * b[k + col * 4];
        }
        out[row + col * 4] = sum;
      }
    }
    return out;
  },

  translation(tx, ty, tz) {
    const m = Mat4.identity();
    m[12] = tx; m[13] = ty; m[14] = tz;
    return m;
  },

  scale(sx, sy, sz) {
    const m = Mat4.identity();
    m[0] = sx; m[5] = sy; m[10] = sz;
    return m;
  },

  rotationX(rad) {
    const m = Mat4.identity();
    const c = Math.cos(rad), s = Math.sin(rad);
    m[5] = c;  m[9] = -s;
    m[6] = s;  m[10] = c;
    return m;
  },

  rotationY(rad) {
    const m = Mat4.identity();
    const c = Math.cos(rad), s = Math.sin(rad);
    m[0] = c;  m[8] = s;
    m[2] = -s; m[10] = c;
    return m;
  },

  rotationZ(rad) {
    const m = Mat4.identity();
    const c = Math.cos(rad), s = Math.sin(rad);
    m[0] = c;  m[4] = -s;
    m[1] = s;  m[5] = c;
    return m;
  },

  // Perspective projection
  perspective(fovY, aspect, near, far) {
    const f = 1.0 / Math.tan(fovY / 2);
    const rangeInv = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0,                        0,
      0,          f, 0,                        0,
      0,          0, (near + far) * rangeInv, -1,
      0,          0, near * far * rangeInv * 2, 0
    ]);
  },

  // Returns the upper-left 3x3 normal matrix (inverse-transpose of model)
  normalMatrix(model) {
    // For a 4x4 column-major matrix, extract upper 3x3 and invert-transpose
    const m = model;
    // Cofactors for 3x3 (rows/cols 0-2)
    const a00 = m[0], a01 = m[1], a02 = m[2];
    const a10 = m[4], a11 = m[5], a12 = m[6];
    const a20 = m[8], a21 = m[9], a22 = m[10];

    const b01 =  a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 =  a21 * a10 - a11 * a20;

    let det = a00 * b01 + a01 * b11 + a02 * b21;
    if (det === 0) return new Float32Array([1,0,0, 0,1,0, 0,0,1]);
    det = 1.0 / det;

    return new Float32Array([
      b01 * det,
      (-a22 * a01 + a02 * a21) * det,
      ( a12 * a01 - a02 * a11) * det,

      b11 * det,
      ( a22 * a00 - a02 * a20) * det,
      (-a12 * a00 + a02 * a10) * det,

      b21 * det,
      (-a21 * a00 + a01 * a20) * det,
      ( a11 * a00 - a01 * a10) * det
    ]);
  }
};

// ---- 3D Vector helpers -------------------------------------

const Vec3 = {
  add:       (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]],
  sub:       (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]],
  scale:     (v, s) => [v[0]*s, v[1]*s, v[2]*s],
  dot:       (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2],
  length:    (v)    => Math.sqrt(Vec3.dot(v, v)),
  normalize: (v)    => { const l = Vec3.length(v) || 1; return Vec3.scale(v, 1/l); },
  cross(a, b) {
    return [
      a[1]*b[2] - a[2]*b[1],
      a[2]*b[0] - a[0]*b[2],
      a[0]*b[1] - a[1]*b[0]
    ];
  }
};

// ---- Shader helpers ----------------------------------------

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertSrc, fragSrc) {
  const vert = compileShader(gl, gl.VERTEX_SHADER,   vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

// ---- Buffer helpers ----------------------------------------

function createBuffer(gl, data) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  return buf;
}

function createIndexBuffer(gl, indices) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  return buf;
}

function setAttrib(gl, program, name, buffer, size) {
  const loc = gl.getAttribLocation(program, name);
  if (loc < 0) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
}

// ---- Texture loader ----------------------------------------

function loadTexture(gl, color) {
  // Creates a 1x1 solid-color texture as a placeholder.
  // Replace with actual image loading when textures are available.
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
    gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array(color) // [r, g, b, 255]
  );
  return tex;
}

function loadTextureFromURL(gl, url) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // Placeholder pixel while loading
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([100, 100, 100, 255]));
  const img = new Image();
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  };
  img.src = url;
  return tex;
}