#if VCAM_HAS_VRCSDK && VCAM_HAS_UNIVRM0
using System.Collections.Generic;
using UnityEngine;
using VCam.VrmConverter.Validation;
using VRC.Dynamics;
using VRM;

namespace VCam.VrmConverter.Dynamics
{
    /// <summary>
    /// VRCPhysBoneCollider → VRMSpringBoneColliderGroup の変換。
    /// VRM0 は球コライダしか持たないため、カプセルは軸に沿って球を並べて近似する。
    /// </summary>
    public static class PhysBoneColliderConverter
    {
        /// <summary>
        /// アバター内の全 PhysBone コライダを変換し、元コライダ → 生成グループの対応表を返す。
        /// </summary>
        public static Dictionary<VRCPhysBoneColliderBase, VRMSpringBoneColliderGroup> ConvertAll(
            GameObject avatar, ValidationReport report)
        {
            var map = new Dictionary<VRCPhysBoneColliderBase, VRMSpringBoneColliderGroup>();
            foreach (var collider in avatar.GetComponentsInChildren<VRCPhysBoneColliderBase>(true))
            {
                var group = Convert(collider, report);
                if (group != null)
                {
                    map[collider] = group;
                }
            }
            return map;
        }

        private static VRMSpringBoneColliderGroup Convert(VRCPhysBoneColliderBase collider, ValidationReport report)
        {
            var target = collider.rootTransform != null ? collider.rootTransform : collider.transform;
            var scale = MaxAbs(target.lossyScale);

            List<VRMSpringBoneColliderGroup.SphereCollider> spheres;
            switch (collider.shapeType)
            {
                case VRCPhysBoneColliderBase.ShapeType.Sphere:
                    spheres = new List<VRMSpringBoneColliderGroup.SphereCollider>
                    {
                        new VRMSpringBoneColliderGroup.SphereCollider
                        {
                            Offset = collider.position,
                            Radius = collider.radius * scale,
                        },
                    };
                    break;

                case VRCPhysBoneColliderBase.ShapeType.Capsule:
                    spheres = CapsuleToSpheres(collider, scale);
                    break;

                default:
                    report.AddWarning(
                        $"Plane コライダは VRM 非対応のためスキップしました: {collider.name}",
                        null, collider);
                    return null;
            }

            if (collider.insideBounds)
            {
                report.AddWarning(
                    $"Inside Bounds コライダは VRM 非対応のため通常コライダとして変換しました: {collider.name}",
                    null, collider);
            }

            var group = target.GetComponent<VRMSpringBoneColliderGroup>();
            if (group == null)
            {
                group = target.gameObject.AddComponent<VRMSpringBoneColliderGroup>();
                group.Colliders = spheres.ToArray();
            }
            else
            {
                // 同一 Transform に複数の PhysBone コライダ → 球を追記
                var merged = new List<VRMSpringBoneColliderGroup.SphereCollider>(group.Colliders ?? new VRMSpringBoneColliderGroup.SphereCollider[0]);
                merged.AddRange(spheres);
                group.Colliders = merged.ToArray();
            }
            return group;
        }

        /// <summary>カプセルを軸方向に並んだ 3〜5 個の球で近似する。</summary>
        private static List<VRMSpringBoneColliderGroup.SphereCollider> CapsuleToSpheres(
            VRCPhysBoneColliderBase collider, float scale)
        {
            var radius = collider.radius;
            var height = Mathf.Max(collider.height, radius * 2f);
            var axis = collider.rotation * Vector3.up;
            var half = Mathf.Max(0f, height / 2f - radius);

            var count = Mathf.Clamp(Mathf.CeilToInt(height / Mathf.Max(radius, 1e-4f)), 3, 5);
            var spheres = new List<VRMSpringBoneColliderGroup.SphereCollider>(count);
            for (var i = 0; i < count; i++)
            {
                var t = count == 1 ? 0.5f : (float)i / (count - 1);
                var offset = collider.position + axis * Mathf.Lerp(-half, half, t);
                spheres.Add(new VRMSpringBoneColliderGroup.SphereCollider
                {
                    Offset = offset,
                    Radius = radius * scale,
                });
            }
            return spheres;
        }

        private static float MaxAbs(Vector3 v)
        {
            return Mathf.Max(Mathf.Abs(v.x), Mathf.Abs(v.y), Mathf.Abs(v.z));
        }
    }
}
#endif
