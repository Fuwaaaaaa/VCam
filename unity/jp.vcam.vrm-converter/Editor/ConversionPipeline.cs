using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using VCam.VrmConverter.Validation;

#if VCAM_HAS_VRCSDK && VCAM_HAS_UNIVRM0
using UnityEditor;
using VCam.VrmConverter.Dynamics;
using VCam.VrmConverter.Export;
using VCam.VrmConverter.Expressions;
using VCam.VrmConverter.Extraction;
using VCam.VrmConverter.Materials;
using VRC.SDK3.Avatars.Components;
#endif

namespace VCam.VrmConverter
{
    public sealed class ConversionResult
    {
        public bool Success;
        /// <summary>シーンに残した変換済み複製 (KeepConvertedCopyInScene が false なら null)。</summary>
        public GameObject ConvertedCopy;
        public string ExportPath;
        public readonly List<string> Errors = new List<string>();
    }

    /// <summary>
    /// 変換の全体オーケストレーション。元アバターには一切触れず、複製に対して
    /// 表情マッピング → マテリアル変換 → PhysBone 変換 → VRC 除去 → エクスポート
    /// の順で適用する。途中失敗はステージ名付きで Errors に集約。
    /// </summary>
    public static class ConversionPipeline
    {
        public static ConversionResult Run(
            GameObject source, ConversionSettings settings, string savePath, ValidationReport report)
        {
            var result = new ConversionResult { ExportPath = savePath };
#if VCAM_HAS_VRCSDK && VCAM_HAS_UNIVRM0
            GameObject copy = null;
            var stage = "前回複製の掃除";
            try
            {
                // 前回変換の複製が残っていると、この後の作業フォルダ削除で
                // 参照するマテリアル / BlendShapeClip が missing になるため先に取り除く
                RemovePreviousCopies(source, report);

                stage = "アバターの複製";
                copy = UnityEngine.Object.Instantiate(source);
                copy.name = source.name + "_VRM";
                copy.SetActive(true);

                stage = "作業フォルダの準備";
                var assetDir = $"{settings.WorkFolderRoot}/{Sanitize(source.name)}";
                if (AssetDatabase.IsValidFolder(assetDir))
                {
                    AssetDatabase.DeleteAsset(assetDir);
                }
                MaterialConverterRegistry.EnsureFolder(assetDir);

                stage = "VRCAvatarDescriptor の抽出";
                var descriptor = copy.GetComponent<VRCAvatarDescriptor>();
                if (descriptor == null)
                {
                    throw new InvalidOperationException("VRCAvatarDescriptor が見つかりません。");
                }
                var info = DescriptorExtractor.Extract(descriptor);

                stage = "表情 (BlendShapeClip) の生成";
                ExpressionMapper.Apply(copy, info, $"{assetDir}/BlendShapes", report);

                if (settings.ConvertMaterials)
                {
                    stage = "マテリアル変換";
                    MaterialConverterRegistry.ConvertAll(copy, new MaterialConversionContext
                    {
                        AssetDir = $"{assetDir}/Materials",
                        Report = report,
                    });
                }

                if (settings.ConvertPhysBones)
                {
                    stage = "PhysBone → SpringBone 変換";
                    PhysBoneToSpringBoneConverter.ConvertAll(copy, settings.SpringBone, report);
                }

                stage = "VRChat コンポーネントの除去";
                VrcComponentStripper.Strip(copy);

                stage = "VRM エクスポート";
                VrmExportRunner.Export(copy, settings, savePath);

                result.Success = File.Exists(savePath);
                if (!result.Success)
                {
                    result.Errors.Add("エクスポートは完了しましたが .vrm ファイルが見つかりません。");
                }

                if (result.Success && settings.KeepConvertedCopyInScene)
                {
                    result.ConvertedCopy = copy;
                }
                else if (copy != null)
                {
                    UnityEngine.Object.DestroyImmediate(copy);
                }
                return result;
            }
            catch (Exception e)
            {
                Debug.LogException(e);
                result.Errors.Add($"「{stage}」で失敗しました: {e.Message}");
                if (copy != null)
                {
                    UnityEngine.Object.DestroyImmediate(copy);
                }
                return result;
            }
#else
            result.Errors.Add("VRChat SDK3 Avatars と UniVRM の両方がインストールされている必要があります。");
            return result;
#endif
        }

#if VCAM_HAS_VRCSDK && VCAM_HAS_UNIVRM0
        private static void RemovePreviousCopies(GameObject source, ValidationReport report)
        {
            if (!source.scene.IsValid())
            {
                return;
            }
            var copyName = source.name + "_VRM";
            foreach (var root in source.scene.GetRootGameObjects())
            {
                if (root != source && root.name == copyName)
                {
                    UnityEngine.Object.DestroyImmediate(root);
                    report.AddInfo($"前回の変換済み複製 '{copyName}' をシーンから削除しました (作業フォルダの再生成で参照が壊れるため)。");
                }
            }
        }
#endif

        private static string Sanitize(string name)
        {
            foreach (var c in Path.GetInvalidFileNameChars())
            {
                name = name.Replace(c, '_');
            }
            return name;
        }
    }
}
