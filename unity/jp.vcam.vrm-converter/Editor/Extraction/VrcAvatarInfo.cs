using UnityEngine;

namespace VCam.VrmConverter.Extraction
{
    /// <summary>
    /// VRCAvatarDescriptor から抽出した、変換に必要な情報。
    /// VRChat SDK の型を持たない plain なコンテナにすることで、
    /// 下流 (ExpressionMapper 等) を SDK 非依存に保つ。
    /// </summary>
    public sealed class VrcAvatarInfo
    {
        // --- リップシンク ---
        public SkinnedMeshRenderer VisemeMesh;
        /// <summary>VRC viseme 15 種に対応する BlendShape 名 (インデックスは VrcViseme と同順)。未設定なら null。</summary>
        public string[] VisemeBlendShapes;

        // --- まばたき ---
        public SkinnedMeshRenderer EyelidsMesh;
        /// <summary>[0]=blink, [1]=lookingUp, [2]=lookingDown の BlendShape インデックス。未設定なら null。-1 は未割当。</summary>
        public int[] EyelidsBlendShapeIndices;

        // --- 視線 ---
        public bool HasEyeLook;
        public Transform LeftEye;
        public Transform RightEye;
        /// <summary>視線の可動角 [deg]。未設定 (HasEyeLook=false) のときは既定値を使う。</summary>
        public float LookUpDegrees;
        public float LookDownDegrees;
        public float LookHorizontalInnerDegrees;
        public float LookHorizontalOuterDegrees;

        // --- 一人称視点 ---
        public Vector3 ViewPosition; // アバタールートのローカル座標
    }
}
