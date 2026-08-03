/**
 * VenueDefinition
 * ---------------------------------------------------------------------------
 * The contract every venue implements. This is the seam that makes the engine
 * sport-agnostic: SeatManager, VenueBuilder, LightingManager and
 * CameraController all read from a VenueDefinition and none of them contain
 * the word "football".
 *
 * A venue supplies:
 *   footprint   plan geometry of the bowl (rounded rectangle parameters)
 *   tiers       raked seating decks, which drive the seat manifest
 *   structure   facade, canopy, circulation, boards — all optional
 *   lighting    fixture layout and preset preference
 *   camera      framing distances for each mode
 *   buildSurface(ctx)  the thing in the middle: pitch, court, diamond, stage
 *
 * To add a venue type, subclass this, fill in the fields, implement
 * buildSurface(), and register it in venues/index.js. Nothing in core/ or
 * seats/ needs to change.
 */

export class VenueDefinition {
  constructor(opts = {}) {
    if (new.target === VenueDefinition) {
      throw new TypeError('VenueDefinition is abstract; subclass it.');
    }

    /** Stable identifier used in URLs, persistence keys and analytics. */
    this.id = opts.id || 'venue';
    /** Human-readable name shown in the UI. */
    this.label = opts.label || 'Venue';
    /** Free-form category: 'football' | 'basketball' | 'baseball' | 'concert' | 'esports' */
    this.category = opts.category || 'generic';

    /**
     * Rounded-rectangle plan. Corner arc centres at (±coreX, ±coreZ); a ring
     * offset outward by d has corner radius (cornerRadius + d).
     * @type {{coreX:number, coreZ:number, cornerRadius:number, referenceRadius:number}}
     */
    this.footprint = opts.footprint;

    /**
     * Raked seating decks. Each entry:
     *   { id, label, sectionPrefix, d0, d1, y0, y1, rows,
     *     spans: 'full' | string[], sectionsPerSpan, vip, basePrice }
     * `spans` names ranges from Footprint.landmarks().
     * @type {Array<object>}
     */
    this.tiers = opts.tiers || [];

    /** Extra parameter bleed applied to each end of a named span. */
    this.spanBleed = opts.spanBleed ?? 0.05;

    /**
     * Optional structure. Any key omitted is simply not built, which is how an
     * indoor arena skips masts and canopies without special-casing.
     * Recognised keys: facade, concourse, suites, canopy, pressBox, tunnels,
     * escalators, elevators, videoBoards, ribbonBoards, roof, approach.
     */
    this.structure = opts.structure || {};

    /**
     * Lighting. `fixtures` describes how the venue is lit:
     *   { type: 'masts', height, offset, count, lampRows, lampsPerRow }
     *   { type: 'catwalk', rings: [{ radius, height, count }] }
     *   null — ambient only
     */
    this.lighting = Object.assign({ preset: 'night', fixtures: null }, opts.lighting || {});

    /** Per-mode camera framing. Merged over engine CAMERA defaults. */
    this.camera = Object.assign({
      orbitTarget: [0, 16, 0],
      orbitMin: 22,
      orbitMax: 620,
      home: [-186, 128, -206],
      spectator: { min: 40, max: 150, target: [0, 6, 0] },
      broadcast: { radius: 210, height: 44, period: 90 }
    }, opts.camera || {});

    /** Optional overrides for engine SEATING defaults. */
    this.seating = opts.seating || {};

    /** Optional overrides for engine CROWD defaults. */
    this.crowd = opts.crowd || {};
  }

  /* ======================================================================
   * REQUIRED HOOKS
   * ==================================================================== */

  /**
   * Build the playing surface and anything intrinsic to the sport — pitch
   * markings, goals, baskets, a stage, a bases diamond.
   *
   * @param {{ group:THREE.Group, materials:Record<string,THREE.Material>,
   *           renderer:THREE.WebGLRenderer, THREE:object }} ctx
   * @returns {void}
   */
  buildSurface(ctx) {
    throw new Error(`${this.constructor.name} must implement buildSurface(ctx)`);
  }

  /* ======================================================================
   * OPTIONAL HOOKS — sensible defaults provided
   * ==================================================================== */

  /**
   * Human label for a section. Override for venues that use letters, or a
   * "Floor / Loge / Balcony" scheme instead of 100/200/300 levels.
   * @param {object} tier
   * @param {string} spanName
   * @param {number} ordinal 1-based within the tier
   */
  sectionLabel(tier, spanName, ordinal) {
    return String(tier.sectionPrefix + ordinal);
  }

