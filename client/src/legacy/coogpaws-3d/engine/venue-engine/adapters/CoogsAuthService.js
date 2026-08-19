/**
 * CoogsAuthService
 * ---------------------------------------------------------------------------
 * The engine's AuthService contract, satisfied by CoogsNation.
 *
 * THE ENGINE NEVER AUTHENTICATES. This adapter performs no login, holds no
 * credential, writes no cookie and touches no storage. It receives a
 * permission context that the application already computed on the server, and
 * presents it in the shape the engine's ServiceRegistry expects.
 *
 * That is why `signIn()` and `signOut()` throw rather than doing something
 * plausible: a silent no-op would let a future caller believe the engine can
 * manage identity. It cannot, and the failure should be loud.
 *
 * Replaces `LocalAuthService`, which is deleted.
 */

import { AuthService } from '../services/interfaces.js';

export class CoogsAuthService extends AuthService {
  /**
   * @param {object} ctx
   * @param {import('@shared/venue').VenueUserContext} ctx.user
   *        Permission context supplied by CoogsNation. Already authenticated,
   *        already authorized — the engine treats it as fact.
   */
  constructor(ctx) {
    super();
    if (!ctx?.user?.userId) {
      throw new Error('CoogsAuthService requires an authenticated user context from the application');
    }
    this._context = ctx.user;
    this._session = {
      userId: ctx.user.userId,
      username: ctx.user.displayName,
      guest: !ctx.user.authenticated,
      roles: ctx.user.roles,
      // No token. The engine has no business holding one; the browser's
      // session cookie authenticates every application request.
      expiresAt: undefined,
    };
    this._handlers = new Set();
  }

  /** The application resolved identity before the engine booted. */
  async resolve() {
    return this._session;
  }

  async signIn() {
    throw new Error(
      'The venue engine cannot sign users in. Authentication belongs to CoogsNation.',
    );
  }

  async signOut() {
    throw new Error(
      'The venue engine cannot sign users out. Use the CoogsNation session controls.',
    );
  }

  getSession() {
    return this._session;
  }

  onSessionChanged(handler) {
    // The application owns the session lifecycle. If it ends, CoogsNation
    // unmounts the venue; the engine is never asked to survive it.
    this._handlers.add(handler);
    return () => this._handlers.delete(handler);
  }

  /* ── permission context, read-only ─────────────────────────────────── */

  /** @returns {import('@shared/venue').VenueUserContext} */
  get context() {
    return this._context;
  }

  /**
   * Presentation only. The application already decided; this never gates
   * access, it only decides what the UI offers.
   * @param {string} permission
   */
  can(permission) {
    return this._context.permissions.includes(permission);
  }

  hasRole(role) {
    return this._context.roles.includes(role);
  }

  get permissionLevel() {
    return this._context.permissionLevel;
  }
}

export default CoogsAuthService;
