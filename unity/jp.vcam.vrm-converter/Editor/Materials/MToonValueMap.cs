using UnityEngine;

namespace VCam.VrmConverter.Materials
{
    /// <summary>
    /// lilToon 等のプロパティ値 → MToon プロパティ値の数値変換 (pure 関数)。
    /// Material 読み書きから分離して Unity 非依存でテストできるようにしている。
    /// </summary>
    public static class MToonValueMap
    {
        /// <summary>lilToon _ShadowBorder (0..1) → MToon _ShadeShift (-1..1)。</summary>
        public static float ShadeShiftFromShadowBorder(float border)
        {
            return Mathf.Clamp(border * 2f - 1f, -1f, 1f);
        }

        /// <summary>lilToon _ShadowBlur (0..1) → MToon _ShadeToony (0..1)。blur が強いほど toony は弱い。</summary>
        public static float ShadeToonyFromShadowBlur(float blur)
        {
            return Mathf.Clamp01(1f - blur);
        }

        /// <summary>影色プロパティが無い場合のフォールバック: 主色 × 0.75 (alpha は維持)。</summary>
        public static Color ShadeColorFallback(Color main)
        {
            return new Color(main.r * 0.75f, main.g * 0.75f, main.b * 0.75f, main.a);
        }

        /// <summary>lilToon _RimBorder (0..1) → MToon _RimLift の近似。</summary>
        public static float RimLiftFromRimBorder(float border)
        {
            return Mathf.Clamp01(border - 0.5f);
        }

        /// <summary>lilToon の emission 最終色: _EmissionColor × _EmissionBlend。</summary>
        public static Color EmissionColor(Color emission, float blend)
        {
            var b = Mathf.Clamp01(blend);
            return new Color(emission.r * b, emission.g * b, emission.b * b, emission.a);
        }
    }
}
