// objects.js — Maze Escape 3D
// Changes from original:
//   • Pillar replaced with Crate (real box, sits on floor, has box collision)
//   • Torch flame uses torch.png + normal/specular/ambient maps (camera-facing billboard)
//   • Torch stick keeps its solid-color cylinder
//   • Everything else identical to original

const COLLECTIBLE_CELLS = [
  [1, 3], [3, 5], [5, 7], [7, 1], [9, 9],
];
const COLLECT_RADIUS = 0.75;

const CRATE_CELLS = [        // was PILLAR_CELLS
  [3, 3], [5, 5], [7, 5], [9, 5],
];

const TORCH_CELLS = [
  [1, 5], [5, 1], [9, 1], [11, 5],
];

// ── Geometry helpers ──────────────────────────────────────

function buildOctahedron(s) {
  const verts = [[0,s,0],[s,0,0],[0,0,s],[-s,0,0],[0,0,-s],[0,-s,0]];
  const faces  = [[0,1,2],[0,2,3],[0,3,4],[0,4,1],[5,2,1],[5,3,2],[5,4,3],[5,1,4]];
  const positions = [], normals = [], texcoords = [], indices = [];
  let base = 0;
  for (const [a,b,c] of faces) {
    const pa=verts[a], pb=verts[b], pc=verts[c];
    const ab=[pb[0]-pa[0],pb[1]-pa[1],pb[2]-pa[2]];
    const ac=[pc[0]-pa[0],pc[1]-pa[1],pc[2]-pa[2]];
    const norm = Vec3.normalize(Vec3.cross(ab, ac));
    positions.push(...pa,...pb,...pc);
    normals.push(...norm,...norm,...norm);
    texcoords.push(0,0, 1,0, 0.5,1);
    indices.push(base, base+1, base+2);
    base += 3;
  }
  return { positions, normals, texcoords, indices };
}

function buildCylinder(radius, height, segments=12) {
  const positions=[], normals=[], texcoords=[], indices=[];
  let base=0;
  for (let i=0; i<segments; i++) {
    const a0=(i/segments)*Math.PI*2, a1=((i+1)/segments)*Math.PI*2;
    const x0=Math.cos(a0)*radius, z0=Math.sin(a0)*radius;
    const x1=Math.cos(a1)*radius, z1=Math.sin(a1)*radius;
    const n0=[Math.cos(a0),0,Math.sin(a0)], n1=[Math.cos(a1),0,Math.sin(a1)];
    positions.push(x0,0,z0, x1,0,z1, x1,height,z1, x0,height,z0);
    normals.push(...n0,...n1,...n1,...n0);
    texcoords.push(i/segments,1, (i+1)/segments,1, (i+1)/segments,0, i/segments,0);
    indices.push(base,base+1,base+2, base,base+2,base+3);
    base += 4;
  }
  return { positions, normals, texcoords, indices };
}

// Real 6-sided box — each face has its own correct normal and UV 0→1
function buildBox(w, h, d) {
  const hw=w/2, hd=d/2;
  const positions=[], normals=[], texcoords=[], indices=[];
  let base=0;
  function face(pts, n) {
    positions.push(...pts[0],...pts[1],...pts[2],...pts[3]);
    normals.push(...n,...n,...n,...n);
    texcoords.push(0,0, 1,0, 1,1, 0,1);
    indices.push(base,base+1,base+2, base,base+2,base+3);
    base += 4;
  }
  face([[-hw,0, hd],[ hw,0, hd],[ hw,h, hd],[-hw,h, hd]], [ 0,0, 1]); // front
  face([[ hw,0,-hd],[-hw,0,-hd],[-hw,h,-hd],[ hw,h,-hd]], [ 0,0,-1]); // back
  face([[ hw,0, hd],[ hw,0,-hd],[ hw,h,-hd],[ hw,h, hd]], [ 1,0, 0]); // right
  face([[-hw,0,-hd],[-hw,0, hd],[-hw,h, hd],[-hw,h,-hd]], [-1,0, 0]); // left
  face([[-hw,h, hd],[ hw,h, hd],[ hw,h,-hd],[-hw,h,-hd]], [ 0,1, 0]); // top
  face([[-hw,0,-hd],[ hw,0,-hd],[ hw,0, hd],[-hw,0, hd]], [ 0,-1,0]); // bottom
  return { positions, normals, texcoords, indices };
}

