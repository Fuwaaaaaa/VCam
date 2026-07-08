using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace VCam.VrmConverter.Materials
{
    /// <summary>
    /// アバター内の全 Renderer のマテリアルを MToon に変換して差し替える。
    /// 同一マテリアルは 1 回だけ変換して共有する。変換後マテリアルは AssetDir に保存。
    /// </summary>
    public static class MaterialConverterRegistry
    {
        // 既に VRM 互換のため変換不要なシェーダ
        private static readonly string[] PassThroughShaders =
        {
            "VRM/MToon",
            "VRM/UnlitTexture",
            "VRM/UnlitTransparent",
            "VRM/UnlitCutout",
            "UniGLTF/UniUnlit",
            "Standard",
        };

        private static readonly IMaterialConverter[] Converters =
        {
            new LilToonToMToonConverter(),
            new PoiyomiToMToonConverter(),
            new GenericToMToonConverter(), // 必ず最後 (CanConvert が常に true)
        };

        public static void ConvertAll(GameObject avatar, MaterialConversionContext context)
        {
            EnsureFolder(context.AssetDir);
            var cache = new Dictionary<Material, Material>();

            foreach (var renderer in avatar.GetComponentsInChildren<Renderer>(true))
            {
                var materials = renderer.sharedMaterials;
                var changed = false;
                for (var i = 0; i < materials.Length; i++)
                {
                    var src = materials[i];
                    if (src == null || src.shader == null)
                    {
                        continue;
                    }
                    if (IsPassThrough(src))
                    {
                        continue;
                    }

                    if (!cache.TryGetValue(src, out var converted))
                    {
                        converted = ConvertOne(src, context);
                        cache[src] = converted; // null (変換不能) もキャッシュして警告の重複を防ぐ
                    }
                    if (converted != null)
                    {
                        materials[i] = converted;
                        changed = true;
                    }
                }
                if (changed)
                {
                    renderer.sharedMaterials = materials;
                }
            }
            AssetDatabase.SaveAssets();
        }

        private static bool IsPassThrough(Material src)
        {
            foreach (var name in PassThroughShaders)
            {
                if (src.shader.name == name)
                {
                    return true;
                }
            }
            return false;
        }

        private static Material ConvertOne(Material src, MaterialConversionContext context)
        {
            foreach (var converter in Converters)
            {
                if (!converter.CanConvert(src))
                {
                    continue;
                }
                var converted = converter.Convert(src, context);
                if (converted == null)
                {
                    return null;
                }
                var path = AssetDatabase.GenerateUniqueAssetPath(
                    $"{context.AssetDir}/{Sanitize(src.name)}_MToon.mat");
                AssetDatabase.CreateAsset(converted, path);
                return converted;
            }
            return null;
        }

        private static string Sanitize(string name)
        {
            foreach (var c in Path.GetInvalidFileNameChars())
            {
                name = name.Replace(c, '_');
            }
            return name;
        }

        /// <summary>"Assets/Foo/Bar" 形式のフォルダを再帰的に作成する。</summary>
        public static void EnsureFolder(string folder)
        {
            if (AssetDatabase.IsValidFolder(folder))
            {
                return;
            }
            var parts = folder.Split('/');
            var current = parts[0]; // "Assets"
            for (var i = 1; i < parts.Length; i++)
            {
                var next = current + "/" + parts[i];
                if (!AssetDatabase.IsValidFolder(next))
                {
                    AssetDatabase.CreateFolder(current, parts[i]);
                }
                current = next;
            }
        }
    }
}
