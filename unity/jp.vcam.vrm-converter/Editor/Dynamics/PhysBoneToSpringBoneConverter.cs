#if VCAM_HAS_VRCSDK && VCAM_HAS_UNIVRM0
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using VCam.VrmConverter.Validation;
using VRC.Dynamics;
using VRM;

namespace VCam.VrmConverter.Dynamics
{
    /// <summary>
    /// VRCPhysBone → VRMSpringBone の変換。PhysBone 1 個につき SpringBone 1 個を
    /// ルート直下の "secondary" オブジェクトに生成する (VRM0 の慣例)。
    /// パラメータの数値変換は SpringBoneParameterMap (pure 関数) に委譲。
    /// </summary>
    public static class PhysBoneToSpringBoneConverter
    {
        public const string SecondaryObjectName = "secondary";

        public static void ConvertAll(GameObject avatar, SpringBoneMapSettings settings, ValidationReport report)
        {
            var colliderMap = PhysBoneColliderConverter.ConvertAll(avatar, report);
            var secondary = GetOrCreateSecondary(avatar);
            var humanoidBones = CollectHumanoidBones(avatar);
            var hips = avatar.GetComponent<Animator>()?.GetBoneTransform(HumanBodyBones.Hips);

            foreach (var physBone in avatar.GetComponentsInChildren<VRCPhysBoneBase>(true))
            {
                ConvertOne(avatar, physBone, secondary, settings, humanoidBones, hips, colliderMap, report);
            }
        }

        private static void ConvertOne(
            GameObject avatar,
            VRCPhysBoneBase physBone,
            GameObject secondary,
            SpringBoneMapSettings settings,
            HashSet<Transform> humanoidBones,
            Transform hips,
            Dictionary<VRCPhysBoneColliderBase, VRMSpringBoneColliderGroup> colliderMap,
            ValidationReport report)
        {
            var root = physBone.rootTransform != null ? physBone.rootTransform : physBone.transform;
            var path = HierarchyPath(avatar.transform, physBone.transform);

            var ignored = new HashSet<Transform>(
                (physBone.ignoreTransforms ?? new List<Transform>()).Where(t => t != null));

            var chainRoots = new List<Transform>();
            PickChainRoots(root, humanoidBones, ignored, chainRoots);
            if (chainRoots.Count == 0)
            {
                report.AddInfo($"PhysBone '{path}' に揺らせるボーンが無いためスキップしました。", physBone);
                return;
            }

            // チェーン途中の除外は VRM SpringBone では表現できない
            foreach (var ig in ignored)
            {
                if (!chainRoots.Contains(ig) && ig.IsChildOf(root))
                {
                    report.AddWarning(
                        $"PhysBone '{path}' のチェーン途中の Ignore Transform ({ig.name}) は VRM 非対応のため無視されます。",
                        null, physBone);
                    break;
                }
            }

            var hasLimit = physBone.limitType != VRCPhysBoneBase.LimitType.None;
            if (physBone.limitType == VRCPhysBoneBase.LimitType.Hinge ||
                physBone.limitType == VRCPhysBoneBase.LimitType.Polar)
            {
                report.AddWarning(
                    $"PhysBone '{path}' の {physBone.limitType} 制限は角度制限として近似します。",
                    null, physBone);
            }

            if (HasKeys(physBone.pullCurve) || HasKeys(physBone.springCurve) || HasKeys(physBone.radiusCurve))
            {
                report.AddWarning(
                    $"PhysBone '{path}' のカーブ設定は VRM 非対応のため根本の値のみ使用します。",
                    null, physBone);
            }

            var mapped = SpringBoneParameterMap.Map(
                new PhysBoneParams
                {
                    Pull = physBone.pull,
                    Spring = physBone.spring,
                    Gravity = physBone.gravity,
                    Immobile = physBone.immobile,
                    Radius = physBone.radius * MaxAbs(root.lossyScale),
                    ImmobileWorld = physBone.immobileType == VRCPhysBoneBase.ImmobileType.World,
                    HasLimit = hasLimit,
                    LimitAngle = physBone.maxAngleX,
                },
                settings);

            if (mapped.Skip)
            {
                report.AddInfo($"PhysBone '{path}' は可動角 0 (完全固定) のため SpringBone を生成しません。", physBone);
                return;
            }

            var springBone = secondary.AddComponent<VRMSpringBone>();
            springBone.m_comment = $"converted from PhysBone: {path}";
            springBone.m_stiffnessForce = mapped.Stiffness;
            springBone.m_dragForce = mapped.Drag;
            springBone.m_gravityPower = mapped.GravityPower;
            springBone.m_gravityDir = new Vector3(0f, -1f, 0f);
            springBone.m_hitRadius = mapped.HitRadius;
            springBone.RootBones = chainRoots;
            if (physBone.immobileType == VRCPhysBoneBase.ImmobileType.World && hips != null)
            {
                springBone.m_center = hips;
            }

            var groups = (physBone.colliders ?? new List<VRCPhysBoneColliderBase>())
                .Where(c => c != null && colliderMap.ContainsKey(c))
                .Select(c => colliderMap[c])
                .Distinct()
                .ToArray();
            if (groups.Length > 0)
            {
                springBone.ColliderGroups = groups;
            }
        }

        /// <summary>
        /// SpringBone のチェーン開始ボーンを選ぶ。Humanoid ボーン (Hips など) を root に
        /// した PhysBone (スカート等) をそのまま渡すと脚まで揺れてしまうため、
        /// humanoid ボーンは展開して非 humanoid の子をチェーン開始にする。
        /// </summary>
        internal static void PickChainRoots(
            Transform t, HashSet<Transform> humanoidBones, HashSet<Transform> ignored, List<Transform> result)
        {
            if (ignored.Contains(t))
            {
                return;
            }
            if (!humanoidBones.Contains(t))
            {
                result.Add(t);
                return;
            }
            foreach (Transform child in t)
            {
                PickChainRoots(child, humanoidBones, ignored, result);
            }
        }

        private static GameObject GetOrCreateSecondary(GameObject avatar)
        {
            var existing = avatar.transform.Find(SecondaryObjectName);
            if (existing != null)
            {
                return existing.gameObject;
            }
            var secondary = new GameObject(SecondaryObjectName);
            secondary.transform.SetParent(avatar.transform, false);
            return secondary;
        }

        private static HashSet<Transform> CollectHumanoidBones(GameObject avatar)
        {
            var set = new HashSet<Transform>();
            var animator = avatar.GetComponent<Animator>();
            if (animator == null || animator.avatar == null || !animator.avatar.isHuman)
            {
                return set;
            }
            for (var i = 0; i < (int)HumanBodyBones.LastBone; i++)
            {
                var bone = animator.GetBoneTransform((HumanBodyBones)i);
                if (bone != null)
                {
                    set.Add(bone);
                }
            }
            return set;
        }

        private static bool HasKeys(AnimationCurve curve)
        {
            return curve != null && curve.length > 0;
        }

        private static string HierarchyPath(Transform root, Transform target)
        {
            var parts = new List<string>();
            var current = target;
            while (current != null && current != root)
            {
                parts.Insert(0, current.name);
                current = current.parent;
            }
            return string.Join("/", parts);
        }

        private static float MaxAbs(Vector3 v)
        {
            return Mathf.Max(Mathf.Abs(v.x), Mathf.Abs(v.y), Mathf.Abs(v.z));
        }
    }
}
#endif
