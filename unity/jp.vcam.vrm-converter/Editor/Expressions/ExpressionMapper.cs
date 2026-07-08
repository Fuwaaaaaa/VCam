#if VCAM_HAS_UNIVRM0
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using VCam.VrmConverter.Extraction;
using VCam.VrmConverter.Materials;
using VCam.VrmConverter.Validation;
using VRM;

namespace VCam.VrmConverter.Expressions
{
    /// <summary>
    /// VrcAvatarInfo から VRM0 の BlendShapeClip 群 (A/I/U/E/O, Blink, Blink_L/R, LookAt, Neutral 等)
    /// を生成し、VRMBlendShapeProxy / VRMLookAt / VRMFirstPerson をアバター複製に取り付ける。
    /// </summary>
    public static class ExpressionMapper
    {
        public static void Apply(GameObject avatar, VrcAvatarInfo info, string assetDir, ValidationReport report)
        {
            MaterialConverterRegistry.EnsureFolder(assetDir);

            var blendShapeAvatar = ScriptableObject.CreateInstance<BlendShapeAvatar>();
            blendShapeAvatar.Clips = new List<BlendShapeClip>();

            // VRM0 の標準プリセットは空でも一通り用意する (three-vrm 側の参照エラー防止)
            AddClip(blendShapeAvatar, avatar, assetDir, "Neutral", BlendShapePreset.Neutral, null, null);
            AddVowelClips(blendShapeAvatar, avatar, assetDir, info, report);
            AddBlinkClips(blendShapeAvatar, avatar, assetDir, info, report);
            foreach (var (name, preset) in new[]
                     {
                         ("Joy", BlendShapePreset.Joy), ("Angry", BlendShapePreset.Angry),
                         ("Sorrow", BlendShapePreset.Sorrow), ("Fun", BlendShapePreset.Fun),
                         ("LookUp", BlendShapePreset.LookUp), ("LookDown", BlendShapePreset.LookDown),
                         ("LookLeft", BlendShapePreset.LookLeft), ("LookRight", BlendShapePreset.LookRight),
                     })
            {
                AddClip(blendShapeAvatar, avatar, assetDir, name, preset, null, null);
            }

            AssetDatabase.CreateAsset(blendShapeAvatar, $"{assetDir}/BlendShape.asset");

            var proxy = avatar.GetComponent<VRMBlendShapeProxy>() ?? avatar.AddComponent<VRMBlendShapeProxy>();
            proxy.BlendShapeAvatar = blendShapeAvatar;

            ApplyLookAtAndFirstPerson(avatar, info);
        }

        private static void AddVowelClips(BlendShapeAvatar blendShapeAvatar, GameObject avatar,
            string assetDir, VrcAvatarInfo info, ValidationReport report)
        {
            var presets = new Dictionary<VrmVowel, (string name, BlendShapePreset preset)>
            {
                { VrmVowel.A, ("A", BlendShapePreset.A) },
                { VrmVowel.I, ("I", BlendShapePreset.I) },
                { VrmVowel.U, ("U", BlendShapePreset.U) },
                { VrmVowel.E, ("E", BlendShapePreset.E) },
                { VrmVowel.O, ("O", BlendShapePreset.O) },
            };

            var bindings = new Dictionary<VrmVowel, BlendShapeBinding?>();
            foreach (var vowel in presets.Keys)
            {
                bindings[vowel] = null;
            }

            if (info.VisemeMesh != null && info.VisemeBlendShapes != null)
            {
                for (var i = 0; i < info.VisemeBlendShapes.Length; i++)
                {
                    if (!VisemeMap.TryGetVowel(i, out var vowel))
                    {
                        continue;
                    }
                    var binding = MakeBinding(avatar, info.VisemeMesh, info.VisemeBlendShapes[i]);
                    if (binding == null)
                    {
                        report.AddWarning(
                            $"viseme '{info.VisemeBlendShapes[i]}' に対応する BlendShape が見つかりません ({vowel} は口パクしません)。",
                            null, info.VisemeMesh);
                    }
                    bindings[vowel] = binding;
                }
            }

            foreach (var pair in presets)
            {
                AddClip(blendShapeAvatar, avatar, assetDir, pair.Value.name, pair.Value.preset,
                    bindings[pair.Key], null);
            }
        }

