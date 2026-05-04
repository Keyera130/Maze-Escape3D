const CELL_SIZE   = 2.0;
const WALL_HEIGHT = 2.5;

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

const PLAYER_START = {
  x: 1 * CELL_SIZE + CELL_SIZE / 2,
  y: 1.35,
  z: 1 * CELL_SIZE + CELL_SIZE / 2
};

const EXIT_CELL = { row: 11, col: 11 };

function buildWallBox(x0, y0, z0, x1, y1, z1) {
  const positions = [], normals = [], texcoords = [], indices = [];
  let base = 0;

  function addFace(ps, norm, tileU = 1, tileV = 1) {
    positions.push(...ps[0], ...ps[1], ...ps[2], ...ps[3]);
    normals.push(...norm, ...norm, ...norm, ...norm);
    texcoords.push(0,0, tileU,0, tileU,tileV, 0,tileV);
    indices.push(base, base+1, base+2, base, base+2, base+3);
    base += 4;
  }

  addFace([[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0]], [ 1,0,0], 1, 1.25);
  addFace([[x0,y0,z1],[x0,y0,z0],[x0,y1,z0],[x0,y1,z1]], [-1,0,0], 1, 1.25);
  addFace([[x1,y0,z1],[x0,y0,z1],[x0,y1,z1],[x1,y1,z1]], [ 0,0,1], 1, 1.25);
  addFace([[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]], [ 0,0,-1], 1, 1.25);
  addFace([[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]], [ 0,1,0], 1, 1);
  addFace([[x0,y0,z1],[x1,y0,z1],[x1,y0,z0],[x0,y0,z0]], [ 0,-1,0], 1, 1);

  return { positions, normals, texcoords, indices };
}

function buildFloorTile(x0, z0, x1, z1) {
  return {
    positions: [x0,0,z0, x1,0,z0, x1,0,z1, x0,0,z1],
    normals:   [0,1,0, 0,1,0, 0,1,0, 0,1,0],
    texcoords: [0,0, 1,0, 1,1, 0,1],
    indices:   [0,1,2, 0,2,3]
  };
}

function buildCeilingTile(x0, z0, x1, z1) {
  return {
    positions: [x0,WALL_HEIGHT,z1, x1,WALL_HEIGHT,z1, x1,WALL_HEIGHT,z0, x0,WALL_HEIGHT,z0],
    normals:   [0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0],
    texcoords: [0,0, 1,0, 1,1, 0,1],
    indices:   [0,1,2, 0,2,3]
  };
}

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

class Maze {
  constructor(gl, program) {
    this.gl = gl;
    this.program = program;
    this._buildGeometry();
    this._uploadBuffers();
  }

  _buildGeometry() {
    const wallGeos = [], floorGeos = [], ceilingGeos = [];

    for (let row = 0; row < MAZE_ROWS; row++) {
      for (let col = 0; col < MAZE_COLS; col++) {
        const x0 = col * CELL_SIZE, z0 = row * CELL_SIZE;
        const x1 = x0 + CELL_SIZE, z1 = z0 + CELL_SIZE;

        floorGeos.push(buildFloorTile(x0, z0, x1, z1));
        ceilingGeos.push(buildCeilingTile(x0, z0, x1, z1));

        if (MAZE_GRID[row][col] === 1) {
          wallGeos.push(buildWallBox(x0, 0, z0, x1, WALL_HEIGHT, z1));
        }
      }
    }

    this.wallGeo = mergeGeometries(wallGeos);
    this.floorGeo = mergeGeometries(floorGeos);
    this.ceilingGeo = mergeGeometries(ceilingGeos);
  }

  _uploadBuffers() {
    const gl = this.gl;
    const upload = geo => ({
      pos: createBuffer(gl, geo.positions),
      norm: createBuffer(gl, geo.normals),
      tex: createBuffer(gl, geo.texcoords),
      idx: createIndexBuffer(gl, geo.indices),
      count: geo.indices.length
    });

    this.wallBufs = upload(this.wallGeo);
    this.floorBufs = upload(this.floorGeo);
    this.ceilingBufs = upload(this.ceilingGeo);

    // Put these image files inside your textures/ folder.
    this.wallMaps = {
      diffuse:  loadTextureFromURL(gl, 'textures/wall.png'),
      normal:   loadTextureFromURL(gl, 'textures/wall_normal.png'),
      specular: loadTextureFromURL(gl, 'textures/wall_specular.png'),
      ambient:  loadTextureFromURL(gl, 'textures/wall_ambient.png')
    };

    this.floorMaps = {
      diffuse: loadTextureFromURL(gl, 'textures/floor.png')
    };

    this.ceilingMaps = {
      diffuse: loadTextureFromURL(gl, 'textures/wall.png'),
      normal:  loadTextureFromURL(gl, 'textures/wall_normal.png')
    };
  }

  _drawMesh(bufs, maps) {
    const gl = this.gl, prog = this.program;

    bindTextureMaps(gl, prog, maps);
    setAttrib(gl, prog, 'a_position', bufs.pos, 3);
    setAttrib(gl, prog, 'a_normal', bufs.norm, 3);
    setAttrib(gl, prog, 'a_texCoord', bufs.tex, 2);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufs.idx);
    gl.drawElements(gl.TRIANGLES, bufs.count, gl.UNSIGNED_SHORT, 0);
  }

  draw() {
    const gl = this.gl, prog = this.program;
    const modelMat = Mat4.identity();

    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'u_modelMatrix'), false, modelMat);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'u_normalMatrix'), false, Mat4.normalMatrix(modelMat));

    gl.disable(gl.CULL_FACE);
    this._drawMesh(this.wallBufs, this.wallMaps);
    this._drawMesh(this.floorBufs, this.floorMaps);
    this._drawMesh(this.ceilingBufs, this.ceilingMaps);
    gl.enable(gl.CULL_FACE);
  }

  static isWall(row, col) {
    if (row < 0 || row >= MAZE_ROWS || col < 0 || col >= MAZE_COLS) return true;
    return MAZE_GRID[row][col] === 1;
  }

  static worldToCell(x, z) {
    return { row: Math.floor(z / CELL_SIZE), col: Math.floor(x / CELL_SIZE) };
  }
}
