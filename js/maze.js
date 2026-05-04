// ============================================================
// maze.js  —  Maze layout, wall/floor geometry & rendering
// Maze Escape 3D  |  CS 4053
// Primary author: Keyera
// ============================================================

// ---- Maze grid definition ----------------------------------
// 1 = wall, 0 = open path, S = start, E = exit

const CELL_SIZE = 2.0;   // World units per maze cell
const WALL_HEIGHT = 2.5;

// 13x13 maze layout (0=open, 1=wall)
// Player starts near top-left, exit at bottom-right
const MAZE_GRID = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,1],
  [1,0,1,0,1,0,1,1,1,0,1,0,1],
  [1,0,1,0,0,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,1,1,0,1,1,1,1,1,0,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,1],
  [1,0,1,1,1,0,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,1,1,0,1,1,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const MAZE_ROWS = MAZE_GRID.length;
const MAZE_COLS = MAZE_GRID[0].length;

// Player start position (world space, open cell [1][1])
const PLAYER_START = {
  x: 1 * CELL_SIZE + CELL_SIZE / 2,
  y: 0.5,  // eye height
  z: 1 * CELL_SIZE + CELL_SIZE / 2
};

// Exit cell position (world space, cell [11][11])
const EXIT_CELL = { row: 11, col: 11 };

// ---- Geometry builders -------------------------------------

// Build a single quad face: positions (3), normals (3), texcoords (2)
// Returns { positions, normals, texcoords, indices }
function buildQuad(p0, p1, p2, p3, normal, texScale = 1) {
  // p0..p3 are [x,y,z] arrays, listed counter-clockwise
  const positions = [...p0, ...p1, ...p2, ...p3];
  const normals   = [...normal, ...normal, ...normal, ...normal];
  const tc = texScale;
  const texcoords = [0,0, tc,0, tc,tc, 0,tc];
  const indices   = [0,1,2, 0,2,3];
  return { positions, normals, texcoords, indices };
}

// Build a box (wall segment) given min/max corner coords
// For walls we only need the visible faces (inner-facing from corridor)
function buildWallBox(x0, y0, z0, x1, y1, z1) {
  const positions = [], normals = [], texcoords = [], indices = [];
  let base = 0;

  function addFace(ps, norm) {
    const tc = 1.0;
    positions.push(...ps[0], ...ps[1], ...ps[2], ...ps[3]);
    normals.push(...norm, ...norm, ...norm, ...norm);
    texcoords.push(0,0, tc,0, tc,tc, 0,tc);
    indices.push(base,base+1,base+2, base,base+2,base+3);
    base += 4;
  }

  // +X face (right)
  addFace([[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0]], [ 1,0,0]);
  // -X face (left)
  addFace([[x0,y0,z1],[x0,y0,z0],[x0,y1,z0],[x0,y1,z1]], [-1,0,0]);
  // +Z face (front)
  addFace([[x1,y0,z1],[x0,y0,z1],[x0,y1,z1],[x1,y1,z1]], [ 0,0,1]);
  // -Z face (back)
  addFace([[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]], [ 0,0,-1]);
  // +Y face (top)
  addFace([[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]], [ 0,1,0]);

  return { positions, normals, texcoords, indices };
}

// Build a flat horizontal quad for floor / ceiling
function buildFloorQuad(x0, z0, x1, z1, y, normalY, texScale = 0.5) {
  const positions = [x0,y,z0,  x1,y,z0,  x1,y,z1,  x0,y,z1];
  const norm = [0, normalY, 0];
  const normals   = [...norm,...norm,...norm,...norm];
  const texcoords = [0,0, texScale,0, texScale,texScale, 0,texScale];
  const indices   = normalY > 0
    ? [0,1,2, 0,2,3]
    : [0,2,1, 0,3,2];
  return { positions, normals, texcoords, indices };
}

// Merge an array of geometry objects into one
function mergeGeometries(geos) {
  const positions = [], normals = [], texcoords = [], indices = [];
  let base = 0;
  for (const g of geos) {
    positions.push(...g.positions);
    normals.push(...g.normals);
    texcoords.push(...g.texcoords);
    indices.push(...g.indices.map(i => i + base));
    base += g.positions.length / 3;
  }
  return { positions, normals, texcoords, indices };
}

// ---- Maze class --------------------------------------------

class Maze {
  constructor(gl, program) {
    this.gl = gl;
    this.program = program;
    this._buildGeometry();
    this._uploadBuffers();
  }

  _buildGeometry() {
    const wallGeos = [];
    const floorGeos = [];

    for (let row = 0; row < MAZE_ROWS; row++) {
      for (let col = 0; col < MAZE_COLS; col++) {
        const x0 = col * CELL_SIZE;
        const z0 = row * CELL_SIZE;
        const x1 = x0 + CELL_SIZE;
        const z1 = z0 + CELL_SIZE;

        // Floor for every cell
        floorGeos.push(buildFloorQuad(x0, z0, x1, z1, 0.0, 1));

        if (MAZE_GRID[row][col] === 1) {
          wallGeos.push(buildWallBox(x0, 0, z0, x1, WALL_HEIGHT, z1));
        }
      }
    }

    this.wallGeo  = mergeGeometries(wallGeos);
    this.floorGeo = mergeGeometries(floorGeos);
  }

  _uploadBuffers() {
    const gl = this.gl;

    this.wallBufs = {
      pos:  createBuffer(gl, this.wallGeo.positions),
      norm: createBuffer(gl, this.wallGeo.normals),
      tex:  createBuffer(gl, this.wallGeo.texcoords),
      idx:  createIndexBuffer(gl, this.wallGeo.indices),
      count: this.wallGeo.indices.length
    };

    this.floorBufs = {
      pos:  createBuffer(gl, this.floorGeo.positions),
      norm: createBuffer(gl, this.floorGeo.normals),
      tex:  createBuffer(gl, this.floorGeo.texcoords),
      idx:  createIndexBuffer(gl, this.floorGeo.indices),
      count: this.floorGeo.indices.length
    };

    // Placeholder textures — swap for loadTextureFromURL() when you have image files
    //this.wallTex  = loadTexture(gl, [80,  60,  50,  255]); // brownish stone
    //this.floorTex = loadTexture(gl, [55,  55,  60,  255]); // dark concrete
    
    this.wallTex  = loadTextureFromURL(gl, 'textures/wall.png');
    this.floorTex = loadTextureFromURL(gl, 'textures/floor.png');
  }

  draw(uniforms) {
    const gl = this.gl;
    const prog = this.program;

    const modelMat = Mat4.identity(); // maze is at world origin
    const normMat  = Mat4.normalMatrix(modelMat);

    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'u_modelMatrix'), false, modelMat);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_useTexture'), 1);

    // --- Walls ---
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'u_normalMatrix'), false, normMat);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.wallTex);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_texture'), 0);

    setAttrib(gl, prog, 'a_position', this.wallBufs.pos,  3);
    setAttrib(gl, prog, 'a_normal',   this.wallBufs.norm, 3);
    setAttrib(gl, prog, 'a_texCoord', this.wallBufs.tex,  2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.wallBufs.idx);
    gl.drawElements(gl.TRIANGLES, this.wallBufs.count, gl.UNSIGNED_SHORT, 0);

    // --- Floor ---
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.floorTex);

    setAttrib(gl, prog, 'a_position', this.floorBufs.pos,  3);
    setAttrib(gl, prog, 'a_normal',   this.floorBufs.norm, 3);
    setAttrib(gl, prog, 'a_texCoord', this.floorBufs.tex,  2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.floorBufs.idx);
    gl.drawElements(gl.TRIANGLES, this.floorBufs.count, gl.UNSIGNED_SHORT, 0);
  }

  // Utility: is (row, col) a wall?
  static isWall(row, col) {
    if (row < 0 || row >= MAZE_ROWS || col < 0 || col >= MAZE_COLS) return true;
    return MAZE_GRID[row][col] === 1;
  }

  // Utility: world position → grid cell
  static worldToCell(x, z) {
    return {
      row: Math.floor(z / CELL_SIZE),
      col: Math.floor(x / CELL_SIZE)
    };
  }
}