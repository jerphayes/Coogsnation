/**
 * VenueBuilder
 * ---------------------------------------------------------------------------
 * Everything in a venue that is not a seat, a spectator or a light.
 *
 * Reads its entire brief from a VenueDefinition. Any structure key the venue
 * omits is simply not built — which is how an indoor arena skips masts, a
 * canopy and a press box without a single conditional about basketball.
 *
 * All geometry is procedural. Nothing is imported, traced or referenced from a
 * real building; change the venue definition and you get a different building,
 * not a distorted copy of this one.
 *
 * Output is merged into a small number of meshes per system because these are
 * large, always-visible objects where draw-call count matters more than
 * culling granularity. Seats do the opposite — see SeatManager.
 */

import * as THREE from 'three';


/* --------------------------------------------------------------------------
 * Small quad-soup helper. Push quads, get a mesh with computed normals.
 * ------------------------------------------------------------------------ */
class Soup {
  constructor() { this.pos = []; this.uv = []; }
  quad(a, b, c, d, u0 = 0, u1 = 1, v0 = 0, v1 = 1) {
    const P = this.pos, U = this.uv;
    P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z,
           a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
    U.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
  }
  strip(rows, uScale = 0.5, vScale = 0.5) {
    for (let i = 0; i < rows.length - 1; i++) {
      for (let j = 0; j < rows[i].length - 1; j++) {
        this.quad(rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j],
                  j * uScale, (j + 1) * uScale, i * vScale, (i + 1) * vScale);
      }
    }
  }
  get empty() { return this.pos.length === 0; }
  mesh(material, name) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material);
    m.name = name || 'structure';
    return m;
  }
}

