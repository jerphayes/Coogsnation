/**
 * FanFootprint
 * ---------------------------------------------------------------------------
 * The open, asymmetric plan for diamond sports — the one venue geometry the
 * rounded-rectangle Footprint cannot express, flagged as the single known core
 * change since Phase I (ADR open questions; ADR-017).
 *
 * This is NOT an architectural change. It is a second implementation of the
 * footprint seam. Everything downstream — SeatManager, VenueBuilder, crowd,
 * cameras, the twin — consumes `point() / landmarks() / arcTable() /
 * tAtLength() / perimeter()`, and none of it knows which plan produced the
 * numbers. arcTable, tAtLength and row are inherited untouched, because they
 * are generic over point().
 *
 * THE PLAN
 * --------
 * Home plate at the origin; center field along +X. The foul lines run at ±45°
 * from the +X axis. The grandstand front edge is the outward offset of that
 * "V" at distance `backstop`: two straights parallel to the baselines joined
 * by a 90° arc behind home plate — tangent-continuous by construction, which
 * is the same property that makes rows align in the rounded rectangle.
 *
 *   t = 0     far end of the THIRD-base straight (+Z side)
 *   t ≈ 0.5   directly behind home plate
 *   t = 1     far end of the FIRST-base straight (−Z side)
 *
 * OPEN vs CLOSED — the one behavioural difference
 * ----------------------------------------------
 * A bowl ring wraps: t = 1.02 means t = 0.02. A grandstand does not: past the
 * end is past the end. point() therefore CLAMPS t to [0,1] instead of taking
 * it modulo 1. Span bleed at the extremes flattens onto the end rather than
 * teleporting to the opposite baseline.
 */

import { Footprint } from './Footprint.js';

const DEG = Math.PI / 180;
const C45 = Math.SQRT1_2;      // cos 45° = sin 45°

export class FanFootprint extends Footprint {
  /**
   * @param {{backstop:number, baseline:number, referenceRadius?:number}} cfg
   *   backstop  distance from home plate to the grandstand front behind it
   *   baseline  covered length along each foul line
   */
  constructor(cfg) {
    // Deliberately NOT calling the rectangle constructor's segment setup;
    // super() with a compatible shape then overwrite. Footprint's constructor
    // only fills fields and segments, so this is safe and keeps instanceof.
    super({ coreX: 0, coreZ: 0, cornerRadius: cfg.backstop, referenceRadius: cfg.referenceRadius ?? cfg.backstop });

    this.kind = 'fan';
    this.backstop = cfg.backstop;
    this.baseline = cfg.baseline;

    const R = cfg.referenceRadius ?? cfg.backstop;
    this.segments = [
      { kind: 'third', length: cfg.baseline },
      { kind: 'arc', a0: 135, a1: 225, length: Math.PI * R / 2 },
      { kind: 'first', length: cfg.baseline }
    ];
    let total = 0;
    for (const s of this.segments) total += s.length;
    let acc = 0;
    for (const s of this.segments) {
      s.fraction = s.length / total;
      s.t0 = acc; acc += s.fraction; s.t1 = acc;
    }
    this.segments[2].t1 = 1;
  }

  landmarks() {
    const [third, arc, first] = this.segments;
    return {
      third: [third.t0, third.t1],
      home:  [arc.t0, arc.t1],
      first: [first.t0, first.t1],
      // Sub-ranges of the arc, for press box / suite placement behind the plate.
      plate: [arc.t0 + (arc.t1 - arc.t0) * 0.25, arc.t0 + (arc.t1 - arc.t0) * 0.75],
      full: [0, 1]
    };
  }

  point(t, d, y = 0) {
    t = Math.min(1, Math.max(0, t));            // CLAMP — an open arc does not wrap
    const segs = this.segments;
    let g = segs[segs.length - 1];
    for (let i = 0; i < segs.length; i++) {
      if (t < segs[i].t1) { g = segs[i]; break; }
    }
    const u = (t - g.t0) / g.fraction;
    const R = this.backstop + d;
    let x, z, nx, nz;

    if (g.kind === 'third') {
      // Travel from the outfield end toward home: s runs baseline → 0.
      const s = this.baseline * (1 - u);
      // Baseline direction and its foul-side (outward) normal.
      x = C45 * s - C45 * R;
      z = C45 * s + C45 * R;
      nx = -C45; nz = C45;
    } else if (g.kind === 'first') {
      const s = this.baseline * u;
      x = C45 * s - C45 * R;
      z = -C45 * s - C45 * R;
      nx = -C45; nz = -C45;
    } else {
      const th = (g.a0 + (g.a1 - g.a0) * u) * DEG;
      nx = Math.cos(th); nz = Math.sin(th);
      x = R * nx;
      z = R * nz;
    }
    return { x, y, z, nx, nz, t };
  }

  perimeter(d) {
    return 2 * this.baseline + (Math.PI / 2) * (this.backstop + d);
  }
}

export default FanFootprint;

/**
 * Choose a plan implementation from venue data. The venue declares
 * `footprint.kind`; omitting it means the classic closed bowl.
 */
export function createFootprint(cfg) {
  return cfg.kind === 'fan' ? new FanFootprint(cfg) : new Footprint(cfg);
}
