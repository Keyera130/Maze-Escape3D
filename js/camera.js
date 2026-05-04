const MOVE_SPEED = 3.5;
const LOOK_SENS  = 0.002;
const MAX_PITCH  = Math.PI / 2 - 0.05;

class Camera {
  constructor(startX, startY, startZ) {
    this.x = startX;
    this.y = startY;
    this.z = startZ;

    this.yaw = 0;
    this.pitch = 0;
    this.pointerLocked = false;
    this.keys = {};

    this._bindEvents();
  }

  _bindEvents() {
    document.addEventListener('keydown', e => {
      const key = e.key.toLowerCase();
      this.keys[key] = true;

      if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) {
        e.preventDefault();
      }
    });

    document.addEventListener('keyup', e => {
      this.keys[e.key.toLowerCase()] = false;
    });

    document.addEventListener('mousemove', e => this._onMouseMove(e));
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = !!document.pointerLockElement;
    });
  }

  requestPointerLock() {
    document.getElementById('glCanvas').requestPointerLock();
  }

  _onMouseMove(e) {
    if (!this.pointerLocked) return;
    this.yaw += e.movementX * LOOK_SENS;
    this.pitch -= e.movementY * LOOK_SENS;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
  }

  getMovementDelta(dt) {
    // This matches getViewMatrix(), where yaw=0 looks toward +Z.
    const fwdX = Math.sin(this.yaw);
    const fwdZ = Math.cos(this.yaw);

    const rtX = Math.cos(this.yaw);
    const rtZ = -Math.sin(this.yaw);

    let dx = 0, dz = 0;

    if (this.keys['w'] || this.keys['arrowup'])    { dx += fwdX; dz += fwdZ; }
    if (this.keys['s'] || this.keys['arrowdown'])  { dx -= fwdX; dz -= fwdZ; }
    if (this.keys['a'] || this.keys['arrowleft'])  { dx -= rtX;  dz -= rtZ;  }
    if (this.keys['d'] || this.keys['arrowright']) { dx += rtX;  dz += rtZ;  }

    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) { dx /= len; dz /= len; }

    return { dx: dx * MOVE_SPEED * dt, dz: dz * MOVE_SPEED * dt };
  }

  move(dx, dz) {
    this.x += dx;
    this.z += dz;
  }

  getViewMatrix() {
    const dirX = Math.sin(this.yaw) * Math.cos(this.pitch);
    const dirY = Math.sin(this.pitch);
    const dirZ = Math.cos(this.yaw) * Math.cos(this.pitch);

    return this._lookAt(
      [this.x, this.y, this.z],
      [this.x + dirX, this.y + dirY, this.z + dirZ],
      [0, 1, 0]
    );
  }

  _lookAt(eye, center, up) {
    const f = Vec3.normalize(Vec3.sub(center, eye));
    const r = Vec3.normalize(Vec3.cross(f, up));
    const u = Vec3.cross(r, f);

    return new Float32Array([
       r[0],  u[0], -f[0], 0,
       r[1],  u[1], -f[1], 0,
       r[2],  u[2], -f[2], 0,
      -Vec3.dot(r, eye), -Vec3.dot(u, eye), Vec3.dot(f, eye), 1
    ]);
  }

  get position() { return [this.x, this.y, this.z]; }
}

