/**
 * Holographic Centerpiece
 * ---------------------------------------------------------------------------
 * A suspended, orbiting holographic display that ANY venue can declare as
 * configuration rather than build as geometry.
 *
 * WHY THIS IS ENGINE CODE AND NOT LOUNGE CODE
 * -------------------------------------------
 * The first version of the Coog Paws Lounge built three sport surfaces inline
 * in its `buildSurface()`. That worked and was entirely unreusable: the next
 * lounge wanting a rotating trophy, mascot or statue would have copied several
 * hundred lines of shader and orbit maths and then maintained a second copy of
 * it. The authoring guide's split is that venues own WHAT, the engine owns
 * HOW — so the orbit, the shader, the flicker, the particles and the lifecycle
 * live here, and a venue declares a short spec.
 *
 * A venue says:
 *
 *   centerpiece: {
 *     height: 2.35, radius: 1.15, period: 26, tilt: 0.22, spin: 0.9,
 *     objects: [
 *       { shape: 'sphere',   radius: 0.30, tint: 0xff8a3c, detail: 'panels' },
 *       { shape: 'spheroid', radius: 0.30, tint: 0xffb067, detail: 'laces'  },
 *     ],
 *   }
 *
 * and gets a Ferris-wheel orbit of holograms with no geometry code at all.
 *
 * EXTENDING IT. `SHAPE_BUILDERS` is the seam. A trophy, a mascot, a statue or
 * a sponsor object is a new entry there, or a `{ shape: 'mesh', mesh }` spec
 * carrying geometry the venue already has. Neither requires touching the
 * orbit, the material or this file's lifecycle.
 *
 * NOT IMPLEMENTED, DELIBERATELY. `frontObject()` reports which object is
 * currently nearest the front of the orbit. The orbit has to know this anyway
 * to sort additive draw order, so exposing it costs nothing — and it is the
 * hook a future version would use to project a matching floor effect beneath
 * the leading object. No floor projection is built here.
 */

import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════
 * MATERIAL
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Projected light, not painted plastic. Fresnel edge emphasis, travelling
 * scan lines and additive blending are what make the difference; a
 * MeshStandardMaterial with emissive turned up reads as a solid model.
 */
export function createHologramMaterial(tint = 0xffb067, accent = 0x7ce0ff) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uTint: { value: new THREE.Color(tint) },
      uAccent: { value: new THREE.Color(accent) },
      uFlicker: { value: 1 },
      uBirth: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vLocal;
      void main() {
        vLocal = position;
        vNormalView = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uTint;
      uniform vec3 uAccent;
      uniform float uFlicker;
      uniform float uBirth;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vLocal;
      void main() {
        float fresnel = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))), 2.0);
        float scan = smoothstep(0.38, 0.5, fract(vLocal.y * 22.0 - uTime * 0.8));
        vec3 colour = mix(uTint, uAccent, fresnel * 0.55);
        float alpha = (0.20 + fresnel * 0.70) * (0.60 + 0.40 * scan);
        gl_FragColor = vec4(colour * (0.85 + fresnel), alpha * uFlicker * uBirth);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/* ═══════════════════════════════════════════════════════════════════════
 * SHAPE BUILDERS — the extension seam
 *
 * Each returns a THREE.Object3D sized around the origin. Detail lines are
 * separate additive line geometry so the silhouette stays readable when the
 * body is nearly transparent.
 * ═══════════════════════════════════════════════════════════════════════ */

