/**
 * Footprint
 * ---------------------------------------------------------------------------
 * The bowl plan, expressed once so that the structural builder, the seat
 * manifest, the crowd and the camera rails all agree on where things are.
 *
 * The plan is a rounded rectangle: four straight runs joined by four quarter
 * arcs, with arc centres at (±coreX, ±coreZ). Offsetting the shape outward by
 * `d` leaves the centres alone and grows the corner radius to
 * (cornerRadius + d) — which is why a single parameter t maps to a consistent
 * angular position on every ring, no matter how far out it is. That property
 * is what lets a seat in row 1 line up with the seat in row 44 behind it.
 *
 * t ∈ [0,1) walks the perimeter starting at the west sideline, running:
 *   west sideline → NW corner → north end → NE corner → east sideline →
 *   SE corner → south end → SW corner
 */

const DEG = Math.PI / 180;

export class Footprint {
  /** @param {{coreX:number, coreZ:number, cornerRadius:number, referenceRadius:number}} cfg */
  constructor(cfg) {
    this.coreX = cfg.coreX;
    this.coreZ = cfg.coreZ;
    this.cornerRadius = cfg.cornerRadius;

    const R = cfg.referenceRadius;
    /** @type {Array} segment table with normalised parameter ranges */
    this.segments = [
      { kind: 'straightX', dir:  1 },
      { kind: 'arc', cx:  1, cz: -1, a0: -90, a1:   0 },
      { kind: 'straightZ', dir:  1 },
      { kind: 'arc', cx:  1, cz:  1, a0:   0, a1:  90 },
      { kind: 'straightX', dir: -1 },
      { kind: 'arc', cx: -1, cz:  1, a0:  90, a1: 180 },
      { kind: 'straightZ', dir: -1 },
      { kind: 'arc', cx: -1, cz: -1, a0: 180, a1: 270 }
    ];

    let total = 0;
    for (const s of this.segments) {
      s.length = s.kind === 'straightX' ? 2 * this.coreX
               : s.kind === 'straightZ' ? 2 * this.coreZ
               : Math.PI * R / 2;
      total += s.length;
    }
    let acc = 0;
    for (const s of this.segments) {
      s.fraction = s.length / total;
      s.t0 = acc;
      acc += s.fraction;
      s.t1 = acc;
    }
    this.segments[this.segments.length - 1].t1 = 1;
  }

  /**
   * Named parameter ranges, so config can say `spans: ['west','east']` instead
   * of carrying magic numbers around.
   * @returns {Record<string,[number,number]>}
   */
  landmarks() {
    const s = this.segments;
    return {
      west:  [s[0].t0, s[0].t1],
      north: [s[2].t0, s[2].t1],
      east:  [s[4].t0, s[4].t1],
      south: [s[6].t0, s[6].t1],
      cornerNW: [s[1].t0, s[1].t1],
      cornerNE: [s[3].t0, s[3].t1],
      cornerSE: [s[5].t0, s[5].t1],
      cornerSW: [s[7].t0, s[7].t1],
      full: [0, 1]
    };
  }

  /**
   * Point on the ring offset `d` from the core shape, at height `y`.
   * @returns {{x:number,y:number,z:number,nx:number,nz:number,t:number}}
   *          nx/nz is the outward-facing unit normal in plan.
   */
  point(t, d, y = 0) {
    t = ((t % 1) + 1) % 1;
    const segs = this.segments;
    let g = segs[segs.length - 1];
    for (let i = 0; i < segs.length; i++) {
      if (t < segs[i].t1) { g = segs[i]; break; }
    }
    const u = (t - g.t0) / g.fraction;
    const R = this.cornerRadius + d;
    let x, z, nx, nz;

    if (g.kind === 'straightX') {
      x  = g.dir > 0 ? -this.coreX + 2 * this.coreX * u : this.coreX - 2 * this.coreX * u;
      z  = g.dir > 0 ? -(this.coreZ + R) : (this.coreZ + R);
      nx = 0; nz = g.dir > 0 ? -1 : 1;
    } else if (g.kind === 'straightZ') {
      z  = g.dir > 0 ? -this.coreZ + 2 * this.coreZ * u : this.coreZ - 2 * this.coreZ * u;
      x  = g.dir > 0 ? (this.coreX + R) : -(this.coreX + R);
      nx = g.dir > 0 ? 1 : -1; nz = 0;
    } else {
      const th = (g.a0 + (g.a1 - g.a0) * u) * DEG;
      nx = Math.cos(th); nz = Math.sin(th);
      x = g.cx * this.coreX + R * nx;
      z = g.cz * this.coreZ + R * nz;
    }
    return { x, y, z, nx, nz, t };
  }

  /** Polyline of `steps + 1` points spanning [t0,t1] on ring (d, y). */
  row(t0, t1, steps, d, y = 0) {
    const out = new Array(steps + 1);
    for (let j = 0; j <= steps; j++) out[j] = this.point(t0 + (t1 - t0) * (j / steps), d, y);
    return out;
  }

  /**
   * Arc-length lookup table for a ring, so seats can be placed at a true
   * physical pitch rather than at even parameter steps (which would bunch up
   * in the corners and stretch on the straights).
   */
  arcTable(d, t0, t1, samples = 900) {
    const ts = new Float64Array(samples + 1);
    const ls = new Float64Array(samples + 1);
    let prev = null;
    for (let i = 0; i <= samples; i++) {
      const t = t0 + (t1 - t0) * (i / samples);
      const p = this.point(t, d, 0);
      ts[i] = t;
      ls[i] = prev ? ls[i - 1] + Math.hypot(p.x - prev.x, p.z - prev.z) : 0;
      prev = p;
    }
    return { ts, ls, total: ls[samples], samples };
  }

  /** Inverse of arcTable: parameter t at arc length `s` metres along the ring. */
  tAtLength(table, s) {
    const { ts, ls, samples } = table;
    let lo = 0, hi = samples;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ls[mid] <= s) lo = mid; else hi = mid;
    }
    const span = ls[hi] - ls[lo] || 1;
    return ts[lo] + (ts[hi] - ts[lo]) * ((s - ls[lo]) / span);
  }

  /** Perimeter length of the ring at offset d. */
  perimeter(d) {
    return 4 * this.coreX + 4 * this.coreZ + 2 * Math.PI * (this.cornerRadius + d);
  }
}

export default Footprint;