/* Procedural surface noise so nothing reads as flat plastic. */
function noiseTexture(base, spread, size = 256, repeat = 12) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let i = 0; i < size * size; i++) {
    const n = (Math.random() - 0.5) * spread + (Math.random() < 0.004 ? -38 : 0);
    d[i * 4] = base[0] + n; d[i * 4 + 1] = base[1] + n; d[i * 4 + 2] = base[2] + n; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < size / 8; i++) { ctx.fillStyle = '#000'; ctx.fillRect(0, Math.random() * size, size, 1); }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class VenueBuilder {
  /** @param {{scene, footprint, venue, renderer}} ctx */
  constructor(ctx) {
    this.scene = ctx.scene;
    this.fp = ctx.footprint;
    this.renderer = ctx.renderer;
    this.venue = ctx.venue;
    this.structure = ctx.venue.structure || {};

    this.group = new THREE.Group();
    this.group.name = `venue-${ctx.venue.id}`;
    this.scene.add(this.group);

    this.boards = new Map();      // id → { canvas, texture, mesh }
    this._materials();

    // Synchronous by default. Production uses VenueBuilder.create(), which
    // runs the same phases with the thread surrendered between them.
    if (!ctx.defer) this._buildAll();
  }

  /** The phase list, shared by the sync and chunked paths. */
  _phases() {
    const st = this.structure;
    return [
      { label: 'seating decks', weight: 6, run: () => this.tierSteps() },
      st.facade      && { label: 'facade',      run: () => this._buildFacade() },
      st.suites      && { label: 'suites',      run: () => this._buildSuites() },
      st.canopy      && { label: 'canopy',      run: () => this._buildCanopy() },
      st.roof        && { label: 'roof',        run: () => this._buildRoof() },
      st.pressBox    && { label: 'press box',   run: () => this._buildPressBox() },
      { label: 'circulation', weight: 2, run: () => this._buildCirculation() },
      st.videoBoards && { label: 'boards',      run: () => this._buildVideoBoards() },
      st.ribbonBoards&& { label: 'ribbons',     run: () => this._buildRibbonBoards() },
      st.approach    && { label: 'approach',    run: () => this._buildApproach() },
      st.tailgate    && { label: 'tailgate',    run: () => this._buildTailgate() },
      { label: 'playing surface', weight: 2, run: () => {
        this.venue.buildSurface({
          group: this.group, materials: this.mat, renderer: this.renderer, THREE
        });
        this.venue.onBuilt({ group: this.group, builder: this });
      } }
    ].filter(Boolean);
  }

  _buildAll() {
    for (const phase of this._phases()) {
      const r = phase.run();
      if (r && typeof r.next === 'function') { for (const _ of r) { /* drain */ } }
    }
  }

  /**
   * Chunked construction. Same output as the constructor; the thread is
   * surrendered between phases and, within the seating decks, between spans.
   * @returns {Promise<VenueBuilder>}
   */
  static async create(ctx, onProgress) {
    const { runPhases } = await import('../core/scheduler.js');
    const vb = new VenueBuilder({ ...ctx, defer: true });
    await runPhases(vb._phases(), { onProgress });
    return vb;
  }

  _buildTiers() { for (const _ of this.tierSteps()) { /* drain */ } }

  /* ------------------------------------------------------------------ */

  _materials() {
    const ds = THREE.DoubleSide;
    this.mat = {
      concrete: new THREE.MeshStandardMaterial({ map: noiseTexture([132, 136, 140], 26, 256, 14), roughness: 0.93, metalness: 0.02, side: ds }),
      deck:     new THREE.MeshStandardMaterial({ map: noiseTexture([104, 108, 113], 22, 256, 20), roughness: 0.95, metalness: 0.02, side: ds }),
      panel:    new THREE.MeshStandardMaterial({ map: noiseTexture([58, 64, 72], 16, 256, 10), roughness: 0.6, metalness: 0.35, side: ds }),
      soffit:   new THREE.MeshStandardMaterial({ color: 0x2b3238, roughness: 0.92, side: ds }),
      steel:    new THREE.MeshStandardMaterial({ color: 0xb9c2c8, roughness: 0.42, metalness: 0.75 }),
      rail:     new THREE.MeshStandardMaterial({ color: 0x9aa6ad, roughness: 0.4, metalness: 0.7, side: ds }),
      stair:    new THREE.MeshStandardMaterial({ color: 0xcfd6da, roughness: 0.9, side: ds }),
      glass:    new THREE.MeshStandardMaterial({ color: 0x1d2b38, roughness: 0.15, metalness: 0.5, emissive: 0xffd9a0, emissiveIntensity: 0.55, side: ds }),
      lit:      new THREE.MeshStandardMaterial({ color: 0x2a2016, emissive: 0xffbe6e, emissiveIntensity: 0.9, side: ds }),
      dark:     new THREE.MeshStandardMaterial({ color: 0x11161d, roughness: 0.9, side: ds }),
      apron:    new THREE.MeshStandardMaterial({ color: 0x1b2a24, roughness: 0.98 }),
      ground:   new THREE.MeshStandardMaterial({ color: 0x0d1219, roughness: 1 })
    };
  }

  _spanRanges(tier) {
    const marks = this.fp.landmarks();
    const bleed = this.venue.spanBleed;
    if (tier.spans === 'full') return [[0, 1, true]];
    return tier.spans.map(name => [marks[name][0] - bleed, marks[name][1] + bleed, false]);
  }

  /* ------------------------------------------------------------------
   * RAKED CONCRETE
   * ---------------------------------------------------------------- */

  /**
   * Generator form. Yields after each SPAN — the natural seam, because a span
   * is one contiguous run of deck and nothing later depends on it.
   */
  * tierSteps() {
    const fp = this.fp;
    let done = 0;
    const total = this.venue.tiers.reduce((n, t) => n + this._spanRanges(t).length, 0);

    for (const tier of this.venue.tiers) {
      const nodeD = i => tier.d0 + (tier.d1 - tier.d0) * (i / (tier.rows - 1));
      const nodeY = i => tier.y0 + (tier.y1 - tier.y0) * (i / (tier.rows - 1));
      const elevated = tier.y0 > 6;

      const ranges = this._spanRanges(tier);
      for (let spanIdx = 0; spanIdx < ranges.length; spanIdx++) {
        const [t0, t1, closed] = ranges[spanIdx];
        const steps = Math.max(60, Math.round((t1 - t0) * 430));
        const deck = new Soup();

        // treads and risers
        //
        // The yield lives INSIDE the row loop, not at the span boundary. A
        // `spans: 'full'` tier is one span, so a per-span seam left the entire
        // lower bowl as a single indivisible 180ms unit — the seam has to be
        // finer than the largest thing it is meant to divide.
        for (let i = 0; i < tier.rows - 1; i++) {
          const da = nodeD(i), db = nodeD(i + 1), ya = nodeY(i), yb = nodeY(i + 1);
          const trA = fp.row(t0, t1, steps, da, ya);
          const trB = fp.row(t0, t1, steps, db, ya);
          const rsB = fp.row(t0, t1, steps, db, yb);
          for (let j = 0; j < steps; j++) {
            deck.quad(trA[j], trA[j + 1], trB[j + 1], trB[j], j * 0.35, (j + 1) * 0.35, i * 0.5, i * 0.5 + 0.3);
            deck.quad(trB[j], trB[j + 1], rsB[j + 1], rsB[j], j * 0.35, (j + 1) * 0.35, i * 0.5 + 0.3, (i + 1) * 0.5);
          }
          // Yield EVERY row, not every fourth. A shallow tier (courtside has
          // 3 rows, club 4) never reached a `i & 3` interval, so those decks
          // built as one unbroken unit — the same class of bug as the
          // per-span seam in ADR-014: an interval coarser than the smallest
          // tier is no seam at all.
          yield (done + i / tier.rows) / total;
        }
        this.group.add(deck.mesh(this.mat.deck, `${tier.id}-deck-${spanIdx}`));

        // front wall, rear parapet
        const shell = new Soup();
        shell.strip([
          fp.row(t0, t1, steps, tier.d0, elevated ? tier.y0 - 2.4 : -0.2),
          fp.row(t0, t1, steps, tier.d0, tier.y0)
        ], 0.4, 1);
        shell.strip([
          fp.row(t0, t1, steps, tier.d1, nodeY(tier.rows - 1)),
          fp.row(t0, t1, steps, tier.d1, nodeY(tier.rows - 1) + 3.4)
        ], 0.4, 1);
        this.group.add(shell.mesh(this.mat.concrete, `${tier.id}-shell-${spanIdx}`));

        // underside + columns for elevated decks
        if (elevated) {
          const s = new Soup();
          s.strip([
            fp.row(t0, t1, steps, tier.d0, tier.y0 - 2.4),
            fp.row(t0, t1, steps, tier.d1, tier.y1 - 2.4)
          ], 0.4, 4);
          const m = s.mesh(this.mat.soffit, `${tier.id}-soffit-${spanIdx}`);
          m.receiveShadow = true;
          this.group.add(m);

          const colGeo = new THREE.CylinderGeometry(0.85, 1.05, 1, 10);
          const nCol = Math.max(6, Math.round((t1 - t0) * 55));
          const cols = new THREE.InstancedMesh(colGeo, this.mat.concrete, (nCol + 1) * 2);
          const o = new THREE.Object3D();
          let n = 0;
          for (let i = 0; i <= nCol; i++) {
            const t = t0 + (t1 - t0) * (i / nCol);
            [0.25, 0.8].forEach(f => {
              const d = tier.d0 + (tier.d1 - tier.d0) * f;
              const yTop = tier.y0 + (tier.y1 - tier.y0) * f - 2.4;
              const p = fp.point(t, d, 0);
              o.position.set(p.x, yTop / 2, p.z);
              o.scale.set(1, yTop, 1);
              o.updateMatrix();
              cols.setMatrixAt(n++, o.matrix);
            });
          }
          cols.instanceMatrix.needsUpdate = true;
          cols.castShadow = true;
          this.group.add(cols);
        }

        // stair aisles on the section boundaries
        const stair = new Soup();
        const aisles = tier.sectionsPerSpan;
        const ringLen = this.fp.perimeter(tier.d1) * (t1 - t0);
        const halfT = 0.62 / (ringLen / (t1 - t0));
        for (let a = 0; a <= aisles; a++) {
          if ((a & 3) === 3) yield (done + 0.5) / total;
          const t = t0 + (t1 - t0) * (a / aisles);
          for (let i = 0; i < tier.rows - 1; i++) {
            const da = nodeD(i), db = nodeD(i + 1), ya = nodeY(i) + 0.03, yb = nodeY(i + 1) + 0.03;
            const P = (d, y, o) => fp.point(t + o, d, y);
            stair.quad(P(da, ya, -halfT), P(da, ya, halfT), P(db, ya, halfT), P(db, ya, -halfT));
            stair.quad(P(db, ya, -halfT), P(db, ya, halfT), P(db, yb, halfT), P(db, yb, -halfT));
          }
        }
        this.group.add(stair.mesh(this.mat.stair, `${tier.id}-stairs-${spanIdx}`));

        // front safety rail
        const rail = new Soup();
        rail.strip([
          fp.row(t0, t1, steps, tier.d0, tier.y0 + 1.05),
          fp.row(t0, t1, steps, tier.d0, tier.y0 + 1.15)
        ], 0.5, 1);
        this.group.add(rail.mesh(this.mat.rail, `${tier.id}-rail-${spanIdx}`));

        done++;
        yield done / total;
      }
    }
  }

  /* ------------------------------------------------------------------
   * EXTERIOR
   * ---------------------------------------------------------------- */

  _buildFacade() {
    const fp = this.fp, cfg = this.structure.facade, steps = 460;
    const s = new Soup();
    s.strip([fp.row(0, 1, steps, cfg.offset, 0), fp.row(0, 1, steps, cfg.offset, cfg.height)], 0.5, 6);
    s.strip([fp.row(0, 1, steps, cfg.offset, cfg.height), fp.row(0, 1, steps, cfg.offset + 2.6, cfg.height + 1.3)], 0.5, 1);
    const m = s.mesh(this.mat.panel, 'facade');
    m.castShadow = true; m.receiveShadow = true;
    this.group.add(m);

    // lit entry portals
    const p = new Soup();
    for (let a = 0; a < cfg.portals; a++) {
      const t = a / cfg.portals, w = 0.0085;
      p.quad(fp.point(t - w, cfg.offset - 0.1, 0.2), fp.point(t + w, cfg.offset - 0.1, 0.2),
             fp.point(t + w, cfg.offset - 0.1, cfg.portalHeight), fp.point(t - w, cfg.offset - 0.1, cfg.portalHeight));
    }
    this.group.add(p.mesh(this.mat.lit, 'portals'));
  }

  _buildSuites() {
    const fp = this.fp, cfg = this.structure.suites;
    const [a, b] = this.fp.landmarks()[cfg.span];
    const t0 = a - 0.045, t1 = b + 0.045, steps = 210;
    const s = new Soup();
    s.strip([fp.row(t0, t1, steps, cfg.offset, cfg.y0), fp.row(t0, t1, steps, cfg.offset, cfg.y1)], 0.3, 1);
    this.group.add(s.mesh(this.mat.glass, 'suites'));

    const mull = new Soup(), w = 0.0006;
    for (let j = 0; j <= steps; j += 2) {
      const t = t0 + (t1 - t0) * (j / steps);
      mull.quad(fp.point(t - w, cfg.offset - 0.1, cfg.y0), fp.point(t + w, cfg.offset - 0.1, cfg.y0),
                fp.point(t + w, cfg.offset - 0.1, cfg.y1), fp.point(t - w, cfg.offset - 0.1, cfg.y1));
    }
    this.group.add(mull.mesh(this.mat.steel, 'suite-mullions'));
  }

  _buildCanopy() {
    const fp = this.fp, cfg = this.structure.canopy;
    const [a, b] = this.fp.landmarks()[cfg.span];
    const t0 = a - 0.075, t1 = b + 0.075, steps = 190;

    const top = [], bot = [];
    for (let i = 0; i <= 5; i++) {
      const v = i / 5;
      const d = cfg.innerOffset + (cfg.outerOffset - cfg.innerOffset) * v;
      const y = cfg.frontY + (cfg.rearY - cfg.frontY) * v;
      top.push(fp.row(t0, t1, steps, d, y));
      bot.push(fp.row(t0, t1, steps, d, y - cfg.depth));
    }
    const upper = new Soup(); upper.strip(top, 0.4, 2);
    const um = upper.mesh(this.mat.panel, 'canopy-top');
    um.castShadow = true; this.group.add(um);

    const under = new Soup(); under.strip(bot, 0.4, 2);
    this.group.add(under.mesh(this.mat.soffit, 'canopy-soffit'));

    const edge = new Soup();
    edge.strip([top[0], bot[0]], 0.4, 1);
    edge.strip([top[5], bot[5]], 0.4, 1);
    this.group.add(edge.mesh(this.mat.steel, 'canopy-edge'));

    // trusses + hangers
    const tube = new THREE.CylinderGeometry(0.32, 0.32, 1, 6);
    const members = [];
    for (let j = 0; j <= steps; j += 12) {
      const t = t0 + (t1 - t0) * (j / steps);
      const A = fp.point(t, cfg.innerOffset, cfg.frontY - 1.5);
      const B = fp.point(t, cfg.outerOffset, cfg.rearY - 2);
      const C = fp.point(t, cfg.outerOffset - 8, cfg.rearY - 4.5);
      members.push([A, B], [A, C], [B, C]);
    }
    const truss = new THREE.InstancedMesh(tube, this.mat.steel, members.length);
    const va = new THREE.Vector3(), vb = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const o = new THREE.Object3D();
    members.forEach(([A, B], i) => {
      va.set(A.x, A.y, A.z); vb.set(B.x, B.y, B.z);
      o.position.copy(va).lerp(vb, 0.5);
      o.scale.set(1, va.distanceTo(vb), 1);
      o.quaternion.setFromUnitVectors(up, vb.clone().sub(va).normalize());
      o.updateMatrix();
      truss.setMatrixAt(i, o.matrix);
    });
    truss.instanceMatrix.needsUpdate = true;
    truss.castShadow = true;
    this.group.add(truss);

    // downlights under the canopy
    const lit = new Soup();
    for (let j = 0; j < steps; j += 16) {
      const ta = t0 + (t1 - t0) * (j / steps), tb = t0 + (t1 - t0) * ((j + 3) / steps);
      lit.quad(fp.point(ta, cfg.innerOffset + 7, cfg.frontY - 1.9),
               fp.point(tb, cfg.innerOffset + 7, cfg.frontY - 1.9),
               fp.point(tb, cfg.outerOffset - 13, cfg.rearY - 1.9),
               fp.point(ta, cfg.outerOffset - 13, cfg.rearY - 1.9));
    }
    this.group.add(lit.mesh(new THREE.MeshStandardMaterial({
      color: 0x101418, emissive: 0xfff0d0, emissiveIntensity: 1.2, side: THREE.DoubleSide
    }), 'canopy-downlights'));
  }

  _buildPressBox() {
    const fp = this.fp, cfg = this.structure.pressBox;
    const [a, b] = this.fp.landmarks()[cfg.span];
    const span = b - a;
    const t0 = a + span * cfg.centreFraction[0];
    const t1 = a + span * cfg.centreFraction[1];
    const steps = 40;
    const front = new Soup(), rest = new Soup();
    front.strip([fp.row(t0, t1, steps, cfg.d0, cfg.y0), fp.row(t0, t1, steps, cfg.d0, cfg.y1)], 0.35, 1);
    rest.strip([fp.row(t0, t1, steps, cfg.d1, cfg.y0), fp.row(t0, t1, steps, cfg.d1, cfg.y1)], 0.35, 1);
    rest.strip([fp.row(t0, t1, steps, cfg.d0, cfg.y1), fp.row(t0, t1, steps, cfg.d1, cfg.y1)], 0.35, 2);
    this.group.add(front.mesh(this.mat.glass, 'pressbox-glazing'));
    const m = rest.mesh(this.mat.panel, 'pressbox-shell');
    m.castShadow = true;
    this.group.add(m);
  }

  /* ------------------------------------------------------------------
   * CIRCULATION — tunnels, escalators, elevators, concourse
   * ---------------------------------------------------------------- */

  _buildCirculation() {
    const fp = this.fp;
    const { tunnels, escalators, elevators, concourse } = this.structure;
    if (!concourse) return;

    // Vomitory tunnels: recessed dark openings through the lower bowl parapet.
    if (tunnels) {
    const tun = new Soup();
    const lower = this.venue.tiers[0];
    const rowY = lower.y0 + (lower.y1 - lower.y0) * tunnels.atRow;
    const rowD = lower.d0 + (lower.d1 - lower.d0) * tunnels.atRow;
    for (let i = 0; i < tunnels.count; i++) {
      const t = (i + 0.5) / tunnels.count;
      const hw = tunnels.width / 2 / this.fp.perimeter(rowD);
      const A = fp.point(t - hw, rowD, rowY);
      const B = fp.point(t + hw, rowD, rowY);
      const C = fp.point(t + hw, rowD + 6, rowY);
      const D = fp.point(t - hw, rowD + 6, rowY);
      const lift = p => ({ x: p.x, y: p.y + tunnels.height, z: p.z });
      tun.quad(A, B, lift(B), lift(A));                       // face
      tun.quad(A, D, lift(D), lift(A));                       // side
      tun.quad(B, C, lift(C), lift(B));                       // side
      tun.quad(lift(A), lift(B), lift(C), lift(D));           // ceiling
    }
    this.group.add(tun.mesh(this.mat.dark, 'tunnels'));
    }

    // Escalator runs on the exterior, ground → upper concourse.
    if (escalators) {
    const esc = new Soup(), tread = new Soup();
    for (let i = 0; i < escalators.count; i++) {
      const t = (i + 0.5) / escalators.count;
      const hw = escalators.width / 2 / this.fp.perimeter(this.structure.facade.offset);
      const bottomIn  = fp.point(t - hw, this.structure.facade.offset + 16, 0.4);
      const bottomOut = fp.point(t + hw, this.structure.facade.offset + 16, 0.4);
      const topIn  = fp.point(t - hw, this.structure.facade.offset + 1, concourse.level2);
      const topOut = fp.point(t + hw, this.structure.facade.offset + 1, concourse.level2);
      esc.quad(bottomIn, bottomOut, topOut, topIn);
      const drop = p => ({ x: p.x, y: p.y - 1.5, z: p.z });
      esc.quad(drop(bottomIn), drop(bottomOut), drop(topOut), drop(topIn));
      esc.quad(bottomIn, topIn, drop(topIn), drop(bottomIn));
      esc.quad(bottomOut, topOut, drop(topOut), drop(bottomOut));
      // step ridges
      for (let k = 0; k < 26; k++) {
        const f0 = k / 26, f1 = (k + 0.45) / 26;
        const lerp = (p, q, f) => ({ x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f + 0.06, z: p.z + (q.z - p.z) * f });
        tread.quad(lerp(bottomIn, topIn, f0), lerp(bottomOut, topOut, f0),
                   lerp(bottomOut, topOut, f1), lerp(bottomIn, topIn, f1));
      }
    }
    this.group.add(esc.mesh(this.mat.panel, 'escalators'));
    this.group.add(tread.mesh(this.mat.stair, 'escalator-treads'));
    }

    // Glazed elevator shafts at the four corners.
    if (elevators) {
    const shaftGeo = new THREE.BoxGeometry(elevators.shaftWidth, concourse.level2 + 6, elevators.shaftWidth);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x223140, roughness: 0.2, metalness: 0.4,
      emissive: 0x8fc8e0, emissiveIntensity: 0.35, transparent: true, opacity: 0.72
    });
    [1, 3, 5, 7].forEach(si => {
      const seg = fp.segments[si];
      const p = fp.point(seg.t0 + seg.fraction / 2, this.structure.facade.offset + 3.5, 0);
      const m = new THREE.Mesh(shaftGeo, shaftMat);
      m.position.set(p.x, (concourse.level2 + 6) / 2, p.z);
      m.lookAt(0, m.position.y, 0);
      this.group.add(m);
    });
    }

    // Upper concourse slab ring.
    const slab = new Soup();
    slab.strip([
      fp.row(0, 1, 380, this.structure.facade.offset - concourse.width, concourse.level2),
      fp.row(0, 1, 380, this.structure.facade.offset, concourse.level2)
    ], 0.4, 1);
    this.group.add(slab.mesh(this.mat.concrete, 'upper-concourse'));
  }


  /**
   * Enclosed roof for indoor venues: a shallow dome springing from the outer
   * ring. Declared by `structure.roof`, absent for open-air venues.
   */
  _buildRoof() {
    const cfg = this.structure.roof;
    const fp = this.fp;
    const steps = 300, rings = 8;
    const rows = [];
    for (let i = 0; i <= rings; i++) {
      const v = i / rings;
      // ease inward and upward so the section reads as a shallow shell
      const d = cfg.offset * (1 - v * v);
      const y = cfg.rimHeight + (cfg.apexHeight - cfg.rimHeight) * Math.sin(v * Math.PI / 2);
      rows.push(fp.row(0, 1, steps, d, y));
    }
    const shell = new Soup();
    shell.strip(rows, 0.3, 1);
    const outer = shell.mesh(this.mat.panel, 'roof');
    outer.castShadow = true;
    this.group.add(outer);

    const inner = new Soup();
    inner.strip(rows.map(r => r.map(p2 => ({ x: p2.x, y: p2.y - 1.2, z: p2.z }))), 0.3, 1);
    this.group.add(inner.mesh(this.mat.soffit, 'roof-soffit'));
  }

  /**
   * Centre-hung board: four faces over the middle of the surface. Arenas hang
   * one; open-air bowls put theirs behind an end instead.
   */
  _buildCentreHungBoard(cfg, tex) {
    const grp = new THREE.Group();
    grp.name = `board-${cfg.id}`;
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.5, roughness: 1
    });
    const half = cfg.width / 2;
    [[0, 0, half, 0], [0, 0, -half, Math.PI], [half, 0, 0, Math.PI / 2], [-half, 0, 0, -Math.PI / 2]]
      .forEach(([x, , z, ry]) => {
        const face = new THREE.Mesh(new THREE.PlaneGeometry(cfg.width, cfg.height), mat);
        face.position.set(x, 0, z);
        face.rotation.y = ry;
        grp.add(face);
      });
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(cfg.width * 1.05, 1.2, cfg.width * 1.05), this.mat.panel);
    cap.position.y = cfg.height / 2 + 0.6;
    grp.add(cap);

    const rig = new THREE.CylinderGeometry(0.16, 0.16, 14, 6);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => {
      const m = new THREE.Mesh(rig, this.mat.steel);
      m.position.set(sx * half * 0.7, cfg.height / 2 + 7.6, sz * half * 0.7);
      grp.add(m);
    });

    grp.position.set(0, cfg.y, 0);
    this.group.add(grp);

    const glow = new THREE.PointLight(0x9fd8ee, 1.1, 90, 2);
    glow.position.set(0, cfg.y - cfg.height, 0);
    this.group.add(glow);
  }

  /**
   * Tailgate areas: a mown pad per area and a scatter of instanced canopy
   * tents. Deliberately light — the *data* lives in the twin as zones; this is
   * just enough geometry that the areas read from the air.
   */
  _buildTailgate() {
    const areas = this.structure.tailgate.areas || [];
    const padMat = new THREE.MeshStandardMaterial({ color: 0x27492f, roughness: 0.95 });
    const tentTop = new THREE.ConeGeometry(2.1, 1.1, 4);
    const tentLeg = new THREE.CylinderGeometry(0.05, 0.05, 2.1, 4);
    const colors = [0xb01a2c, 0xe8e2d4, 0x2f4a58, 0xcbd5dc];

    let tentCount = 0;
    for (const a of areas) tentCount += Math.min(40, Math.round((a.capacity || 100) / 8));
    const tops = new THREE.InstancedMesh(tentTop, new THREE.MeshStandardMaterial({ roughness: 0.8 }), tentCount);
    const legs = new THREE.InstancedMesh(tentLeg, this.mat.steel, tentCount * 2);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    let ti = 0, li = 0;

    for (const a of areas) {
      const [cx, , cz] = a.centre;
      const [w, dpt] = a.size;
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(w, dpt), padMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(cx, 0.015, cz);
      pad.receiveShadow = true;
      pad.name = `tailgate-${a.id}`;
      this.group.add(pad);

      const n = Math.min(40, Math.round((a.capacity || 100) / 8));
      for (let k = 0; k < n; k++) {
        const x = cx + (Math.random() - 0.5) * (w - 6);
        const z = cz + (Math.random() - 0.5) * (dpt - 6);
        o.position.set(x, 2.35, z);
        o.rotation.set(0, Math.random() * Math.PI, 0);
        o.updateMatrix();
        tops.setMatrixAt(ti, o.matrix);
        col.setHex(colors[(Math.random() * colors.length) | 0]).multiplyScalar(0.8 + Math.random() * 0.3);
        tops.setColorAt(ti, col);
        ti++;
        for (const [dx, dz] of [[-1.4, -1.4], [1.4, 1.4]]) {
          o.position.set(x + dx, 1.05, z + dz);
          o.rotation.set(0, 0, 0);
          o.updateMatrix();
          legs.setMatrixAt(li++, o.matrix);
        }
      }
    }
    tops.instanceMatrix.needsUpdate = true;
    if (tops.instanceColor) tops.instanceColor.needsUpdate = true;
    legs.instanceMatrix.needsUpdate = true;
    tops.name = 'tailgate-tents';
    this.group.add(tops, legs);
  }

  /** A board at an explicit world position, facing a target — the open-venue
   *  path, where "north end" has no meaning. */
  _buildBoardAt(cfg, tex, position, facing) {
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.4, roughness: 1
    });
    const grp = new THREE.Group();
    grp.name = `board-${cfg.id}`;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(cfg.width, cfg.height), mat);
    grp.add(face);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(cfg.width * 1.06, cfg.height * 1.12, 0.8), this.mat.panel);
    frame.position.z = -0.6;
    grp.add(frame);
    [[-0.35, 0], [0.35, 0]].forEach(([fx]) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.5, position[1], 8), this.mat.steel);
      leg.position.set(fx * cfg.width, -position[1] / 2 - cfg.height / 2, -0.6);
      grp.add(leg);
    });
    grp.position.set(...position);
    grp.lookAt(...facing);
    this.group.add(grp);
  }

  /* ------------------------------------------------------------------
   * BOARDS
   * ---------------------------------------------------------------- */

  _makeBoardCanvas(id, w = 1280, h = 640) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.boards.set(id, { canvas: cv, texture: tex });
    return { cv, tex };
  }

  _buildVideoBoards() {
    const fp = this.fp;
    this.structure.videoBoards.forEach(cfg => {
      const { cv, tex } = this._makeBoardCanvas(cfg.id);
      if (cfg.end === 'centre') { this._buildCentreHungBoard(cfg, tex); return; }
      if (cfg.position) { this._buildBoardAt(cfg, tex, cfg.position, cfg.facing || [0, 0, 0]); return; }
      const sign = cfg.end === 'north' ? 1 : -1;
      const reach = this.venue.tiers[this.venue.tiers.length - 1].d1;
      const X = sign * (this.fp.coreX + this.fp.cornerRadius + reach * 0.6);

      const scr = new THREE.Mesh(
        new THREE.PlaneGeometry(cfg.width, cfg.height),
        new THREE.MeshStandardMaterial({
          map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.5, roughness: 1
        })
      );
      scr.position.set(X, cfg.y, 0);
      scr.rotation.y = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
      scr.name = `board-${cfg.id}`;
      this.group.add(scr);

      const back = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, cfg.height + 2, cfg.width + 2), this.mat.panel);
      back.position.set(X + sign * 1.6, cfg.y, 0);
      this.group.add(back);

      const leg = new THREE.CylinderGeometry(0.9, 1.1, 1, 8);
      const legs = new THREE.InstancedMesh(leg, this.mat.steel, 4);
      const o = new THREE.Object3D();
      const height = cfg.y - cfg.height / 2;
      [-0.38, -0.13, 0.13, 0.38].forEach((f, i) => {
        o.position.set(X + sign * 1.6, height / 2, f * cfg.width);
        o.scale.set(1, height, 1);
        o.updateMatrix();
        legs.setMatrixAt(i, o.matrix);
      });
      legs.instanceMatrix.needsUpdate = true;
      this.group.add(legs);

      const glow = new THREE.PointLight(0x9fd8ee, 1.4, 160, 2);
      glow.position.set(X - sign * 18, cfg.y, 0);
      this.group.add(glow);
    });
    this.drawBoards(0, { period: 3, clock: '07:42', down: '1ST & 10', home: 0, away: 0 });
  }

  _buildRibbonBoards() {
    const fp = this.fp;
    this.structure.ribbonBoards.forEach(cfg => {
      const tier = this.venue.tiers.find(t => t.id === cfg.tier);
      if (!tier) return;
      const { cv, tex } = this._makeBoardCanvas(cfg.id, 2048, 64);
      tex.wrapS = THREE.RepeatWrapping;
      tex.repeat.set(6, 1);

      const d = cfg.atFront ? tier.d0 - 0.2 : tier.d0 - 0.2;
      const y = cfg.atFront ? tier.y0 - 1.8 : tier.y0 + 1.2;
      const s = new Soup();
      const ranges = this._spanRanges(tier);
      ranges.forEach(([t0, t1]) => {
        const steps = Math.max(60, Math.round((t1 - t0) * 400));
        s.strip([fp.row(t0, t1, steps, d, y), fp.row(t0, t1, steps, d, y + cfg.height)], 0.02, 1);
      });
      const mesh = s.mesh(new THREE.MeshStandardMaterial({
        map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.1,
        roughness: 1, side: THREE.DoubleSide
      }), `ribbon-${cfg.id}`);
      this.group.add(mesh);
      this.boards.get(cfg.id).mesh = mesh;
    });
    this.drawRibbon('WELCOME TO THE VIRTUAL STADIUM');
  }

  /**
   * Repaint the video boards. Called by the engine at a few Hz — canvas
   * uploads are not free, so do not call this every frame.
   */
  drawBoards(elapsed, state = {}) {
    this.structure.videoBoards.forEach(cfg => {
      const b = this.boards.get(cfg.id);
      if (!b) return;
      const g = b.canvas.getContext('2d');
      const W = b.canvas.width, H = b.canvas.height;
      g.fillStyle = '#06101c'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < H; i += 4) { g.fillStyle = 'rgba(120,190,215,.05)'; g.fillRect(0, i, W, 1); }
      g.textAlign = 'center';
      g.fillStyle = '#8fd4e8';
      g.font = `700 ${Math.round(H * 0.24)}px Impact, "Arial Narrow", sans-serif`;
      g.fillText(`${state.home ?? 0}  —  ${state.away ?? 0}`, W / 2, H * 0.28);
      g.fillStyle = '#ffd27a';
      g.font = `700 ${Math.round(H * 0.16)}px Impact, "Arial Narrow", sans-serif`;
      g.fillText(`Q${state.period ?? 1}   ${state.clock ?? '15:00'}`, W / 2, H * 0.55);
      g.fillStyle = '#cfe6f0';
      g.font = `${Math.round(H * 0.055)}px ui-monospace, monospace`;
      g.fillText(state.down ?? '1ST & 10', W / 2, H * 0.72);
      for (let i = 0; i < 34; i++) {
        const bar = 10 + Math.abs(Math.sin(elapsed * 1.6 + i)) * H * 0.11;
        g.fillStyle = `rgba(110,205,235,${0.25 + Math.random() * 0.4})`;
        g.fillRect(W * 0.07 + i * (W * 0.026), H * 0.94 - bar, W * 0.013, bar);
      }
      b.texture.needsUpdate = true;
    });
  }

  drawRibbon(text) {
    this.structure.ribbonBoards.forEach(cfg => {
      const b = this.boards.get(cfg.id);
      if (!b) return;
      const g = b.canvas.getContext('2d');
      const W = b.canvas.width, H = b.canvas.height;
      g.fillStyle = '#07131f'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#7fd6f0'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `700 ${Math.round(H * 0.62)}px Impact, "Arial Narrow", sans-serif`;
      g.fillText(text, W / 2, H / 2);
      b.texture.needsUpdate = true;
    });
  }

  /** Scroll the ribbon boards. Cheap — just a texture offset. */
  update(dt, elapsed) {
    this.structure.ribbonBoards.forEach(cfg => {
      const b = this.boards.get(cfg.id);
      if (b) b.texture.offset.x = (elapsed * 0.06) % 1;
    });
  }

  /* ------------------------------------------------------------------ */

  _buildApproach() {
    const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 64), this.mat.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.6;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Parking approach: pole lights read as a scale reference from the air.
    const cfg = this.structure.approach;
    const n = cfg.poleLights;
    const [rMin, rMax] = cfg.radius;
    const poleGeo = new THREE.CylinderGeometry(0.3, 0.4, 14, 6);
    const poles = new THREE.InstancedMesh(poleGeo, this.mat.steel, n);
    const headGeo = new THREE.SphereGeometry(0.7, 8, 6);
    const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({
      color: 0x201a12, emissive: 0xffcf95, emissiveIntensity: 2.6
    }), n);
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
      const r = rMin + Math.random() * (rMax - rMin);
      const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.8;
      o.position.set(x, 7, z); o.scale.set(1, 1, 1); o.updateMatrix();
      poles.setMatrixAt(i, o.matrix);
      o.position.set(x, 14, z); o.updateMatrix();
      heads.setMatrixAt(i, o.matrix);
    }
    poles.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    this.group.add(poles, heads);
  }

  dispose() {
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
    });
    Object.values(this.mat).forEach(m => { m.map?.dispose(); m.dispose(); });
    this.scene.remove(this.group);
  }
}

export default VenueBuilder;