  /**
   * Ticket price for a seat. Override to plug in real pricing.
   * @param {{tier:object, row:number, rows:number, x:number, z:number}} seat
   */
  seatPrice(seat) {
    const rowFactor = 1 - (seat.row / seat.rows) * 0.45;
    const lateral = Math.abs(seat.x) / Math.max(1, this.footprint.coreX * 2);
    return Math.round(seat.tier.basePrice * rowFactor * (1.25 - lateral * 0.5) / 5) * 5;
  }

  /**
   * Extra metadata merged onto every seat's twin record.
   *
   * Called once per seat description, so it MUST be cheap. The intended
   * pattern is a precomputed per-section table with frozen shared values —
   * return a reference, never build a fresh object per seat.
   *
   * This is the compatibility seam for camera visibility: today venues return
   * a per-section preset list; a future version can return true line-of-sight
   * results from the same hook without any consumer changing.
   *
   * @param {{tier:object, section:string, row:number, number:number}} ctx
   * @returns {object} merged over the engine's own seat metadata
   */
  seatMetadata(ctx) { return null; }

  /** Called once after the venue is fully built. Hook for venue-specific FX. */
  onBuilt(ctx) {}

  /** Called every frame. Hook for animated surfaces (scoreboards, stage rigs). */
  update(dt, elapsed) {}

  /* ======================================================================
   * VALIDATION
   * ==================================================================== */

  /** Throws with a useful message rather than failing deep inside geometry. */
  validate() {
    const f = this.footprint;
    if (!f) throw new Error(`[${this.id}] footprint is required`);
    if (f.kind === 'fan') {
      if (!Number.isFinite(f.backstop) || !Number.isFinite(f.baseline)) {
        throw new Error(`[${this.id}] fan footprint requires numeric backstop and baseline`);
      }
    } else if (!Number.isFinite(f.coreX) || !Number.isFinite(f.coreZ)) {
      throw new Error(`[${this.id}] footprint requires numeric coreX and coreZ`);
    }
    if (!this.tiers.length) throw new Error(`[${this.id}] at least one tier is required`);
    this.tiers.forEach((t, i) => {
      if (t.d1 <= t.d0) throw new Error(`[${this.id}] tier ${t.id || i}: d1 must exceed d0`);
      if (t.rows < 1) throw new Error(`[${this.id}] tier ${t.id || i}: rows must be >= 1`);
      if (t.spans !== 'full' && !Array.isArray(t.spans)) {
        throw new Error(`[${this.id}] tier ${t.id || i}: spans must be 'full' or an array of landmark names`);
      }
    });
    return this;
  }

  /**
   * Exact seat count without building any geometry.
   *
   * This MUST use the same arc-length measurement SeatManager uses. An earlier
   * version approximated a section's arc length as `perimeter(d) * delta-t`,
   * which is wrong: the perimeter parameter t is normalised against a
   * REFERENCE radius, so that product is not the arc length at offset d.
   * Per-section the error reached 28%; it partly cancelled between straights
   * and corners, which is exactly why the totals looked plausible and shipped
   * wrong (documented 59,802 vs actual 58,298; concert was off by 32%).
   *
   * A tuning tool that disagrees with the thing it estimates is worse than no
   * tuning tool, so this shares the measurement rather than modelling it.
   */
  estimateCapacity(footprintInstance, seatingDefaults) {
    const s = Object.assign({}, seatingDefaults, this.seating);
    const marks = footprintInstance.landmarks();
    let total = 0;
    for (const tier of this.tiers) {
      const spans = tier.spans === 'full'
        ? [[0, 1]]
        : tier.spans.map(n => [marks[n][0] - this.spanBleed, marks[n][1] + this.spanBleed]);
      for (const [a, b] of spans) {
        for (let k = 0; k < tier.sectionsPerSpan; k++) {
          const sT0 = a + (b - a) * (k / tier.sectionsPerSpan);
          const sT1 = a + (b - a) * ((k + 1) / tier.sectionsPerSpan);
          for (let r = 0; r < tier.rows; r++) {
            const v = tier.rows > 1 ? r / (tier.rows - 1) : 0;
            const d = tier.d0 + (tier.d1 - tier.d0) * v + s.treadOffset;
            const measured = footprintInstance.arcTable(d, sT0, sT1, 220).total;
            const usable = measured - 2 * s.aisleHalfWidth;
            if (usable >= s.pitch) total += Math.floor(usable / s.pitch);
          }
        }
      }
    }
    return total;
  }
}

export default VenueDefinition;
