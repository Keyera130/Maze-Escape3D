// ============================================================
// objects.js  —  Collectibles & Exit Door
// Maze Escape 3D  |  CS 4053
// Primary author: Keyera (placement/transforms) + Reese (interaction logic)
// ============================================================

// Collectible spawn positions [row, col] — must be open cells
const COLLECTIBLE_CELLS = [
  [1, 3],
  [3, 5],
  [5, 7],
  [7, 1],
  [9, 9],
];

const COLLECT_RADIUS = 0.7; // how close player must be to pick up

// ---- Spinning Gem geometry (octahedron) --------------------

function buildOctahedron(size) {
  const s = size;
  // 6 vertices of a regular octahedron
  const verts = [
    [ 0,  s,  0],  // top
    [ s,  0,  0],  // right
    [ 0,  0,  s],  // front
    [-s,  0,  0],  // left
    [ 0,  0, -s],  // back
    [ 0, -s,  0],  // bottom
  ];

  // 8 triangular faces
  const faces = [
    [0,1,2], [0,2,3], [0,3,4], [0,4,1],
    [5,2,1], [5,3,2], [5,4,3], [5,1,4]
  ];

  const positions = [], normals = [], texcoords = [], indices = [];
  let base = 0;

  for (const [a, b, c] of faces) {
    const pa = verts[a], pb = verts[b], pc = verts[c];

    // Flat face normal
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

// ---- Exit Door geometry (flat quad facing -Z) --------------

function buildDoorQuad(width, height) {
  const hw = width / 2;
  const positions = [-hw,0,0, hw,0,0, hw,height,0, -hw,height,0];
  const norm = [0,0,1];
  const normals = [...norm,...norm,...norm,...norm];
  const texcoords = [0,0, 1,0, 1,1, 0,1];
  const indices = [0,1,2, 0,2,3];
  return { positions, normals, texcoords, indices };
}

// Unit cube centered at origin. Used for crates and the exit marker in the maze (added for unique object/texturing/lighting requirements)
function buildCube(size = 1.0) {
  const h = size / 2;
  const positions = [], normals = [], texcoords = [], indices = [];
  let base = 0;

  function addFace(ps, normal) {
    positions.push(...ps[0], ...ps[1], ...ps[2], ...ps[3]);
    normals.push(...normal, ...normal, ...normal, ...normal);
    texcoords.push(0,0, 1,0, 1,1, 0,1);
    indices.push(base, base+1, base+2, base, base+2, base+3);
    base += 4;
  }

  // +X, -X, +Y, -Y, +Z, -Z
  addFace([[ h,-h,-h],[ h,-h, h],[ h, h, h],[ h, h,-h]], [ 1,0,0]);
  addFace([[-h,-h, h],[-h,-h,-h],[-h, h,-h],[-h, h, h]], [-1,0,0]);
  addFace([[-h, h,-h],[ h, h,-h],[ h, h, h],[-h, h, h]], [ 0,1,0]);
  addFace([[-h,-h, h],[ h,-h, h],[ h,-h,-h],[-h,-h,-h]], [ 0,-1,0]);
  addFace([[ h,-h, h],[-h,-h, h],[-h, h, h],[ h, h, h]], [ 0,0,1]);
  addFace([[-h,-h,-h],[ h,-h,-h],[ h, h,-h],[-h, h,-h]], [ 0,0,-1]);

  return { positions, normals, texcoords, indices };
}

// ---- Collectible class -------------------------------------

class Collectible {
  constructor(gl, program, row, col) {
    this.gl = gl;
    this.program = program;
    this.collected = false;
    this.row = row;
    this.col = col;

    // World position: center of the cell, floating at mid-height
    this.x = col * CELL_SIZE + CELL_SIZE / 2;
    this.y = 0.9;
    this.z = row * CELL_SIZE + CELL_SIZE / 2;

    this.spinAngle = Math.random() * Math.PI * 2; // random starting rotation
    this._build();
  }

  _build() {
    const gl = this.gl;
    const geo = buildOctahedron(0.22);

    this.bufs = {
      pos:   createBuffer(gl, geo.positions),
      norm:  createBuffer(gl, geo.normals),
      tex:   createBuffer(gl, geo.texcoords),
      idx:   createIndexBuffer(gl, geo.indices),
      count: geo.indices.length
    };

    // Bright cyan gem color
    this.color = [0.1, 0.9, 1.0];
    this.tex = loadTexture(gl, [20, 220, 255, 255]);
    
    //ADDED texture for the gem
    this.tex = loadTextureFromURL(gl, 'textures/gem.png');
  }

  update(dt) {
    if (!this.collected) {
      this.spinAngle += dt * 1.8; // radians per second
    }
  }

  draw() {
    if (this.collected) return;
    const gl = this.gl;
    const prog = this.program;

    // Model: translate to position, rotate Y, bob up/down slightly
    const bob = Math.sin(Date.now() * 0.002) * 0.08;
    let model = Mat4.translation(this.x, this.y + bob, this.z);
    model = Mat4.multiply(model, Mat4.rotationY(this.spinAngle));

    const normMat = Mat4.normalMatrix(model);

    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'u_modelMatrix'), false, model);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'u_normalMatrix'), false, normMat);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_useTexture'), 0);
    gl.uniform3fv(gl.getUniformLocation(prog, 'u_objectColor'), this.color);

    setAttrib(gl, prog, 'a_position', this.bufs.pos,  3);
    setAttrib(gl, prog, 'a_normal',   this.bufs.norm, 3);
    setAttrib(gl, prog, 'a_texCoord', this.bufs.tex,  2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufs.idx);
    gl.drawElements(gl.TRIANGLES, this.bufs.count, gl.UNSIGNED_SHORT, 0);
  }

  // Returns true if player is within collection radius
  checkCollection(playerX, playerZ) {
    if (this.collected) return false;
    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    if (Math.sqrt(dx*dx + dz*dz) < COLLECT_RADIUS) {
      this.collected = true;
      return true;
    }
    return false;
  }
}

