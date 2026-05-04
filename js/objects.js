const COLLECTIBLE_CELLS = [
  [1, 3], [3, 5], [5, 7], [7, 1], [9, 9],
];
const COLLECT_RADIUS = 0.75;

const PILLAR_CELLS = [
  [3, 3], [5, 5], [7, 5], [9, 5],
];

const TORCH_CELLS = [
  [1, 5], [5, 1], [9, 1], [11, 5],
];

function buildOctahedron(s) {
  const verts = [[0,s,0],[s,0,0],[0,0,s],[-s,0,0],[0,0,-s],[0,-s,0]];
  const faces = [[0,1,2],[0,2,3],[0,3,4],[0,4,1],[5,2,1],[5,3,2],[5,4,3],[5,1,4]];
  const positions = [], normals = [], texcoords = [], indices = [];
  let base = 0;

  for (const [a,b,c] of faces) {
    const pa = verts[a], pb = verts[b], pc = verts[c];
    const ab = [pb[0]-pa[0], pb[1]-pa[1], pb[2]-pa[2]];
    const ac = [pc[0]-pa[0], pc[1]-pa[1], pc[2]-pa[2]];
    const norm = Vec3.normalize(Vec3.cross(ab, ac));

    positions.push(...pa, ...pb, ...pc);
    normals.push(...norm, ...norm, ...norm);
    texcoords.push(0,0, 1,0, 0.5,1);
    indices.push(base, base+1, base+2);
    base += 3;
  }
  return { positions, normals, texcoords, indices };
}

function buildCylinder(radius, height, segments = 12) {
  const positions = [], normals = [], texcoords = [], indices = [];
  let base = 0;

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const x0 = Math.cos(a0) * radius, z0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius, z1 = Math.sin(a1) * radius;
    const n0 = [Math.cos(a0), 0, Math.sin(a0)];
    const n1 = [Math.cos(a1), 0, Math.sin(a1)];

    positions.push(x0,0,z0, x1,0,z1, x1,height,z1, x0,height,z0);
    normals.push(...n0, ...n1, ...n1, ...n0);
    texcoords.push(i/segments,1, (i+1)/segments,1, (i+1)/segments,0, i/segments,0);
    indices.push(base, base+1, base+2, base, base+2, base+3);
    base += 4;
  }
  return { positions, normals, texcoords, indices };
}

function buildDoorQuad(w, h) {
  return {
    positions: [-w/2,0,0, w/2,0,0, w/2,h,0, -w/2,h,0],
    normals:   [0,0,1, 0,0,1, 0,0,1, 0,0,1],
    texcoords: [0,0, 1,0, 1,1, 0,1],
    indices:   [0,1,2, 0,2,3]
  };
}

class Collectible {
  constructor(gl, program, row, col) {
    this.gl = gl;
    this.program = program;
    this.collected = false;
    this.row = row;
    this.col = col;
    this.x = col * CELL_SIZE + CELL_SIZE / 2;
    this.y = 0.9;
    this.z = row * CELL_SIZE + CELL_SIZE / 2;
    this.spinAngle = Math.random() * Math.PI * 2;
    this._build();
  }

  _build() {
    const gl = this.gl, geo = buildOctahedron(0.28);
    this.bufs = {
      pos: createBuffer(gl, geo.positions),
      norm: createBuffer(gl, geo.normals),
      tex: createBuffer(gl, geo.texcoords),
      idx: createIndexBuffer(gl, geo.indices),
      count: geo.indices.length
    };

    this.maps = {
      diffuse:  loadTextureFromURL(gl, 'textures/gem.png', false),
      normal:   loadTextureFromURL(gl, 'textures/gem_normal.png', false),
      specular: loadTextureFromURL(gl, 'textures/gem_specular.png', false),
      ambient:  loadTextureFromURL(gl, 'textures/gem_ambient.png', false)
    };
  }

  update(dt) {
    if (!this.collected) this.spinAngle += dt * 2.0;
  }

