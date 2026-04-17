/**
 * One Euro Filter — https://gery.casiez.net/1euro/
 *
 * 低速時はカットオフを下げてジッタを除去、高速時は beta 項でカットオフを上げて
 * 追従させる適応的 low-pass。頭姿勢・目線・表情など 1 軸の時系列値に適用。
 */
export class OneEuroFilter {
  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrev: number | null = null;

  constructor(
    public minCutoff = 1.0,
    public beta = 0.007,
    public dCutoff = 1.0,
  ) {}

  static alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }

  filter(x: number, tSec: number): number {
    if (this.tPrev === null || this.xPrev === null) {
      this.tPrev = tSec;
      this.xPrev = x;
      return x;
    }
    const dt = Math.max(1e-6, tSec - this.tPrev);
    const dx = (x - this.xPrev) / dt;
    const aD = OneEuroFilter.alpha(this.dCutoff, dt);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = OneEuroFilter.alpha(cutoff, dt);
    const xHat = a * x + (1 - a) * this.xPrev;
    this.xPrev = xHat;
    this.dxPrev = dxHat;
    this.tPrev = tSec;
    return xHat;
  }
}
