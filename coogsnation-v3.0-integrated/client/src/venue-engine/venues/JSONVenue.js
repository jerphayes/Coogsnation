/**
 * JSONVenue + surface recipes
 * ---------------------------------------------------------------------------
 * Objective 3: venue definitions become external data.
 *
 * A JSONVenue is a VenueDefinition constructed from a plain object — no class,
 * no code, no build step. `loadVenue('concert')` fetches a `.venue.json` and
 * the engine builds it.
 *
 * THE HARD PART IS THE SURFACE
 * ----------------------------
 * Everything else in a venue definition is already declarative: numbers,
 * ranges, names. `buildSurface()` is the one member that was genuinely code,
 * because painting a gridiron is not expressible as a config value.
 *
 * The resolution is *recipes*: a small library of parameterised surface
 * builders that data can name and configure. A JSON venue says
 * `"surface": { "recipe": "stage", "depth": 14 }` and the recipe does the rest.
 *
 * This is a deliberate trade. Recipes are less expressive than arbitrary code,
 * so an exotic surface still wants a class — and that remains supported, which
 * is why the registry accepts both. The claim is not "all venues can be data";
 * it is "the common ones should be, and the escape hatch stays open." Pretending
 * otherwise would push people to encode drawing logic in JSON, which is worse
 * than a class in every respect.
 */

import * as THREE from 'three';
import VenueDefinition from './VenueDefinition.js';

/* ═══════════════════════════════════════════════════════════════════════
 * RECIPES
 * Each takes (spec, ctx) and returns an array of THREE.Object3D.
 * ═══════════════════════════════════════════════════════════════════════ */

export const SURFACE_RECIPES = {
  /**
   * A plain slab. GA floors, convention halls, exhibition spaces.
   * spec: { length, width, color, roughness }
   */
  slab(spec, ctx) {
    const geo = new THREE.PlaneGeometry(spec.length, spec.width);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.color || '#2a2f36'),
      roughness: spec.roughness ?? 0.9
    }));
    m.position.y = 0.02;
    m.receiveShadow = true;
    m.name = 'playing-surface';
    return [m];
  },

  /**
   * A marked rectangular field of play. Line positions are data.
   * spec: { length, width, base, lineColor, lines:[{axis,at,width}],
   *         zones:[{from,to,color,text}], centre:{text,radius} }
   */
  markedField(spec, ctx) {
    const W = 2048;
    const H = Math.round(W * spec.width / spec.length);
    const m2p = W / spec.length;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');

    g.fillStyle = spec.base || '#1a4c34';
    g.fillRect(0, 0, W, H);
    if (spec.stripes) {
      for (let i = 0; i < spec.stripes; i++) {
        g.globalAlpha = i % 2 ? 0.06 : 0;
        g.fillStyle = '#ffffff';
        g.fillRect(i * W / spec.stripes, 0, W / spec.stripes + 1, H);
      }
      g.globalAlpha = 1;
    }

    for (const z of spec.zones || []) {
      const x0 = z.from * m2p, x1 = z.to * m2p;
      g.fillStyle = z.color || '#2c3a63';
      g.fillRect(x0, 0, x1 - x0, H);
      if (z.text) {
        g.save();
        g.translate((x0 + x1) / 2, H / 2);
        g.rotate((z.rotate ?? 90) * Math.PI / 180);
        g.fillStyle = spec.lineColor || '#f2f8fa';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `700 ${Math.round((x1 - x0) * 0.6)}px Impact, "Arial Narrow", sans-serif`;
        g.fillText(z.text, 0, 0);
        g.restore();
      }
    }

    g.strokeStyle = spec.lineColor || '#f2f8fa';
    for (const line of spec.lines || []) {
      g.lineWidth = line.width || 3;
      const at = line.at * m2p;
      g.beginPath();
      if (line.axis === 'z') { g.moveTo(at, 0); g.lineTo(at, H); }
      else { g.moveTo(0, at); g.lineTo(W, at); }
      g.stroke();
    }
    if (spec.border !== false) {
      g.lineWidth = 6;
      g.strokeRect(3, 3, W - 6, H - 6);
    }
    if (spec.centre) {
      g.save(); g.translate(W / 2, H / 2);
      if (spec.centre.radius) {
        g.lineWidth = 5;
        g.beginPath(); g.arc(0, 0, spec.centre.radius * m2p, 0, Math.PI * 2); g.stroke();
      }
      if (spec.centre.text) {
        g.fillStyle = spec.lineColor || '#f2f8fa';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `700 ${Math.round(H * 0.22)}px Impact, "Arial Narrow", sans-serif`;
        g.fillText(spec.centre.text, 0, 0);
      }
      g.restore();
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = ctx.renderer.capabilities.getMaxAnisotropy();
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(spec.length, spec.width);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    m.position.y = 0.02;
    m.receiveShadow = true;
    m.name = 'playing-surface';
    return [m];
  },

  /**
   * End stage with rigging. Concerts, keynotes, esports finals.
   * spec: { width, depth, height, at:[x,z], truss:{height,bays}, screens:number }
   */
  stage(spec, ctx) {
    const out = [];
    const [ax, az] = spec.at || [0, 0];
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x14181e, roughness: 0.8 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.4, metalness: 0.7 });

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(spec.depth, spec.height || 1.6, spec.width), deckMat);
    deck.position.set(ax, (spec.height || 1.6) / 2, az);
    deck.castShadow = deck.receiveShadow = true;
    deck.name = 'playing-surface';
    out.push(deck);

    const truss = spec.truss || { height: 14, bays: 6 };
    const barGeo = new THREE.BoxGeometry(0.35, 0.35, spec.width);
    const top = new THREE.Mesh(barGeo, steel);
    top.position.set(ax, truss.height, az);
    out.push(top);

    const legGeo = new THREE.CylinderGeometry(0.28, 0.28, truss.height, 8);
    [-1, 1].forEach(s => {
      const leg = new THREE.Mesh(legGeo, steel);
      leg.position.set(ax, truss.height / 2, az + s * spec.width / 2);
      out.push(leg);
    });

    const hang = new THREE.CylinderGeometry(0.1, 0.1, 2.4, 6);
    for (let i = 0; i < truss.bays; i++) {
      const z = az - spec.width / 2 + (i + 0.5) * (spec.width / truss.bays);
      const rod = new THREE.Mesh(hang, steel);
      rod.position.set(ax, truss.height - 1.2, z);
      out.push(rod);
      const lamp = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 0.9, 8),
        new THREE.MeshStandardMaterial({ color: 0x101318, emissive: 0xffd9a0, emissiveIntensity: 2.4 }));
      lamp.position.set(ax, truss.height - 2.6, z);
      lamp.rotation.x = Math.PI;
      out.push(lamp);
    }

    for (let i = 0; i < (spec.screens || 0); i++) {
      const side = i % 2 ? 1 : -1;
      const scr = new THREE.Mesh(
        new THREE.PlaneGeometry(spec.width * 0.28, spec.width * 0.16),
        new THREE.MeshStandardMaterial({
          color: 0x0a1620, emissive: 0x2f6f8f, emissiveIntensity: 1.1, roughness: 1
        }));
      scr.position.set(ax + spec.depth / 2 + 0.2, truss.height * 0.55,
                       az + side * (spec.width / 2 + spec.width * 0.16));
      scr.rotation.y = Math.PI / 2;
      out.push(scr);
    }
    return out;
  }
};