// Flat billboard quad — rotated to face camera in draw()
function buildBillboard(w, h) {
  return {
    positions: [-w/2,0,0,  w/2,0,0,  w/2,h,0,  -w/2,h,0],
    normals:   [0,0,1,     0,0,1,     0,0,1,     0,0,1],
    texcoords: [0,1,       1,1,       1,0,       0,0],
    indices:   [0,1,2,     0,2,3]
  };
}

function buildDoorQuad(w, h) {
  return {
    positions: [-w/2,0,0, w/2,0,0, w/2,h,0, -w/2,h,0],
    normals:   [0,0,1, 0,0,1, 0,0,1, 0,0,1],
    texcoords: [0,0, 1,0, 1,1, 0,1],
    indices:   [0,1,2, 0,2,3]
  };
}

// ── Collectible (unchanged) ───────────────────────────────

class Collectible {
  constructor(gl, program, row, col) {
    this.gl=gl; this.program=program;
    this.collected=false; this.row=row; this.col=col;
    this.x=col*CELL_SIZE+CELL_SIZE/2;
    this.y=0.9;
    this.z=row*CELL_SIZE+CELL_SIZE/2;
    this.spinAngle=Math.random()*Math.PI*2;
    this._build();
  }

  _build() {
    const gl=this.gl, geo=buildOctahedron(0.28);
    this.bufs={
      pos:  createBuffer(gl,geo.positions),
      norm: createBuffer(gl,geo.normals),
      tex:  createBuffer(gl,geo.texcoords),
      idx:  createIndexBuffer(gl,geo.indices),
      count:geo.indices.length
    };
    this.maps={
      diffuse:  loadTextureFromURL(gl,'textures/gem.png',false),
      normal:   loadTextureFromURL(gl,'textures/gem_normal.png',false),
      specular: loadTextureFromURL(gl,'textures/gem_specular.png',false),
      ambient:  loadTextureFromURL(gl,'textures/gem_ambient.png',false)
    };
  }

  update(dt) { if (!this.collected) this.spinAngle += dt*2.0; }

  draw() {
    if (this.collected) return;
    const gl=this.gl, prog=this.program;
    const bob=Math.sin(Date.now()*0.002)*0.09;
    const pulse=1.0+0.08*Math.sin(Date.now()*0.003);
    let model=Mat4.multiply(
      Mat4.translation(this.x,this.y+bob,this.z),
      Mat4.rotationY(this.spinAngle)
    );
    model=Mat4.multiply(model,Mat4.scale(pulse,pulse,pulse));
    gl.uniformMatrix4fv(gl.getUniformLocation(prog,'u_modelMatrix'),false,model);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog,'u_normalMatrix'),false,Mat4.normalMatrix(model));
    bindTextureMaps(gl,prog,this.maps);
    setAttrib(gl,prog,'a_position',this.bufs.pos,3);
    setAttrib(gl,prog,'a_normal',  this.bufs.norm,3);
    setAttrib(gl,prog,'a_texCoord',this.bufs.tex,2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.bufs.idx);
    gl.drawElements(gl.TRIANGLES,this.bufs.count,gl.UNSIGNED_SHORT,0);
  }

  checkCollection(px,pz) {
    if (this.collected) return false;
    const dx=px-this.x, dz=pz-this.z;
    if (Math.sqrt(dx*dx+dz*dz)<COLLECT_RADIUS) { this.collected=true; return true; }
    return false;
  }
}

// ── Crate (replaces Pillar — real box, sits on floor) ─────
// Player walks around it; collision handled in collision.js
// via _crateBoxes array checked in _collidesAtPoint

class Crate {
  constructor(gl, program, row, col) {
    this.gl=gl; this.program=program;
    this.x=col*CELL_SIZE+CELL_SIZE/2;
    this.z=row*CELL_SIZE+CELL_SIZE/2;
    const sz=0.70;                    // box side length in world units
    this.sz=sz;
    const geo=buildBox(sz,sz,sz);
    this.bufs={
      pos:  createBuffer(gl,geo.positions),
      norm: createBuffer(gl,geo.normals),
      tex:  createBuffer(gl,geo.texcoords),
      idx:  createIndexBuffer(gl,geo.indices),
      count:geo.indices.length
    };
    this.maps={
      diffuse:  loadTextureFromURL(gl,'textures/crate.png'),
      normal:   loadTextureFromURL(gl,'textures/crate_normal.png'),
      specular: loadTextureFromURL(gl,'textures/crate_specular.png'),
      ambient:  loadTextureFromURL(gl,'textures/crate_ambient.png')
    };
  }

