using System.Collections.Generic;
using UnityEngine;

#if VCAM_HAS_VRCSDK
using VRC.SDK3.Avatars.Components;
using VRC.SDKBase;
#endif

namespace VCam.VrmConverter.Validation
{
    /// <summary>変換前チェック。Error が出た場合はウィザードが先へ進めない。</summary>
    public static class AvatarValidator
    {
        /// <summary>テクスチャ合計サイズの警告閾値 [bytes]。VCam はブラウザ系ランタイムのため大きすぎると読み込みが重い。</summary>
        private const long TextureWarnBytes = 70L * 1024 * 1024;

        private static readonly HumanBodyBones[] RequiredBones =
        {
            HumanBodyBones.Hips, HumanBodyBones.Spine, HumanBodyBones.Head,
            HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftHand,
            HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm, HumanBodyBones.RightHand,
            HumanBodyBones.LeftUpperLeg, HumanBodyBones.LeftLowerLeg, HumanBodyBones.LeftFoot,
            HumanBodyBones.RightUpperLeg, HumanBodyBones.RightLowerLeg, HumanBodyBones.RightFoot,
        };

        public static ValidationReport Validate(GameObject avatar)
        {
            var report = new ValidationReport();
            if (avatar == null)
            {
                report.AddError("アバターが選択されていません。");
                return report;
            }

#if !VCAM_HAS_UNIVRM0
            report.AddError(
                "UniVRM (com.vrmc.univrm) が見つかりません。",
                "Package Manager で UniVRM (v0.128.0 以上) を先にインストールしてください。com.vrmc.gltf → com.vrmc.univrm の順で追加します。");
#endif
#if !VCAM_HAS_VRCSDK
            report.AddError(
                "VRChat SDK3 Avatars (com.vrchat.avatars) が見つかりません。",
                "VRChat Creator Companion で作成した Avatars プロジェクトで実行してください。");
#else
            ValidateDescriptor(avatar, report);
#endif
            ValidateHumanoid(avatar, report);
            ValidateScale(avatar, report);
            ValidateMaterials(avatar, report);
            AddStatistics(avatar, report);
            return report;
        }

#if VCAM_HAS_VRCSDK
        private static void ValidateDescriptor(GameObject avatar, ValidationReport report)
        {
            var descriptor = avatar.GetComponent<VRCAvatarDescriptor>();
            if (descriptor == null)
            {
                report.AddError(
                    "VRCAvatarDescriptor が見つかりません。",
                    "VRChat アバターのルート (Descriptor が付いたオブジェクト) を選択してください。",
                    avatar);
                return;
            }

            if (descriptor.lipSync != VRC_AvatarDescriptor.LipSyncStyle.VisemeBlendShape ||
                descriptor.VisemeSkinnedMesh == null)
            {
                report.AddWarning(
                    "リップシンク (Viseme) が未設定です。変換後のアバターは口パクしません。",
                    "VRCAvatarDescriptor の LipSync を Viseme Blend Shape に設定すると口パクが変換されます。",
                    descriptor);
            }

            if (descriptor.customEyeLookSettings.eyelidType != VRCAvatarDescriptor.EyelidType.Blendshapes ||
                descriptor.customEyeLookSettings.eyelidsSkinnedMesh == null)
            {
                report.AddWarning(
                    "まばたき (Eyelids: Blendshapes) が未設定です。変換後のアバターはまばたきしません。",
                    "VRCAvatarDescriptor の Eye Look → Eyelids を Blendshapes に設定すると変換されます。",
                    descriptor);
            }
        }
#endif

        private static void ValidateHumanoid(GameObject avatar, ValidationReport report)
        {
            var animator = avatar.GetComponent<Animator>();
            if (animator == null || animator.avatar == null || !animator.avatar.isHuman)
            {
                report.AddError(
                    "アバターが Humanoid ではありません。",
                    "モデルの Rig 設定で Animation Type を Humanoid にして Apply してください。",
                    avatar);
                return;
            }

            var missing = new List<string>();
            foreach (var bone in RequiredBones)
            {
                if (animator.GetBoneTransform(bone) == null)
                {
                    missing.Add(bone.ToString());
                }
            }
            if (missing.Count > 0)
            {
                report.AddError(
                    $"必須ボーンが不足しています: {string.Join(", ", missing)}",
                    "Humanoid のボーンマッピングを確認してください。",
                    avatar);
            }
        }

