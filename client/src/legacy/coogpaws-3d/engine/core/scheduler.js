/**
 * scheduler.js
 * ---------------------------------------------------------------------------
 * Cooperative chunking for construction work.
 *
 * THE PROBLEM THIS SOLVES
 * ----------------------
 * Building a 58,000-seat venue costs about 1.1 seconds of pure computation:
 * ~470ms of geometry, ~390ms of seat manifest, ~115ms of instanced meshes.
 * Written as straight loops that is 1.1 seconds during which the browser
 * cannot paint, cannot respond to input, and cannot even advance the loading
 * bar that is supposedly reporting progress.
 *
 * On a mid-range phone, multiply by four to six. That is the difference
 * between a visitor waiting and a visitor leaving — and it is far more
 * important than any per-frame optimisation, because it is on the critical
 * path for every single user while most frame costs are not.
 *
 * WHY NOT A WORKER
 * ----------------
 * Because the output is three.js objects — geometries, materials, meshes —
 * which are not transferable and would have to be rebuilt on the main thread
 * anyway. The manifest alone could move to a worker (it is pure typed-array
 * maths), and that is worth doing later; it is a bigger change than this and
 * buys less, since chunking already removes the visible stall.
 *
 * WHY 8ms
 * -------
 * A 60fps frame is 16.7ms. Spending half of it on construction leaves room for
 * a paint, so the loader animates and the tab stays alive. Raising the budget
 * builds faster and feels worse; that trade is exposed rather than hidden.
 */

/** Yield to the browser so it can paint. Falls back cleanly outside a DOM. */
export function nextFrame() {
  if (typeof requestAnimationFrame === 'function') {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Drive a generator, surrendering the thread whenever the frame budget is
 * spent. The generator decides where it is safe to be interrupted by choosing
 * where to yield — which is the whole reason this is a generator and not a
 * callback: interruption points are a property of the algorithm, not of the
 * scheduler.
 *
 * @param {Iterator} iterator      yields progress fractions, or anything
 * @param {object}  [opts]
 * @param {number}  [opts.budgetMs=8]
 * @param {(fraction:number, detail:any) => void} [opts.onProgress]
 * @returns {Promise<void>}
 */
export async function runChunked(iterator, opts = {}) {
  const budget = opts.budgetMs ?? 8;
  let slice = performance.now();

  for (;;) {
    const { value, done } = iterator.next();
    if (done) break;

    if (opts.onProgress && value != null) {
      const f = typeof value === 'number' ? value : value.fraction;
      if (typeof f === 'number') opts.onProgress(f, value);
    }

    if (performance.now() - slice >= budget) {
      await nextFrame();
      slice = performance.now();
    }
  }
}

/**
 * Run a list of named phases with progress spanning [from, to].
 * Each phase is either a generator function (chunked) or a plain function
 * (run whole, then yield once).
 *
 * @param {Array<{label:string, weight?:number, run:Function}>} phases
 * @param {{from?:number, to?:number, budgetMs?:number,
 *          onProgress?:(fraction:number, label:string) => void}} [opts]
 */
export async function runPhases(phases, opts = {}) {
  const from = opts.from ?? 0;
  const to = opts.to ?? 1;
  const total = phases.reduce((n, p) => n + (p.weight ?? 1), 0);
  let done = 0;

  for (const phase of phases) {
    const weight = phase.weight ?? 1;
    const base = from + (done / total) * (to - from);
    const span = (weight / total) * (to - from);
    opts.onProgress?.(base, phase.label);

    const result = phase.run();
    if (result && typeof result.next === 'function') {
      await runChunked(result, {
        budgetMs: opts.budgetMs,
        onProgress: f => opts.onProgress?.(base + f * span, phase.label)
      });
    } else {
      await result;
      await nextFrame();
    }

    done += weight;
    opts.onProgress?.(base + span, phase.label);
  }
}

export default { nextFrame, runChunked, runPhases };
