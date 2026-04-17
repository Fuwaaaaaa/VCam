import type { VRM } from '@pixiv/three-vrm';
import type { FaceRig, AppOptions, ExpressionValues } from '../../types';
import type { RigFilterSet } from '../filters/rigFilterSet';
import { computeHeadRotation, scaleHeadForNeck } from './applyHead';
import { computeExpressions } from './applyExpressions';
import { lerp } from '../math/clamp';

const FALLBACK_EASE = 0.4;

/**
 * VRM にリグを反映する。毎フレーム呼ぶ想定。
 *
 * データフロー:
 * ┌────────┐    ┌─────────────┐    ┌──────────────────┐
 * │ FaceRig │ ─▶│ compute...()│ ─▶│ head/neck/expression│
 * └────────┘    └─────────────┘    └──────────────────┘
 *                     │
 *                     ▼
 *              (OneEuroFilter, optional)
 */
export function applyRig(
  vrm: VRM,
  rig: FaceRig | null,
  opts: AppOptions & { micLevel: number },
  filters: RigFilterSet,
  now: number,
): void {
  const hum = vrm.humanoid;
  if (!hum) return;

  // --- 頭と首 ---
  const head = computeHeadRotation(rig, opts.smooth, filters, now);
  const neck = scaleHeadForNeck(head);

  const headBone = hum.getNormalizedBoneNode('head');
  if (headBone) {
    if (opts.smooth) {
      headBone.rotation.set(head.x, head.y, head.z);
    } else {
      headBone.rotation.x = lerp(headBone.rotation.x, head.x, FALLBACK_EASE);
      headBone.rotation.y = lerp(headBone.rotation.y, head.y, FALLBACK_EASE);
      headBone.rotation.z = lerp(headBone.rotation.z, head.z, FALLBACK_EASE);
    }
  }
  const neckBone = hum.getNormalizedBoneNode('neck');
  if (neckBone) {
    if (opts.smooth) {
      neckBone.rotation.set(neck.x, neck.y, neck.z);
    } else {
      neckBone.rotation.x = lerp(neckBone.rotation.x, neck.x, FALLBACK_EASE);
      neckBone.rotation.y = lerp(neckBone.rotation.y, neck.y, FALLBACK_EASE);
      neckBone.rotation.z = lerp(neckBone.rotation.z, neck.z, FALLBACK_EASE);
    }
  }

  // --- 表情 ---
  const ev: ExpressionValues = computeExpressions(rig, opts, filters, now);
  const em = vrm.expressionManager;
  if (em) {
    em.setValue('blinkLeft',  ev.blinkLeft);
    em.setValue('blinkRight', ev.blinkRight);
    em.setValue('aa', ev.aa);
    em.setValue('ih', ev.ih);
    em.setValue('ou', ev.ou);
    em.setValue('ee', ev.ee);
    em.setValue('oh', ev.oh);
    em.setValue('surprised', ev.surprised);
    em.setValue('sad',       ev.sad);
    em.setValue('lookLeft',  ev.lookLeft);
    em.setValue('lookRight', ev.lookRight);
    em.setValue('lookUp',    ev.lookUp);
    em.setValue('lookDown',  ev.lookDown);
  }
}