        private static void ValidateScale(GameObject avatar, ValidationReport report)
        {
            var s = avatar.transform.lossyScale;
            if (Mathf.Abs(s.x - s.y) > 1e-4f || Mathf.Abs(s.y - s.z) > 1e-4f)
            {
                report.AddError(
                    $"ルートのスケールが非一様です ({s.x:F3}, {s.y:F3}, {s.z:F3})。変換結果が歪みます。",
                    "ルートの Scale を一様 (例: 1,1,1) にしてください。",
                    avatar);
            }
            else if (Mathf.Abs(s.x - 1f) > 1e-3f)
            {
                report.AddWarning(
                    $"ルートのスケールが 1 ではありません ({s.x:F3})。エクスポート時に正規化で焼き込まれます。",
                    null,
                    avatar);
            }
        }

        private static void ValidateMaterials(GameObject avatar, ValidationReport report)
        {
            foreach (var renderer in avatar.GetComponentsInChildren<Renderer>(true))
            {
                foreach (var mat in renderer.sharedMaterials)
                {
                    if (mat == null || mat.shader == null)
                    {
                        continue;
                    }
                    if (mat.shader.name.StartsWith("Hidden/Locked/"))
                    {
                        report.AddError(
                            $"Poiyomi のロック済みマテリアルがあります: {mat.name}",
                            "マテリアルを右クリック → Thry → Unlock Material(s) でロック解除してから再実行してください。",
                            mat);
                    }
                }
            }
        }

        private static void AddStatistics(GameObject avatar, ValidationReport report)
        {
            long triangles = 0;
            var materials = new HashSet<Material>();
            var textures = new HashSet<Texture>();
            foreach (var renderer in avatar.GetComponentsInChildren<Renderer>(true))
            {
                foreach (var mat in renderer.sharedMaterials)
                {
                    if (mat == null)
                    {
                        continue;
                    }
                    materials.Add(mat);
                    var shader = mat.shader;
                    if (shader == null)
                    {
                        continue;
                    }
                    var count = UnityEditor.ShaderUtil.GetPropertyCount(shader);
                    for (var i = 0; i < count; i++)
                    {
                        if (UnityEditor.ShaderUtil.GetPropertyType(shader, i) != UnityEditor.ShaderUtil.ShaderPropertyType.TexEnv)
                        {
                            continue;
                        }
                        var tex = mat.GetTexture(UnityEditor.ShaderUtil.GetPropertyName(shader, i));
                        if (tex != null)
                        {
                            textures.Add(tex);
                        }
                    }
                }

                var smr = renderer as SkinnedMeshRenderer;
                var mesh = smr != null ? smr.sharedMesh : (renderer.GetComponent<MeshFilter>()?.sharedMesh);
                if (mesh != null)
                {
                    triangles += mesh.triangles.Length / 3;
                }
            }

            long textureBytes = 0;
            foreach (var tex in textures)
            {
                // 圧縮形式によらない概算 (RGBA32 換算)。閾値判定の目安として十分。
                textureBytes += (long)tex.width * tex.height * 4;
            }

            report.AddInfo($"ポリゴン数: {triangles:N0} tri / マテリアル: {materials.Count} 個 / テクスチャ: {textures.Count} 枚 (約 {textureBytes / (1024f * 1024f):F0} MB 非圧縮換算)");
            if (textureBytes > TextureWarnBytes)
            {
                report.AddWarning(
                    "テクスチャ合計サイズが大きいため、VCam (ブラウザ系ランタイム) での読み込みが遅い・重い可能性があります。",
                    "テクスチャの Max Size を下げる、不要なマテリアルを削除するなどを検討してください。");
            }
        }
    }
}
