import {
  type CameraState,
  type ViewportSize,
  anchoredCenter,
} from "src/lib/renderer/camera/Camera";
import type { Point } from "src/lib/renderer/math/affine";

/**
 * Eases the camera toward a target, frame by frame.
 *
 * Each target is reached in exactly `animationTime` seconds along
 * `(1 − e^(−s·t)) / (1 − e^(−s))`, where `t` is the fraction of that time elapsed and `s`
 * the stiffness. A new target mid-flight (another wheel notch, another drag event)
 * restarts the curve from where the camera is. Zoom
 * interpolates in log space so each frame is the same *ratio* of change.
 *
 * An anchored target ("zoom about this point") recomputes the centre every frame so the
 * anchor holds still on screen throughout, not just once the animation lands.
 */
export interface CameraTarget {
  state: CameraState;
  /** World point to pin under `anchor.screen` while zoom changes. */
  anchor?: { world: Point; screen: Point };
}

const DEFAULT_ANIMATION_TIME = 1.2;
const DEFAULT_STIFFNESS = 6.5;
const PIXEL_EPSILON = 0.05;

export class CameraAnimator {
  current: CameraState;
  private start: CameraState;
  private target: CameraTarget | null = null;
  private elapsed = 0;
  private animationTime: number;
  private stiffness: number;

  constructor(
    initial: CameraState,
    animationTime = DEFAULT_ANIMATION_TIME,
    stiffness = DEFAULT_STIFFNESS,
  ) {
    this.current = { ...initial };
    this.start = { ...initial };
    this.animationTime = Math.max(0, animationTime);
    this.stiffness = stiffness;
  }

  get animating(): boolean {
    return this.target !== null;
  }

  /** The state the camera is heading to (or at, when idle). */
  get destination(): CameraState {
    return this.target ? { ...this.target.state } : { ...this.current };
  }

  /** Jump, cancelling any animation. Used by drags that track the pointer 1:1. */
  set(state: CameraState): void {
    this.current = { ...state };
    this.target = null;
  }

  animateTo(
    target: CameraTarget,
    viewport: ViewportSize,
    immediate = false,
  ): void {
    if (immediate || this.animationTime === 0) {
      this.set(target.state);
      return;
    }

    /*
     * An anchor is only honoured if it agrees with the target. When the caller clamped
     * the target centre (zooming out past the edge of the world), the anchored path
     * would land somewhere other than the target — so fall back to a plain centre
     * interpolation instead.
     */
    let anchor = target.anchor;
    if (anchor) {
      const landing = anchoredCenter(
        anchor.world,
        anchor.screen,
        target.state.zoom,
        target.state.rotation,
        viewport,
      );
      const miss =
        Math.hypot(landing.x - target.state.x, landing.y - target.state.y) *
        target.state.zoom;
      if (miss > PIXEL_EPSILON) anchor = undefined;
    }

    this.start = { ...this.current };
    this.elapsed = 0;
    this.target = { state: { ...target.state }, anchor };
  }

  stop(): void {
    this.target = null;
  }

  /**
   * Advance by `dt` seconds. Returns true while still moving, so the frame loop knows to
   * keep ticking.
   */
  step(dt: number, viewport: ViewportSize): boolean {
    const target = this.target;
    if (!target) return false;

    this.elapsed += Math.max(dt, 0);
    const t = this.elapsed / this.animationTime;
    if (t >= 1) {
      this.current = { ...target.state };
      this.target = null;
      return false;
    }

    const s = this.stiffness;
    const k = (1 - Math.exp(-s * t)) / (1 - Math.exp(-s));
    const from = this.start;
    const to = target.state;
    const zoom = Math.exp(
      Math.log(from.zoom) + (Math.log(to.zoom) - Math.log(from.zoom)) * k,
    );
    const rotation = from.rotation + (to.rotation - from.rotation) * k;
    const center = target.anchor
      ? anchoredCenter(
          target.anchor.world,
          target.anchor.screen,
          zoom,
          rotation,
          viewport,
        )
      : {
          x: from.x + (to.x - from.x) * k,
          y: from.y + (to.y - from.y) * k,
        };

    this.current = { x: center.x, y: center.y, zoom, rotation };
    return true;
  }
}
