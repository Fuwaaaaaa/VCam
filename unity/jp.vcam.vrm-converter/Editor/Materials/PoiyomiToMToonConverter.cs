using UnityEngine;

namespace VCam.VrmConverter.Materials
{
    /// <summary>
    /// Poiyomi → MToon の最小変換 (メインテクスチャ/色/ノーマル/エミッション/カットアウトのみ)。
    /// Poiyomi はプロパティ集合の変動が大きいため、コンパイル時依存を持たず
    /// シェーダ名の文字列判定 + HasProperty のみで扱う。
    /// ロック済み (Hidden/Locked/...) は AvatarValidator が事前に Error にしている。
    /// </summary>
    public sealed class PoiyomiToMToonConverter : IMaterialConverter
    {
        public bool CanConvert(Material source)
        {
            var name = source.shader != null ? source.shader.name.ToLowerInvariant() : "";
            return name.Contains("poiyomi");
        }

        public Material Convert(Material src, MaterialConversionContext context)
        {
            if (src.shader.name.StartsWith("Hidden/Locked/"))
            {
                context.Report?.AddError(
                    $"Poiyomi マテリアルがロックされています: {src.name}",
                    "Thry エディタで Unlock Material(s) してから再実行してください。",
                    src);
                return null;
            }

            var dst = MToonMaterialFactory.CreateBase(src.name + "_MToon");

            var mainColor = GetColor(src, "_Color", Color.white);
            dst.SetColor("_Color", mainColor);
            dst.SetColor("_ShadeColor", MToonValueMap.ShadeColorFallback(mainColor));

            var mainTex = GetTexture(src, "_MainTex");
            if (mainTex != null)
            {
                dst.SetTexture("_MainTex", mainTex);
                dst.SetTexture("_ShadeTexture", mainTex);
                dst.SetTextureScale("_MainTex", src.GetTextureScale("_MainTex"));
                dst.SetTextureOffset("_MainTex", src.GetTextureOffset("_MainTex"));
            }

            var bump = GetTexture(src, "_BumpMap");
            if (bump != null)
            {
                dst.SetTexture("_BumpMap", bump);
                dst.EnableKeyword("_NORMALMAP");
            }

            var emissionTex = GetTexture(src, "_EmissionMap");
            var emissionColor = GetColor(src, "_EmissionColor", Color.black);
            if (emissionTex != null || emissionColor.maxColorComponent > 0.01f)
            {
                dst.SetColor("_EmissionColor", emissionColor);
                if (emissionTex != null)
                {
                    dst.SetTexture("_EmissionMap", emissionTex);
                }
            }

            // レンダリングモードは RenderQueue から推定 (Poiyomi はモードプロパティが版で異なる)
            if (src.renderQueue >= 3000)
            {
                MToonMaterialFactory.ApplyBlendMode(dst, MToonBlendMode.Transparent);
            }
            else if (src.renderQueue >= 2450 || (src.HasProperty("_Cutoff") && src.IsKeywordEnabled("_ALPHATEST_ON")))
            {
                MToonMaterialFactory.ApplyBlendMode(dst, MToonBlendMode.Cutout, GetFloat(src, "_Cutoff", 0.5f));
            }
            else
            {
                MToonMaterialFactory.ApplyBlendMode(dst, MToonBlendMode.Opaque);
            }

            context.Report?.AddWarning(
                $"Poiyomi マテリアルは最小限の近似変換です (影/リム/装飾系は省略): {src.name}",
                null, src);

            return dst;
        }

        private static float GetFloat(Material m, string prop, float fallback)
            => m.HasProperty(prop) ? m.GetFloat(prop) : fallback;

        private static Color GetColor(Material m, string prop, Color fallback)
            => m.HasProperty(prop) ? m.GetColor(prop) : fallback;

        private static Texture GetTexture(Material m, string prop)
            => m.HasProperty(prop) ? m.GetTexture(prop) : null;
    }
}
