using UnityEngine;

namespace VCam.VrmConverter.Dynamics
{
    /// <summary>VRCPhysBone から抽出したパラメータ (SDK 非依存のミラー)。</summary>
    public struct PhysBoneParams
    {
        public float Pull;        // 0..1
        public float Spring;      // 0..1
        public float Gravity;     // -1..1
        public float Immobile;    // 0..1
        public float Radius;      // ワールドスケール換算済みの半径 [m]
        public bool ImmobileWorld; // ImmobileType == World
        public bool HasLimit;      // LimitType != None
        public float LimitAngle;   // maxAngleX [deg] (HasLimit のときのみ有効)
    }

    /// <summary>VRMSpringBone に設定する値。</summary>
    public struct SpringBoneParams
    {
        public float Stiffness;    // m_stiffnessForce (0..4)
        public float Drag;         // m_dragForce (0..1)
        public float GravityPower; // m_gravityPower
        public float HitRadius;    // m_hitRadius
        /// <summary>limit angle 0 (完全固定) のチェーンは SpringBone を生成しない。</summary>
        public bool Skip;
    }

    /// <summary>変換係数。ウィザードの詳細設定から調整できる。</summary>
    public struct SpringBoneMapSettings
    {
        /// <summary>pull → stiffness の係数 (esperecyan/UniVRMExtensions の実績値 4.0)。</summary>
        public float PullToStiffness;

        /// <summary>gravity → gravityPower の係数 (実績値 20.0)。</summary>
        public float GravityFactor;

        /// <summary>
        /// true なら drag = 1 - spring。PhysBone の Spring は「揺れの戻りやすさ」、
        /// SpringBone の drag は「減衰」で概念が逆方向のため、揺れすぎる場合に切り替える。
        /// </summary>
        public bool InvertSpring;

        public static SpringBoneMapSettings Default => new SpringBoneMapSettings
        {
            PullToStiffness = 4f,
            GravityFactor = 20f,
            InvertSpring = false,
        };
    }

    /// <summary>
    /// VRCPhysBone → VRMSpringBone のパラメータ近似変換 (pure 関数)。
    /// 計算モデルが根本的に異なるため同一の揺れにはならない。係数は
    /// SpringBoneMapSettings で調整可能。
    /// </summary>
    public static class SpringBoneParameterMap
    {
        public static SpringBoneParams Map(PhysBoneParams p, SpringBoneMapSettings s)
        {
            if (p.HasLimit && p.LimitAngle <= 0f)
            {
                // 可動角 0 = 完全固定。SpringBone を作らない方が忠実。
                return new SpringBoneParams { Skip = true };
            }

            var limitCoef = p.HasLimit ? Mathf.Clamp01(p.LimitAngle / 180f) : 1f;

            var spring = s.InvertSpring ? 1f - p.Spring : p.Spring;
            var stiffness = Mathf.Clamp((p.Pull * s.PullToStiffness + p.Immobile) * limitCoef, 0f, 4f);
            var drag = Mathf.Clamp01((spring + p.Immobile) * limitCoef);

            return new SpringBoneParams
            {
                Stiffness = stiffness,
                Drag = drag,
                GravityPower = Mathf.Max(0f, p.Gravity * s.GravityFactor),
                HitRadius = Mathf.Max(0f, p.Radius),
                Skip = false,
            };
        }
    }
}
