using UnityEngine;

namespace VCam.VrmConverter.Materials
{
    /// <summary>
    /// lilToon → MToon の近似変換。
    /// プロパティ名は lilToon の lts.shader 系列に基づく。バージョン差異を吸収するため
    /// すべて HasProperty ガード付きで読む。
    /// </summary>
    public sealed class LilToonToMToonConverter : IMaterialConverter
    {
        public bool CanConvert(Material source)
        {
            var name = source.shader != null ? source.shader.name.ToLowerInvariant() : "";
            return name.Contains("liltoon");
        }

        public Material Convert(Material src, MaterialConversionContext context)
        {
            var shaderName = src.shader.name.ToLowerInvariant();
            var report = context.Report;

            if (shaderName.Contains("fur") || shaderName.Contains("refraction") ||
                shaderName.Contains("gem") || shaderName.Contains("fakeshadow"))
            {
                report?.AddWarning(
                    $"lilToon の特殊バリアント ({src.shader.name}) は MToon で再現できません。基本プロパティのみ変換します: {src.name}",
                    null, src);
            }

            var dst = MToonMaterialFactory.CreateBase(src.name + "_MToon");

            // --- メインカラー ---
            var mainColor = GetColor(src, "_Color", Color.white);
            dst.SetColor("_Color", mainColor);
            var mainTex = GetTexture(src, "_MainTex");
            if (mainTex != null)
            {
                dst.SetTexture("_MainTex", mainTex);
                dst.SetTextureScale("_MainTex", src.GetTextureScale("_MainTex"));
                dst.SetTextureOffset("_MainTex", src.GetTextureOffset("_MainTex"));
            }

            // --- 影 ---
            var useShadow = GetFloat(src, "_UseShadow", 1f) > 0.5f;
            if (useShadow)
            {
                var shadeColor = src.HasProperty("_ShadowColor")
                    ? GetColor(src, "_ShadowColor", MToonValueMap.ShadeColorFallback(mainColor))
                    : MToonValueMap.ShadeColorFallback(mainColor);
                dst.SetColor("_ShadeColor", shadeColor);

                var shadeTex = GetTexture(src, "_ShadowColorTex");
                if (shadeTex != null)
                {
                    dst.SetTexture("_ShadeTexture", shadeTex);
                }
                else if (mainTex != null)
                {
                    // 影テクスチャが無い場合はメインテクスチャ × 影色で陰影が付くようにする
                    dst.SetTexture("_ShadeTexture", mainTex);
                }

                dst.SetFloat("_ShadeShift", MToonValueMap.ShadeShiftFromShadowBorder(GetFloat(src, "_ShadowBorder", 0.5f)));
                dst.SetFloat("_ShadeToony", MToonValueMap.ShadeToonyFromShadowBlur(GetFloat(src, "_ShadowBlur", 0.1f)));

                if (src.HasProperty("_Shadow2ndColor") && GetColor(src, "_Shadow2ndColor", Color.clear).a > 0.01f)
                {
                    report?.AddWarning($"2 影目 (階調影) は MToon 非対応のため 1 影のみ変換します: {src.name}", null, src);
                }
            }
            else
            {
                // 影なし設定 → 影色 = 主色 (陰影が出ない近似)
                dst.SetColor("_ShadeColor", mainColor);
                if (mainTex != null)
                {
                    dst.SetTexture("_ShadeTexture", mainTex);
                }
            }

            // --- ノーマルマップ ---
            if (GetFloat(src, "_UseBumpMap", 0f) > 0.5f)
            {
                var bump = GetTexture(src, "_BumpMap");
                if (bump != null)
                {
                    dst.SetTexture("_BumpMap", bump);
                    dst.SetFloat("_BumpScale", GetFloat(src, "_BumpScale", 1f));
                    dst.EnableKeyword("_NORMALMAP");
                }
            }

            // --- エミッション ---
            if (GetFloat(src, "_UseEmission", 0f) > 0.5f)
            {
                var emissionColor = MToonValueMap.EmissionColor(
                    GetColor(src, "_EmissionColor", Color.black),
                    GetFloat(src, "_EmissionBlend", 1f));
                dst.SetColor("_EmissionColor", emissionColor);
                var emissionMap = GetTexture(src, "_EmissionMap");
                if (emissionMap != null)
                {
                    dst.SetTexture("_EmissionMap", emissionMap);
                }
            }

            // --- リムライト ---
            if (GetFloat(src, "_UseRim", 0f) > 0.5f)
            {
                dst.SetColor("_RimColor", GetColor(src, "_RimColor", Color.white));
                dst.SetFloat("_RimFresnelPower", GetFloat(src, "_RimFresnelPower", 3f));
                dst.SetFloat("_RimLift", MToonValueMap.RimLiftFromRimBorder(GetFloat(src, "_RimBorder", 0.5f)));
                dst.SetFloat("_RimLightingMix", 1f);
            }
            else
            {
                dst.SetColor("_RimColor", Color.black);
            }

            // --- MatCap (加算系のみ) ---
            if (GetFloat(src, "_UseMatCap", 0f) > 0.5f)
            {
                // lilToon の _MatCapBlendMode: 0=Normal, 1=Add, 2=Screen, 3=Multiply
                var blendMode = (int)GetFloat(src, "_MatCapBlendMode", 0f);
                var matCap = GetTexture(src, "_MatCapTex");
                if (matCap != null && (blendMode == 1 || blendMode == 2))
                {
                    dst.SetTexture("_SphereAdd", matCap);
                }
                else if (matCap != null)
                {
                    report?.AddWarning($"乗算/通常合成の MatCap は MToon 非対応のため省略しました: {src.name}", null, src);
                }
            }

            // --- アウトライン ---
            if (shaderName.Contains("outline"))
            {
                dst.SetColor("_OutlineColor", GetColor(src, "_OutlineColor", new Color(0.2f, 0.2f, 0.2f)));
                dst.SetFloat("_OutlineWidth", GetFloat(src, "_OutlineWidth", 0.05f)); // 両者とも cm 単位相当。差があれば QA で係数調整
                var widthMask = GetTexture(src, "_OutlineWidthMask");
                if (widthMask != null)
                {
                    dst.SetTexture("_OutlineWidthTexture", widthMask);
                }
                dst.SetFloat("_OutlineWidthMode", 1f);  // WorldCoordinates
                dst.SetFloat("_OutlineColorMode", 0f);  // FixedColor
                dst.SetFloat("_OutlineLightingMix", 1f);
                dst.EnableKeyword("MTOON_OUTLINE_WIDTH_WORLD");
                dst.EnableKeyword("MTOON_OUTLINE_COLOR_FIXED");
            }

            // --- カリング ---
            if (src.HasProperty("_Cull"))
            {
                dst.SetFloat("_CullMode", GetFloat(src, "_Cull", 2f));
            }

            // --- レンダリングモード ---
            ApplyRenderingMode(src, dst, shaderName);

            // --- 非対応機能の警告 ---
            if (src.HasProperty("_MainTexHSVG"))
            {
                var hsvg = src.GetVector("_MainTexHSVG");
                if ((hsvg - new Vector4(0f, 1f, 1f, 1f)).sqrMagnitude > 1e-4f)
                {
                    report?.AddWarning(
                        $"色相/彩度補正 (_MainTexHSVG) は変換されません。lilToon の「テクスチャ焼き込み」を使ってから変換すると再現できます: {src.name}",
                        null, src);
                }
            }
            if (GetFloat(src, "_UseMain2ndTex", 0f) > 0.5f || GetFloat(src, "_UseMain3rdTex", 0f) > 0.5f)
            {
                report?.AddWarning($"2nd/3rd メインカラー・デカールは MToon 非対応のため省略しました: {src.name}", null, src);
            }

            return dst;
        }

        private static void ApplyRenderingMode(Material src, Material dst, string shaderName)
        {
            // lilToon はシェーダバリアント名と _TransparentMode の両方にモード情報を持つ
            var mode = (int)GetFloat(src, "_TransparentMode", -1f);
            if (shaderName.Contains("cutout") || mode == 1)
            {
                MToonMaterialFactory.ApplyBlendMode(dst, MToonBlendMode.Cutout, GetFloat(src, "_Cutoff", 0.5f));
            }
            else if (shaderName.Contains("transparent") || mode >= 2)
            {
                MToonMaterialFactory.ApplyBlendMode(dst, MToonBlendMode.Transparent);
            }
            else
            {
                MToonMaterialFactory.ApplyBlendMode(dst, MToonBlendMode.Opaque);
            }
        }

        private static float GetFloat(Material m, string prop, float fallback)
            => m.HasProperty(prop) ? m.GetFloat(prop) : fallback;

        private static Color GetColor(Material m, string prop, Color fallback)
            => m.HasProperty(prop) ? m.GetColor(prop) : fallback;

        private static Texture GetTexture(Material m, string prop)
            => m.HasProperty(prop) ? m.GetTexture(prop) : null;
    }
}
