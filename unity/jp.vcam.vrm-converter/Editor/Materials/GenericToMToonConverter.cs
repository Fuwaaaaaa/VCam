using UnityEngine;

namespace VCam.VrmConverter.Materials
{
    /// <summary>
    /// 未知シェーダの汎用フォールバック。_MainTex / _Color があれば MToon へ、
    /// なければ null を返して元マテリアルを残す (UniVRM の Standard → glTF PBR
    /// フォールバックに委ねる)。Registry の最後に登録すること。
    /// </summary>
    public sealed class GenericToMToonConverter : IMaterialConverter
    {
        public bool CanConvert(Material source)
        {
            return true;
        }

        public Material Convert(Material src, MaterialConversionContext context)
        {
            if (!src.HasProperty("_MainTex") && !src.HasProperty("_Color"))
            {
                context.Report?.AddWarning(
                    $"シェーダ '{src.shader.name}' は変換方法が不明のためそのまま出力します (見た目が変わる可能性): {src.name}",
                    null, src);
                return null;
            }

            var dst = MToonMaterialFactory.CreateBase(src.name + "_MToon");

            var mainColor = src.HasProperty("_Color") ? src.GetColor("_Color") : Color.white;
            dst.SetColor("_Color", mainColor);
            dst.SetColor("_ShadeColor", MToonValueMap.ShadeColorFallback(mainColor));

            if (src.HasProperty("_MainTex"))
            {
                var tex = src.GetTexture("_MainTex");
                if (tex != null)
                {
                    dst.SetTexture("_MainTex", tex);
                    dst.SetTexture("_ShadeTexture", tex);
                    dst.SetTextureScale("_MainTex", src.GetTextureScale("_MainTex"));
                    dst.SetTextureOffset("_MainTex", src.GetTextureOffset("_MainTex"));
                }
            }

            if (src.HasProperty("_BumpMap"))
            {
                var bump = src.GetTexture("_BumpMap");
                if (bump != null)
                {
                    dst.SetTexture("_BumpMap", bump);
                    dst.EnableKeyword("_NORMALMAP");
                }
            }

            if (src.renderQueue >= 3000)
            {
                MToonMaterialFactory.ApplyBlendMode(dst, MToonBlendMode.Transparent);
            }
            else if (src.renderQueue >= 2450)
            {
                var cutoff = src.HasProperty("_Cutoff") ? src.GetFloat("_Cutoff") : 0.5f;
                MToonMaterialFactory.ApplyBlendMode(dst, MToonBlendMode.Cutout, cutoff);
            }
            else
            {
                MToonMaterialFactory.ApplyBlendMode(dst, MToonBlendMode.Opaque);
            }

            context.Report?.AddInfo($"シェーダ '{src.shader.name}' を汎用変換しました: {src.name}", src);
            return dst;
        }
    }
}