function lineMaterial(tint, opacity = 0.85) {
  return new THREE.LineBasicMaterial({
    color: tint, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
}

function ringPoints(radius, segments = 48) {
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
  }
  return points;
}

/** Seam and panel detailing, chosen by name so a venue never writes geometry. */
function addDetail(group, spec, material) {
  const r = spec.radius ?? 0.3;

  if (spec.detail === 'seams') {
    /* Two curved seams meeting at the poles — a ball's tell at a glance. */
    for (const rotation of [0, Math.PI / 2]) {
      const curve = new THREE.EllipseCurve(0, 0, r * 1.002, r * 1.002, 0, Math.PI * 2);
      const geometry = new THREE.BufferGeometry().setFromPoints(
        curve.getPoints(48).map((p) => new THREE.Vector3(p.x, p.y, 0)),
      );
      const line = new THREE.Line(geometry, material);
      line.rotation.y = rotation;
      group.add(line);
    }
  }

  if (spec.detail === 'panels') {
    /* Latitude/longitude banding. */
    for (const lat of [-0.45, 0, 0.45]) {
      const bandRadius = r * Math.sqrt(Math.max(0.02, 1 - lat * lat));
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(ringPoints(bandRadius, 40)), material,
      );
      line.position.y = lat * r;
      group.add(line);
    }
    for (let i = 0; i < 4; i++) {
      const curve = new THREE.EllipseCurve(0, 0, r * 1.002, r * 1.002, 0, Math.PI * 2);
      const geometry = new THREE.BufferGeometry().setFromPoints(
        curve.getPoints(40).map((p) => new THREE.Vector3(p.x, p.y, 0)),
      );
      const line = new THREE.Line(geometry, material);
      line.rotation.y = (i / 4) * Math.PI;
      group.add(line);
    }
  }

  if (spec.detail === 'laces') {
    /* A lace run along the long axis, plus the cross stitches. */
    const laceLength = r * 0.55;
    const spine = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-laceLength, 0, r * 0.62),
      new THREE.Vector3(laceLength, 0, r * 0.62),
    ]);
    group.add(new THREE.Line(spine, material));
    for (let i = -2; i <= 2; i++) {
      const x = (i / 2) * laceLength * 0.8;
      const stitch = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, -r * 0.14, r * 0.62),
        new THREE.Vector3(x, r * 0.14, r * 0.62),
      ]);
      group.add(new THREE.Line(stitch, material));
    }
    /* The two end seams that give a prolate ball its shape. */
    for (const side of [-1, 1]) {
      const seam = new THREE.BufferGeometry().setFromPoints(
        ringPoints(r * 0.30, 24).map((p) => new THREE.Vector3(side * r * 0.62, p.x, p.z)),
      );
      group.add(new THREE.Line(seam, material));
    }
  }
}

/**
 * Named primitives. A venue references these by string; adding a trophy or a
 * mascot means adding an entry here, not changing the orbit or the material.
 */
export const SHAPE_BUILDERS = {
  /** A round ball. */
  sphere(spec, material) {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.SphereGeometry(spec.radius ?? 0.3, 28, 20), material));
    return group;
  },

  /**
   * A prolate spheroid — a football. Present from the outset precisely
   * because a football is NOT a scaled sphere, and an abstraction that can
   * only make spheres would have needed redesigning the first time anyone
   * wanted one.
   */
  spheroid(spec, material) {
    const group = new THREE.Group();
    const radius = spec.radius ?? 0.3;
    const geometry = new THREE.SphereGeometry(radius, 28, 20);
    geometry.scale(spec.elongation ?? 1.55, 1, 1);
    group.add(new THREE.Mesh(geometry, material));
    return group;
  },

  /** A ring — a hoop, a wreath, an orbit marker. */
  torus(spec, material) {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(
      new THREE.TorusGeometry(spec.radius ?? 0.3, spec.tube ?? 0.04, 12, 40), material,
    ));
    return group;
  },

  /**
   * Geometry the venue already has. The escape hatch for trophies, mascots,
   * statues and sponsor objects — anything the engine should not know how to
   * construct. The venue supplies geometry; the engine supplies the hologram.
   */
  mesh(spec, material) {
    const group = new THREE.Group();
    if (spec.geometry) group.add(new THREE.Mesh(spec.geometry, material));
    return group;
  },
};

/* ═══════════════════════════════════════════════════════════════════════
 * THE CENTERPIECE
 * ═══════════════════════════════════════════════════════════════════════ */