  draw() {
    if (this.collected) return;

    const gl = this.gl, prog = this.program;
    const bob = Math.sin(Date.now() * 0.002) * 0.09;
    const pulse = 1.0 + 0.08 * Math.sin(Date.now() * 0.003);

    let model = Mat4.multiply(
      Mat4.translation(this.x, this.y + bob, this.z),
      Mat4.rotationY(this.spinAngle)
    );
    model = Mat4.multiply(model, Mat4.scale(pulse, pulse, pulse));

    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'u_modelMatrix'), false, model);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'u_normalMatrix'), false, Mat4.normalMatrix(model));

    bindTextureMaps(gl, prog, this.maps);
    setAttrib(gl, prog, 'a_position', this.bufs.pos, 3);
    setAttrib(gl, prog, 'a_normal', this.bufs.norm, 3);
    setAttrib(gl, prog, 'a_texCoord', this.bufs.tex, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufs.idx);
    gl.drawElements(gl.TRIANGLES, this.bufs.count, gl.UNSIGNED_SHORT, 0);
  }

  checkCollection(px, pz) {
    if (this.collected) return false;
    const dx = px - this.x, dz = pz - this.z;
    if (Math.sqrt(dx*dx + dz*dz) < COLLECT_RADIUS) {
      this.collected = true;
      return true;
    }
    return false;
  }
}

class Pillar {
  constructor(gl, program, row, col) {
    this.gl = gl;
    this.program = program;
    this.x = col * CELL_SIZE + CELL_SIZE / 2;
    this.z = row * CELL_SIZE + CELL_SIZE / 2;
    this._build();
  }

  _build() {
    const gl = this.gl, geo = buildCylinder(0.20, WALL_HEIGHT, 14);
    this.bufs = {
      pos: createBuffer(gl, geo.positions),
      norm: createBuffer(gl, geo.normals),
      tex: createBuffer(gl, geo.texcoords),
      idx: createIndexBuffer(gl, geo.indices),
      count: geo.indices.length
    };

    this.maps = {
      diffuse: loadTextureFromURL(gl, 'textures/crate.png')
    };
  }

  draw() {
    const gl = this.gl, prog = this.program;
    const model = Mat4.translation(this.x, 0, this.z);

    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'u_modelMatrix'), false, model);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'u_normalMatrix'), false, Mat4.normalMatrix(model));

    bindTextureMaps(gl, prog, this.maps);
    setAttrib(gl, prog, 'a_position', this.bufs.pos, 3);
    setAttrib(gl, prog, 'a_normal', this.bufs.norm, 3);
    setAttrib(gl, prog, 'a_texCoord', this.bufs.tex, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufs.idx);
    gl.drawElements(gl.TRIANGLES, this.bufs.count, gl.UNSIGNED_SHORT, 0);
  }
}

class Torch {
  constructor(gl, program, row, col) {
    this.gl = gl;
    this.program = program;
    this.x = col * CELL_SIZE + CELL_SIZE / 2;
    this.z = row * CELL_SIZE + CELL_SIZE / 2;
    this.flicker = Math.random() * Math.PI * 2;
    this._build();
  }

  _build() {
    const gl = this.gl;
    const body = buildCylinder(0.08, 0.35, 8);
    this.bufs = {
      pos: createBuffer(gl, body.positions),
      norm: createBuffer(gl, body.normals),
      tex: createBuffer(gl, body.texcoords),
      idx: createIndexBuffer(gl, body.indices),
      count: body.indices.length
    };

    this.maps = { diffuse: solidTex(gl, 130, 75, 35) };

    const flame = buildOctahedron(0.12);
    this.flameBufs = {
      pos: createBuffer(gl, flame.positions),
      norm: createBuffer(gl, flame.normals),
      tex: createBuffer(gl, flame.texcoords),
      idx: createIndexBuffer(gl, flame.indices),
      count: flame.indices.length
    };
    this.flameMaps = { diffuse: solidTex(gl, 255, 150, 20) };
  }

  draw() {
    const gl = this.gl, prog = this.program;
    const mountY = 1.35;

    const model = Mat4.translation(this.x, mountY, this.z);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'u_modelMatrix'), false, model);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'u_normalMatrix'), false, Mat4.normalMatrix(model));
    bindTextureMaps(gl, prog, this.maps);
    setAttrib(gl, prog, 'a_position', this.bufs.pos, 3);
    setAttrib(gl, prog, 'a_normal', this.bufs.norm, 3);
    setAttrib(gl, prog, 'a_texCoord', this.bufs.tex, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufs.idx);
    gl.drawElements(gl.TRIANGLES, this.bufs.count, gl.UNSIGNED_SHORT, 0);

    this.flicker += 0.05;
    const flameY = mountY + 0.35 + Math.sin(this.flicker * 3.7) * 0.03;
    const flameScale = 1.0 + Math.sin(this.flicker * 5.1) * 0.15;
    const flameModel = Mat4.multiply(
      Mat4.translation(this.x, flameY, this.z),
      Mat4.scale(flameScale, flameScale, flameScale)
    );

    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'u_modelMatrix'), false, flameModel);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'u_normalMatrix'), false, Mat4.normalMatrix(flameModel));
    bindTextureMaps(gl, prog, this.flameMaps);
    setAttrib(gl, prog, 'a_position', this.flameBufs.pos, 3);
    setAttrib(gl, prog, 'a_normal', this.flameBufs.norm, 3);
    setAttrib(gl, prog, 'a_texCoord', this.flameBufs.tex, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.flameBufs.idx);
    gl.drawElements(gl.TRIANGLES, this.flameBufs.count, gl.UNSIGNED_SHORT, 0);
  }
}