  draw() {
    const gl=this.gl, prog=this.program;
    // y = sz/2 → bottom face sits exactly on the floor at y=0
    const model=Mat4.translation(this.x, this.sz/2, this.z);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog,'u_modelMatrix'),false,model);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog,'u_normalMatrix'),false,Mat4.normalMatrix(model));
    bindTextureMaps(gl,prog,this.maps);
    setAttrib(gl,prog,'a_position',this.bufs.pos,3);
    setAttrib(gl,prog,'a_normal',  this.bufs.norm,3);
    setAttrib(gl,prog,'a_texCoord',this.bufs.tex,2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.bufs.idx);
    gl.drawElements(gl.TRIANGLES,this.bufs.count,gl.UNSIGNED_SHORT,0);
  }

  // AABB half-extents for collision (slightly bigger than visual to feel solid)
  get halfSize() { return this.sz/2 + 0.08; }
}

// ── Torch ─────────────────────────────────────────────────
// Stick: solid-colour cylinder (unchanged look)
// Flame: camera-facing billboard using torch.png + normal/specular/ambient

class Torch {
  constructor(gl, program, row, col) {
    this.gl=gl; this.program=program;
    this.x=col*CELL_SIZE+CELL_SIZE/2;
    this.z=row*CELL_SIZE+CELL_SIZE/2;
    this.flicker=Math.random()*Math.PI*2;
    this._build();
  }

  _build() {
    const gl=this.gl;

    // Stick — small dark-wood cylinder
    const body=buildCylinder(0.06,0.38,8);
    this.bufs={
      pos:  createBuffer(gl,body.positions),
      norm: createBuffer(gl,body.normals),
      tex:  createBuffer(gl,body.texcoords),
      idx:  createIndexBuffer(gl,body.indices),
      count:body.indices.length
    };
    this.maps={ diffuse: solidTex(gl,90,52,22) };

    // Flame billboard — uses your torch texture files
    const bill=buildBillboard(0.60,0.75);
    this.flameBufs={
      pos:  createBuffer(gl,bill.positions),
      norm: createBuffer(gl,bill.normals),
      tex:  createBuffer(gl,bill.texcoords),
      idx:  createIndexBuffer(gl,bill.indices),
      count:bill.indices.length
    };
    this.flameMaps={
      diffuse:  loadTextureFromURL(gl,'textures/torch.png',    false),
      normal:   loadTextureFromURL(gl,'textures/torch_normal.png',   false),
      specular: loadTextureFromURL(gl,'textures/torch_specular.png', false),
      ambient:  loadTextureFromURL(gl,'textures/torch_ambient.png',  false)
    };
  }

  draw(camX, camZ) {
    const gl=this.gl, prog=this.program;
    const mountY=1.10;

    // Draw stick
    const stickModel=Mat4.translation(this.x,mountY,this.z);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog,'u_modelMatrix'),false,stickModel);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog,'u_normalMatrix'),false,Mat4.normalMatrix(stickModel));
    bindTextureMaps(gl,prog,this.maps);
    setAttrib(gl,prog,'a_position',this.bufs.pos,3);
    setAttrib(gl,prog,'a_normal',  this.bufs.norm,3);
    setAttrib(gl,prog,'a_texCoord',this.bufs.tex,2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.bufs.idx);
    gl.drawElements(gl.TRIANGLES,this.bufs.count,gl.UNSIGNED_SHORT,0);

    // Draw flame billboard — faces the camera, flickers
    this.flicker += 0.05;
    const angle=Math.atan2(camX-this.x, camZ-this.z);
    const sx=0.88+Math.sin(this.flicker*4.7)*0.12;   // X flicker
    const sy=0.92+Math.sin(this.flicker*6.3+1.1)*0.08; // Y flicker
    let flameModel=Mat4.multiply(
      Mat4.translation(this.x, mountY+0.02, this.z),
      Mat4.rotationY(angle)
    );
    flameModel=Mat4.multiply(flameModel, Mat4.scale(sx,sy,1.0));

    // Alpha blending so transparent parts of torch.png don't show as black
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);   // don't write depth for transparent quad
    gl.disable(gl.CULL_FACE);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog,'u_modelMatrix'),false,flameModel);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog,'u_normalMatrix'),false,Mat4.normalMatrix(flameModel));
    bindTextureMaps(gl,prog,this.flameMaps);
    setAttrib(gl,prog,'a_position',this.flameBufs.pos,3);
    setAttrib(gl,prog,'a_normal',  this.flameBufs.norm,3);
    setAttrib(gl,prog,'a_texCoord',this.flameBufs.tex,2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.flameBufs.idx);
    gl.drawElements(gl.TRIANGLES,this.flameBufs.count,gl.UNSIGNED_SHORT,0);
    // Restore opaque state
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  get flamePos() { return [this.x, 1.65, this.z]; }
}