export class HolographicCenterpiece {
  /**
   * @param {object} spec venue-declared configuration
   * @param {THREE.Group} parent group to attach to
   */
  constructor(spec = {}, parent = null) {
    this.spec = spec;
    this.height = spec.height ?? 2.3;
    this.radius = spec.radius ?? 1.1;
    this.period = spec.period ?? 26;        // seconds for one full orbit
    this.tilt = spec.tilt ?? 0.2;           // orbit plane tilt, radians
    this.spin = spec.spin ?? 0.9;           // each object's own axis, rad/s
    this.bob = spec.bob ?? 0.06;

    this.group = new THREE.Group();
    this.group.position.y = this.height;
    this.group.rotation.x = this.tilt;

    /** @type {Array<{node:THREE.Object3D, material:THREE.ShaderMaterial, phase:number}>} */
    this.objects = [];
    this.materials = [];
    this._front = 0;

    const specs = spec.objects || [];
    specs.forEach((objectSpec, index) => {
      const builder = SHAPE_BUILDERS[objectSpec.shape];
      if (!builder) {
        console.warn(`[centerpiece] unknown shape "${objectSpec.shape}" — skipped`);
        return;
      }
      const material = createHologramMaterial(objectSpec.tint, objectSpec.accent);
      this.materials.push(material);

      const node = builder(objectSpec, material);
      addDetail(node, objectSpec, lineMaterial(objectSpec.tint ?? 0xffb067));

      /* Evenly spaced around the orbit, so three objects sit 120° apart
       * without the venue computing angles. */
      const phase = (index / Math.max(1, specs.length)) * Math.PI * 2;
      this.group.add(node);
      this.objects.push({ node, material, phase, spec: objectSpec });
    });

    if (spec.particles !== false) this._buildParticles();
    if (parent) parent.add(this.group);
  }

  /** Motes drifting through the orbit volume. Cheap, and they sell the light. */
  _buildParticles() {
    const count = this.spec.particleCount ?? 240;
    const positions = new Float32Array(count * 3);
    this._drift = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = this.radius * (0.4 + Math.random() * 0.9);
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.9;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      this._drift[i] = 0.02 + Math.random() * 0.06;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particles = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: this.spec.particleTint ?? 0xffd9a0,
      size: 0.018,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    this.group.add(this.particles);
  }

  /**
   * Index of the object currently nearest the front of the orbit.
   * The orbit computes this anyway; it is exposed as the documented hook for
   * a future floor projection beneath the leading object. Nothing consumes it
   * yet — see the file header.
   */
  frontObject() {
    return this.objects[this._front]?.spec ?? null;
  }

  /** A colour a venue may use to tint room lighting. */
  lightTint() {
    return this.objects[this._front]?.spec?.tint ?? 0xffb067;
  }

  /**
   * @param {number} dt seconds since last frame
   * @param {number} elapsed seconds since start
   */
  update(dt, elapsed) {
    const orbit = (elapsed / this.period) * Math.PI * 2;

    /* Flicker is shared across the set — one projector, one power supply. */
    const flicker = 0.92 + Math.sin(elapsed * 31) * 0.025 + Math.sin(elapsed * 7.3) * 0.045;

    let frontIndex = 0;
    let frontZ = -Infinity;

    for (let i = 0; i < this.objects.length; i++) {
      const entry = this.objects[i];
      const angle = orbit + entry.phase;

      const x = Math.cos(angle) * this.radius;
      const z = Math.sin(angle) * this.radius;
      entry.node.position.set(x, Math.sin(elapsed * 0.6 + entry.phase) * this.bob, z);

      /* Each object turns on its own axis as well as riding the orbit. */
      entry.node.rotation.y += dt * this.spin;
      entry.node.rotation.z = Math.sin(elapsed * 0.4 + entry.phase) * 0.15;

      entry.material.uniforms.uTime.value = elapsed;
      entry.material.uniforms.uFlicker.value = flicker;
      const birth = entry.material.uniforms.uBirth;
      birth.value += (1 - birth.value) * Math.min(1, dt * 2);

      if (z > frontZ) { frontZ = z; frontIndex = i; }
    }
    this._front = frontIndex;

    /* Additive blending is order-independent for colour but not for the
     * depth-sorted line work, so the leading object is drawn last. */
    for (let i = 0; i < this.objects.length; i++) {
      this.objects[i].node.renderOrder = i === frontIndex ? 2 : 1;
    }

    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < this._drift.length; i++) {
        positions[i * 3 + 1] += this._drift[i] * dt;
        if (positions[i * 3 + 1] > 0.5) positions[i * 3 + 1] = -0.5;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
      this.particles.rotation.y = orbit * 0.15;
    }
  }
}

export default HolographicCenterpiece;
