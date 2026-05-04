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

  normalMatrix(model) {
    const m = model;
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
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) return null;

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

// Solid-color fallback texture.
function solidTex(gl, r, g, b) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
    gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([r, g, b, 255])
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

function loadTextureFromURL(gl, url, repeat = true) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);

  // Placeholder so the object is still visible while the image loads.
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
    gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([130, 130, 130, 255])
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const img = new Image();
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  };

  img.onerror = () => {
    console.warn('Texture image could not load:', url);
  };

  img.src = url;
  return tex;
}

function bindTextureMaps(gl, program, maps) {
  const diffuse = maps.diffuse || solidTex(gl, 160, 160, 160);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, diffuse);
  gl.uniform1i(gl.getUniformLocation(program, 'u_diffuseMap'), 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, maps.normal || diffuse);
  gl.uniform1i(gl.getUniformLocation(program, 'u_normalMap'), 1);

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, maps.specular || diffuse);
  gl.uniform1i(gl.getUniformLocation(program, 'u_specularMap'), 2);

  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, maps.ambient || diffuse);
  gl.uniform1i(gl.getUniformLocation(program, 'u_ambientMap'), 3);

  gl.uniform1i(gl.getUniformLocation(program, 'u_useNormalMap'), maps.normal ? 1 : 0);
  gl.uniform1i(gl.getUniformLocation(program, 'u_useSpecularMap'), maps.specular ? 1 : 0);
  gl.uniform1i(gl.getUniformLocation(program, 'u_useAmbientMap'), maps.ambient ? 1 : 0);
}