/* ═══════════════════════════════════════════════════════════════════════
 * JSONVenue
 * ═══════════════════════════════════════════════════════════════════════ */

export class JSONVenue extends VenueDefinition {
  /** @param {object} data a parsed .venue.json document */
  constructor(data) {
    super({
      id: data.id,
      label: data.label,
      category: data.category,
      footprint: data.footprint,
      tiers: data.tiers,
      spanBleed: data.spanBleed,
      structure: data.structure,
      lighting: data.lighting,
      camera: data.camera,
      seating: data.seating,
      crowd: data.crowd
    });

    this.data = data;
    this.surface = data.surface || { recipe: 'slab', length: 60, width: 40 };
    this.pricing = data.pricing || null;
    this.sectionNaming = data.sectionNaming || null;
  }

  buildSurface(ctx) {
    const recipe = SURFACE_RECIPES[this.surface.recipe];
    if (!recipe) {
      const known = Object.keys(SURFACE_RECIPES).join(', ');
      throw new Error(`[${this.id}] unknown surface recipe "${this.surface.recipe}" (known: ${known})`);
    }
    for (const obj of recipe(this.surface, ctx)) ctx.group.add(obj);

    for (const extra of this.data.props || []) {
      const sub = SURFACE_RECIPES[extra.recipe];
      if (!sub) { console.warn(`[${this.id}] unknown prop recipe "${extra.recipe}"`); continue; }
      for (const obj of sub(extra, ctx)) ctx.group.add(obj);
    }
  }

  /** Data may override the default 100/200/300 numbering. */
  sectionLabel(tier, spanName, ordinal) {
    const rule = this.sectionNaming?.[tier.id];
    if (!rule) return super.sectionLabel(tier, spanName, ordinal);
    if (rule.style === 'letters') {
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const i = ordinal - 1;
      return (rule.prefix || '') + (i < A.length ? A[i] : `${A[(i / A.length) | 0]}${A[i % A.length]}`);
    }
    if (rule.style === 'prefixed') return `${rule.prefix}${ordinal}`;
    return super.sectionLabel(tier, spanName, ordinal);
  }

  seatPrice(seat) {
    if (!this.pricing) return super.seatPrice(seat);
    const { rowDecay = 0.45, lateralDecay = 0.5, round = 5 } = this.pricing;
    const rowFactor = 1 - (seat.row / seat.rows) * rowDecay;
    const lateral = Math.abs(seat.x) / Math.max(1, this.footprint.coreX * 2);
    return Math.round(seat.tier.basePrice * rowFactor * (1.25 - lateral * lateralDecay) / round) * round;
  }
}

/**
 * Fetch and construct a venue from a JSON document.
 * @param {string} url
 * @returns {Promise<JSONVenue>}
 */
export async function loadJSONVenue(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Venue "${url}" → HTTP ${res.status}`);
  const data = await res.json();
  return new JSONVenue(data).validate();
}

export default JSONVenue;