class ExitDoor {
  constructor(gl, program) {
    this.gl = gl;
    this.program = program;
    this.unlocked = false;

    this.x = EXIT_CELL.col * CELL_SIZE + CELL_SIZE / 2;
    this.y = 0;
    this.z = EXIT_CELL.row * CELL_SIZE + CELL_SIZE / 2;
    this._build();
  }

  _build() {
    const gl = this.gl, geo = buildDoorQuad(CELL_SIZE * 0.85, WALL_HEIGHT);
    this.bufs = {
      pos: createBuffer(gl, geo.positions),
      norm: createBuffer(gl, geo.normals),
      tex: createBuffer(gl, geo.texcoords),
      idx: createIndexBuffer(gl, geo.indices),
      count: geo.indices.length
    };

    this.lockedMaps = {
      diffuse: loadTextureFromURL(gl, 'textures/door_locked.png', false)
    };
    this.unlockedMaps = {
      diffuse: loadTextureFromURL(gl, 'textures/door_open.png', false)
    };
  }

  unlock() {
    this.unlocked = true;
    const el = document.getElementById('hud-exit-status');
    el.textContent = 'OPEN';
    el.style.color = '#69ff47';
  }

  draw() {
    const gl = this.gl, prog = this.program;
    const model = Mat4.translation(this.x, this.y, this.z);

    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'u_modelMatrix'), false, model);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'u_normalMatrix'), false, Mat4.normalMatrix(model));

    bindTextureMaps(gl, prog, this.unlocked ? this.unlockedMaps : this.lockedMaps);

    gl.disable(gl.CULL_FACE);
    setAttrib(gl, prog, 'a_position', this.bufs.pos, 3);
    setAttrib(gl, prog, 'a_normal', this.bufs.norm, 3);
    setAttrib(gl, prog, 'a_texCoord', this.bufs.tex, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufs.idx);
    gl.drawElements(gl.TRIANGLES, this.bufs.count, gl.UNSIGNED_SHORT, 0);
    gl.enable(gl.CULL_FACE);
  }

  checkExit(px, pz) {
    if (!this.unlocked) return false;
    const dx = px - this.x, dz = pz - this.z;
    return Math.sqrt(dx*dx + dz*dz) < 1.0;
  }
}

class ObjectManager {
  constructor(gl, program) {
    this.collectibles = COLLECTIBLE_CELLS.map(([r,c]) => new Collectible(gl, program, r, c));
    this.pillars = PILLAR_CELLS.map(([r,c]) => new Pillar(gl, program, r, c));
    this.torches = TORCH_CELLS.map(([r,c]) => new Torch(gl, program, r, c));
    this.exit = new ExitDoor(gl, program);
    this.collectedCount = 0;

    document.getElementById('hud-total').textContent = this.collectibles.length;
    document.getElementById('hud-collected').textContent = '0';
  }

  get allCollected() {
    return this.collectedCount === this.collectibles.length;
  }

  update(dt, px, pz) {
    for (const c of this.collectibles) c.update(dt);

    for (const c of this.collectibles) {
      if (c.checkCollection(px, pz)) {
        this.collectedCount++;
        document.getElementById('hud-collected').textContent = this.collectedCount;
        const flash = document.getElementById('collect-flash');
        flash.classList.add('flash');
        setTimeout(() => flash.classList.remove('flash'), 150);
        if (this.allCollected) this.exit.unlock();
      }
    }

    if (this.exit.checkExit(px, pz)) return 'exit';
    return null;
  }

  draw() {
    for (const c of this.collectibles) c.draw();
    for (const p of this.pillars) p.draw();
    for (const t of this.torches) t.draw();
    this.exit.draw();
  }
}
