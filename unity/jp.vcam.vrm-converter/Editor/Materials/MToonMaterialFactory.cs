using System;
using UnityEngine;
using UnityEngine.Rendering;

namespace VCam.VrmConverter.Materials
{
    public enum MToonBlendMode
    {
        Opaque = 0,
        Cutout = 1,
        Transparent = 2,
    }

    /// <summary>VRM/MToon マテリアルの生成とレンダリングモード設定。</summary>
    public static class MToonMaterialFactory
    {
        public const string ShaderName = "VRM/MToon";

        public static bool ShaderAvailable => Shader.Find(ShaderName) != null;

        public static Material CreateBase(string name)
        {
            var shader = Shader.Find(ShaderName);
            if (shader == null)
            {
                throw new InvalidOperationException(
                    "VRM/MToon シェーダが見つかりません。UniVRM がインストールされているか確認してください。");
            }
            return new Material(shader) { name = name };
        }

        /// <summary>MToon の _BlendMode と関連キーワード・RenderQueue をまとめて設定する。</summary>
        public static void ApplyBlendMode(Material m, MToonBlendMode mode, float cutoff = 0.5f)
        {
            m.SetFloat("_BlendMode", (float)mode);
            switch (mode)
            {
                case MToonBlendMode.Opaque:
                    m.SetFloat("_SrcBlend", (float)BlendMode.One);
                    m.SetFloat("_DstBlend", (float)BlendMode.Zero);
                    m.SetFloat("_ZWrite", 1f);
                    m.DisableKeyword("_ALPHATEST_ON");
                    m.DisableKeyword("_ALPHABLEND_ON");
                    m.renderQueue = -1;
                    break;
                case MToonBlendMode.Cutout:
                    m.SetFloat("_SrcBlend", (float)BlendMode.One);
                    m.SetFloat("_DstBlend", (float)BlendMode.Zero);
                    m.SetFloat("_ZWrite", 1f);
                    m.SetFloat("_Cutoff", Mathf.Clamp01(cutoff));
                    m.EnableKeyword("_ALPHATEST_ON");
                    m.DisableKeyword("_ALPHABLEND_ON");
                    m.renderQueue = (int)RenderQueue.AlphaTest;
                    break;
                case MToonBlendMode.Transparent:
                    m.SetFloat("_SrcBlend", (float)BlendMode.SrcAlpha);
                    m.SetFloat("_DstBlend", (float)BlendMode.OneMinusSrcAlpha);
                    m.SetFloat("_ZWrite", 0f);
                    m.DisableKeyword("_ALPHATEST_ON");
                    m.EnableKeyword("_ALPHABLEND_ON");
                    m.renderQueue = (int)RenderQueue.Transparent;
                    break;
            }
        }
    }
}