// ── ExitDoor (unchanged) ──────────────────────────────────

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
    const gl=this.gl, geo=buildDoorQuad(CELL_SIZE*0.85,WALL_HEIGHT);
    this.bufs={
      pos:  createBuffer(gl,geo.positions),
      norm: createBuffer(gl,geo.normals),
      tex:  createBuffer(gl,geo.texcoords),
      idx:  createIndexBuffer(gl,geo.indices),
      count:geo.indices.length
    };
    this.lockedMaps={
      diffuse:  loadTextureFromURL(gl,'textures/door_locked.png',false),
      normal:   loadTextureFromURL(gl,'textures/door_locked_normal.png',false),
      specular: loadTextureFromURL(gl,'textures/door_locked_specular.png',false),
      ambient:  loadTextureFromURL(gl,'textures/door_locked_ambient.png',false)
    };
    this.unlockedMaps={
      diffuse:  loadTextureFromURL(gl,'textures/door_open.png',false),
      normal:   loadTextureFromURL(gl,'textures/door_open_normal.png',false),
      specular: loadTextureFromURL(gl,'textures/door_open_specular.png',false),
      ambient:  loadTextureFromURL(gl,'textures/door_open_ambient.png',false)
    };
  }

  unlock() {
    this.unlocked=true;
    const el=document.getElementById('hud-exit-status');
    el.textContent='OPEN'; el.style.color='#69ff47';
  }

  draw() {
    const gl=this.gl, prog=this.program;
    const model=Mat4.translation(this.x,this.y,this.z);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog,'u_modelMatrix'),false,model);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog,'u_normalMatrix'),false,Mat4.normalMatrix(model));
    bindTextureMaps(gl,prog,this.unlocked?this.unlockedMaps:this.lockedMaps);
    gl.disable(gl.CULL_FACE);
    setAttrib(gl,prog,'a_position',this.bufs.pos,3);
    setAttrib(gl,prog,'a_normal',  this.bufs.norm,3);
    setAttrib(gl,prog,'a_texCoord',this.bufs.tex,2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.bufs.idx);
    gl.drawElements(gl.TRIANGLES,this.bufs.count,gl.UNSIGNED_SHORT,0);
    gl.enable(gl.CULL_FACE);
  }

  checkExit(px,pz) {
    if (!this.unlocked) return false;
    const dx=px-this.x, dz=pz-this.z;
    return Math.sqrt(dx*dx+dz*dz)<1.0;
  }
}

// ── ObjectManager ─────────────────────────────────────────

class ObjectManager {
  constructor(gl, program) {
    this.collectibles=COLLECTIBLE_CELLS.map(([r,c])=>new Collectible(gl,program,r,c));
    this.crates      =CRATE_CELLS.map(([r,c])      =>new Crate(gl,program,r,c));
    this.torches     =TORCH_CELLS.map(([r,c])      =>new Torch(gl,program,r,c));
    this.exit        =new ExitDoor(gl,program);
    this.collectedCount=0;
    document.getElementById('hud-total').textContent    =this.collectibles.length;
    document.getElementById('hud-collected').textContent='0';
  }

  get allCollected() { return this.collectedCount===this.collectibles.length; }

  update(dt, px, pz) {
    for (const c of this.collectibles) c.update(dt);
    for (const c of this.collectibles) {
      if (c.checkCollection(px,pz)) {
        this.collectedCount++;
        document.getElementById('hud-collected').textContent=this.collectedCount;
        const flash=document.getElementById('collect-flash');
        flash.classList.add('flash');
        setTimeout(()=>flash.classList.remove('flash'),150);
        if (this.allCollected) this.exit.unlock();
      }
    }
    if (this.exit.checkExit(px,pz)) return 'exit';
    return null;
  }

  // camX/camZ so torch billboards face the camera
  draw(camX, camZ) {
    for (const c of this.collectibles) c.draw();
    for (const cr of this.crates)      cr.draw();
    for (const t of this.torches)      t.draw(camX, camZ);
    this.exit.draw();
  }
}