        private static void AddBlinkClips(BlendShapeAvatar blendShapeAvatar, GameObject avatar,
            string assetDir, VrcAvatarInfo info, ValidationReport report)
        {
            BlendShapeBinding? combined = null;
            if (info.EyelidsMesh != null &&
                info.EyelidsBlendShapeIndices != null &&
                info.EyelidsBlendShapeIndices.Length > 0 &&
                info.EyelidsBlendShapeIndices[0] >= 0)
            {
                combined = MakeBindingByIndex(avatar, info.EyelidsMesh, info.EyelidsBlendShapeIndices[0]);
            }

            // 片目分は BlendShape 名のヒューリスティックで探す
            BlendShapeBinding? left = null, right = null;
            if (info.EyelidsMesh != null && info.EyelidsMesh.sharedMesh != null)
            {
                var mesh = info.EyelidsMesh.sharedMesh;
                var names = new List<string>();
                for (var i = 0; i < mesh.blendShapeCount; i++)
                {
                    names.Add(mesh.GetBlendShapeName(i));
                }
                var leftName = BlinkShapeNameMatcher.Find(names, BlinkSide.Left);
                var rightName = BlinkShapeNameMatcher.Find(names, BlinkSide.Right);
                if (leftName != null)
                {
                    left = MakeBinding(avatar, info.EyelidsMesh, leftName);
                }
                if (rightName != null)
                {
                    right = MakeBinding(avatar, info.EyelidsMesh, rightName);
                }
            }

            if ((left == null || right == null) && combined != null)
            {
                // フォールバック: 片目クリップにも combined blink を割り当てる。
                // ウィンク時に両目が閉じる制限あり (VCam は通常両目同時なので実用上問題なし)
                left = left ?? combined;
                right = right ?? combined;
                report.AddWarning(
                    "片目まばたき (Blink_L/R) 用の BlendShape を特定できなかったため、両目まばたきで代用します。",
                    "ウィンクを使いたい場合はメッシュに blink_l / blink_r 形状を用意してください。");
            }

            AddClip(blendShapeAvatar, avatar, assetDir, "Blink", BlendShapePreset.Blink, combined, null);
            AddClip(blendShapeAvatar, avatar, assetDir, "Blink_L", BlendShapePreset.Blink_L, left, null);
            AddClip(blendShapeAvatar, avatar, assetDir, "Blink_R", BlendShapePreset.Blink_R, right, null);
        }

        private static void AddClip(BlendShapeAvatar blendShapeAvatar, GameObject avatar, string assetDir,
            string name, BlendShapePreset preset, BlendShapeBinding? binding, BlendShapeBinding? extraBinding)
        {
            var clip = ScriptableObject.CreateInstance<BlendShapeClip>();
            clip.BlendShapeName = name;
            clip.Preset = preset;
            var values = new List<BlendShapeBinding>();
            if (binding != null)
            {
                values.Add(binding.Value);
            }
            if (extraBinding != null)
            {
                values.Add(extraBinding.Value);
            }
            clip.Values = values.ToArray();
            AssetDatabase.CreateAsset(clip, $"{assetDir}/{name}.asset");
            blendShapeAvatar.Clips.Add(clip);
        }

        private static BlendShapeBinding? MakeBinding(GameObject avatar, SkinnedMeshRenderer mesh, string shapeName)
        {
            if (mesh == null || mesh.sharedMesh == null || string.IsNullOrEmpty(shapeName))
            {
                return null;
            }
            var index = mesh.sharedMesh.GetBlendShapeIndex(shapeName);
            if (index < 0)
            {
                return null;
            }
            return MakeBindingByIndex(avatar, mesh, index);
        }

        private static BlendShapeBinding? MakeBindingByIndex(GameObject avatar, SkinnedMeshRenderer mesh, int index)
        {
            if (mesh == null || mesh.sharedMesh == null || index < 0 || index >= mesh.sharedMesh.blendShapeCount)
            {
                return null;
            }
            return new BlendShapeBinding
            {
                RelativePath = RelativePath(avatar.transform, mesh.transform),
                Index = index,
                Weight = 100f,
            };
        }

        private static string RelativePath(Transform root, Transform target)
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

        private static void ApplyLookAtAndFirstPerson(GameObject avatar, VrcAvatarInfo info)
        {
            var animator = avatar.GetComponent<Animator>();
            var head = animator != null ? animator.GetBoneTransform(HumanBodyBones.Head) : null;

            var lookAtHead = avatar.GetComponent<VRMLookAtHead>() ?? avatar.AddComponent<VRMLookAtHead>();
            lookAtHead.Head = head;

            var leftEye = info.LeftEye != null
                ? info.LeftEye
                : (animator != null ? animator.GetBoneTransform(HumanBodyBones.LeftEye) : null);
            var rightEye = info.RightEye != null
                ? info.RightEye
                : (animator != null ? animator.GetBoneTransform(HumanBodyBones.RightEye) : null);

            if (leftEye != null || rightEye != null)
            {
                var applyer = avatar.GetComponent<VRMLookAtBoneApplyer>() ?? avatar.AddComponent<VRMLookAtBoneApplyer>();
                applyer.LeftEye = OffsetOnTransform.Create(leftEye);
                applyer.RightEye = OffsetOnTransform.Create(rightEye);
                applyer.HorizontalInner.CurveYRangeDegree = info.LookHorizontalInnerDegrees;
                applyer.HorizontalOuter.CurveYRangeDegree = info.LookHorizontalOuterDegrees;
                applyer.VerticalUp.CurveYRangeDegree = info.LookUpDegrees;
                applyer.VerticalDown.CurveYRangeDegree = info.LookDownDegrees;
            }

            var firstPerson = avatar.GetComponent<VRMFirstPerson>() ?? avatar.AddComponent<VRMFirstPerson>();
            firstPerson.FirstPersonBone = head;
            if (head != null)
            {
                // ViewPosition はアバタールートのローカル座標 → head ボーンローカルのオフセットへ
                var world = avatar.transform.TransformPoint(info.ViewPosition);
                firstPerson.FirstPersonOffset = head.InverseTransformPoint(world);
            }
        }
    }
}
#endif
