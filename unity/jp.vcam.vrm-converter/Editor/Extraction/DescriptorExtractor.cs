#if VCAM_HAS_VRCSDK
using UnityEngine;
using VRC.SDK3.Avatars.Components;
using VRC.SDKBase;

namespace VCam.VrmConverter.Extraction
{
    /// <summary>
    /// VRCAvatarDescriptor から変換に必要な情報を SDK 非依存の VrcAvatarInfo に抽出する。
    /// VRChat SDK の型に触るのはこのクラスと Dynamics 配下のみ。
    /// </summary>
    public static class DescriptorExtractor
    {
        // VRChat の eye look 未設定時に使う既定の可動角 [deg]
        private const float DefaultHorizontalDegrees = 12f;
        private const float DefaultVerticalDegrees = 10f;

        public static VrcAvatarInfo Extract(VRCAvatarDescriptor descriptor)
        {
            var info = new VrcAvatarInfo
            {
                ViewPosition = descriptor.ViewPosition,
            };

            if (descriptor.lipSync == VRC_AvatarDescriptor.LipSyncStyle.VisemeBlendShape &&
                descriptor.VisemeSkinnedMesh != null &&
                descriptor.VisemeBlendShapes != null)
            {
                info.VisemeMesh = descriptor.VisemeSkinnedMesh;
                info.VisemeBlendShapes = descriptor.VisemeBlendShapes;
            }

            var eye = descriptor.customEyeLookSettings;
            if (eye.eyelidType == VRCAvatarDescriptor.EyelidType.Blendshapes &&
                eye.eyelidsSkinnedMesh != null &&
                eye.eyelidsBlendshapes != null)
            {
                info.EyelidsMesh = eye.eyelidsSkinnedMesh;
                info.EyelidsBlendShapeIndices = eye.eyelidsBlendshapes;
            }

            info.LeftEye = eye.leftEye;
            info.RightEye = eye.rightEye;
            info.HasEyeLook = descriptor.enableEyeLook && (eye.leftEye != null || eye.rightEye != null);

            if (info.HasEyeLook)
            {
                info.LookUpDegrees = AngleOf(eye.eyesLookingUp, DefaultVerticalDegrees);
                info.LookDownDegrees = AngleOf(eye.eyesLookingDown, DefaultVerticalDegrees);
                // VRChat は内外の区別を持たないため、左右の角度を内外共通で使う
                var horizontal = Mathf.Max(
                    AngleOf(eye.eyesLookingLeft, DefaultHorizontalDegrees),
                    AngleOf(eye.eyesLookingRight, DefaultHorizontalDegrees));
                info.LookHorizontalInnerDegrees = horizontal;
                info.LookHorizontalOuterDegrees = horizontal;
            }
            else
            {
                info.LookUpDegrees = DefaultVerticalDegrees;
                info.LookDownDegrees = DefaultVerticalDegrees;
                info.LookHorizontalInnerDegrees = DefaultHorizontalDegrees;
                info.LookHorizontalOuterDegrees = DefaultHorizontalDegrees;
            }

            return info;
        }

        private static float AngleOf(VRCAvatarDescriptor.EyeRotations rotations, float fallback)
        {
            var angle = Quaternion.Angle(Quaternion.identity, rotations.left);
            if (angle < 0.01f)
            {
                angle = Quaternion.Angle(Quaternion.identity, rotations.right);
            }
            return angle < 0.01f ? fallback : angle;
        }
    }
}
#endif
