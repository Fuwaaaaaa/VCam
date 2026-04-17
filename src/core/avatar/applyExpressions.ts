import { clamp01 } from '../math/clamp';
import type { FaceRig, ExpressionValues } from '../../types';
import type { RigFilterSet } from '../filters/rigFilterSet';

/**
 * FaceRig + マイク音量 から ExpressionValues へ変換する pure 関数。
 *
 * 変換ロジック (テスト対象):
 * - blink: Kalidokit の eye.l/r は 1=開, 0=閉 なので 1-v
 * - aa/ih/ou/ee/oh: Kalidokit.mouth.shape の 5 母音をそのまま (aa のみマイクとブレンド)
 * - surprised/sad: brow の 0..1 範囲、0.5 が中立
 *   - brow > 0.5 → surprised = (brow-0.5)*2
 *   - brow < 0.5 → sad       = (0.5-brow)*2
 * - lookLeft/Right/Up/Down: pupil を正負で分割 (鏡像補正は呼出側で反転済み)
 */
export function computeExpressions(
  rig: FaceRig | null,
  opts: { mic: boolean; gaze: boolean; smooth: boolean; micLevel: number },
  filters: RigFilterSet | null,
  now: number,
): ExpressionValues {
  if (!rig) {
    return {
      blinkLeft: 0, blinkRight: 0,
      aa: opts.mic ? clamp01(opts.micLevel) : 0,
      ih: 0, ou: 0, ee: 0, oh: 0,
      surprised: 0, sad: 0,
      lookLeft: 0, lookRight: 0, lookUp: 0, lookDown: 0,
    };
  }

  // 瞬き
  let eL = clamp01(rig.eye?.l ?? 1);
  let eR = clamp01(rig.eye?.r ?? 1);
  if (opts.smooth && filters) {
    eL = clamp01(filters.eyeL.filter(eL, now));
    eR = clamp01(filters.eyeR.filter(eR, now));
  }

  // 口形
  const aaFace = clamp01(rig.mouth?.shape?.A ?? 0);
  const ih = clamp01(rig.mouth?.shape?.I ?? 0);
  const ou = clamp01(rig.mouth?.shape?.U ?? 0);
  const ee = clamp01(rig.mouth?.shape?.E ?? 0);
  const oh = clamp01(rig.mouth?.shape?.O ?? 0);
  const aa = opts.mic ? Math.max(aaFace, clamp01(opts.micLevel)) : aaFace;

  // 眉
  let brow = rig.brow ?? 0.5;
  if (opts.smooth && filters) brow = filters.brow.filter(brow, now);
  const surprised = clamp01((brow - 0.5) * 2);
  const sad = clamp01((0.5 - brow) * 2);

  // 目線 (webcam 鏡像前提で x 反転)
  let lookLeft = 0, lookRight = 0, lookUp = 0, lookDown = 0;
  if (opts.gaze && rig.pupil) {
    let px = rig.pupil.x ?? 0;
    let py = rig.pupil.y ?? 0;
    if (opts.smooth && filters) {
      px = filters.pupilX.filter(px, now);
      py = filters.pupilY.filter(py, now);
    }
    px = -px;
    lookLeft  = clamp01(-px);
    lookRight = clamp01(px);
    lookUp    = clamp01(py);
    lookDown  = clamp01(-py);
  }

  return {
    blinkLeft: 1 - eL,
    blinkRight: 1 - eR,
    aa, ih, ou, ee, oh,
    surprised, sad,
    lookLeft, lookRight, lookUp, lookDown,
  };
}