// ---- Exit Door class ---------------------------------------

class ExitDoor {
  constructor(gl, program) {
    this.gl = gl;
    this.program = program;
    this.unlocked = false;

    // Place door at exit cell, facing inward (-Z direction)
    this.x = EXIT_CELL.col * CELL_SIZE + CELL_SIZE / 2;
    this.y = 0;
    this.z = EXIT_CELL.row * CELL_SIZE + CELL_SIZE / 2;

    this._build();
  }

  _build() {
    const gl = this.gl;
    const geo = buildDoorQuad(CELL_SIZE * 0.8, WALL_HEIGHT);

    this.bufs = {
      pos:   createBuffer(gl, geo.positions),
      norm:  createBuffer(gl, geo.normals),
      tex:   createBuffer(gl, geo.texcoords),
      idx:   createIndexBuffer(gl, geo.indices),
      count: geo.indices.length
    };

    this.lockedTex   = loadTexture(gl, [200, 50,  50,  255]); // red = locked
    this.unlockedTex = loadTexture(gl, [50,  220, 80,  255]); // green = open
  }

  unlock() {
    this.unlocked = true;
    document.getElementById('hud-exit-status').textContent = 'OPEN';
    document.getElementById('hud-exit-status').style.color = '#69ff47';
  }

  draw() {
    const gl = this.gl;
    const prog = this.program;

    const model   = Mat4.translation(this.x, this.y, this.z);
    const normMat = Mat4.normalMatrix(model);

    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'u_modelMatrix'), false, model);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'u_normalMatrix'), false, normMat);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_useTexture'), 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.unlocked ? this.unlockedTex : this.lockedTex);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_texture'), 0);

    setAttrib(gl, prog, 'a_position', this.bufs.pos,  3);
    setAttrib(gl, prog, 'a_normal',   this.bufs.norm, 3);
    setAttrib(gl, prog, 'a_texCoord', this.bufs.tex,  2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufs.idx);
    gl.drawElements(gl.TRIANGLES, this.bufs.count, gl.UNSIGNED_SHORT, 0);
  }

  // Check if player reached unlocked exit
  checkExit(playerX, playerZ) {
    if (!this.unlocked) return false;
    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    return Math.sqrt(dx*dx + dz*dz) < 1.0;
  }
}

// ---- Scene object manager ----------------------------------

class ObjectManager {
  constructor(gl, program) {
    this.collectibles = COLLECTIBLE_CELLS.map(
      ([row, col]) => new Collectible(gl, program, row, col)
    );
    this.exit = new ExitDoor(gl, program);
    this.collectedCount = 0;

    // Update HUD totals
    document.getElementById('hud-total').textContent = this.collectibles.length;
    document.getElementById('hud-collected').textContent = '0';
  }

  get totalCollectibles() { return this.collectibles.length; }
  get allCollected() { return this.collectedCount === this.collectibles.length; }

  update(dt, playerX, playerZ) {
    // Animate
    for (const c of this.collectibles) c.update(dt);

    // Check pickups
    for (const c of this.collectibles) {
      if (c.checkCollection(playerX, playerZ)) {
        this.collectedCount++;
        document.getElementById('hud-collected').textContent = this.collectedCount;
        // Flash the screen
        const flash = document.getElementById('collect-flash');
        flash.classList.add('flash');
        setTimeout(() => flash.classList.remove('flash'), 120);

        if (this.allCollected) {
          this.exit.unlock();
        }
      }
    }

    // Check exit
    if (this.exit.checkExit(playerX, playerZ)) {
      return 'exit';
    }
    return null;
  }

  draw() {
    for (const c of this.collectibles) c.draw();
    this.exit.draw();
  }
}