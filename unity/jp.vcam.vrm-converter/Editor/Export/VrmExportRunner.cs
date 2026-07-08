#if VCAM_HAS_UNIVRM0
using UnityEngine;
using VRM;

namespace VCam.VrmConverter.Export
{
    /// <summary>
    /// UniVRM のエクスポート API 呼び出しをこの 1 ファイルに隔離する。
    /// UniVRM のバージョン更新で API が変わった場合はここだけ直せばよい。
    /// 検証済みバージョン: UniVRM v0.128.x (package README に記載)。
    /// </summary>
    public static class VrmExportRunner
    {
        public static void Export(GameObject avatar, ConversionSettings settings, string savePath)
        {
            ApplyMeta(avatar, settings);

            var exportSettings = ScriptableObject.CreateInstance<VRMExportSettings>();
            exportSettings.InitializeFrom(avatar);
            // PoseFreeze: T-pose 強制 + 回転/スケールの焼き込み (VRM0 の正規化階層を生成)。
            // VRChat アバターは初期ポーズ・スケールが乱れていることが多いため必須。
            exportSettings.PoseFreeze = true;

            VRMEditorExporter.Export(savePath, avatar, exportSettings);
        }

        private static void ApplyMeta(GameObject avatar, ConversionSettings settings)
        {
            var meta = avatar.GetComponent<VRMMeta>() ?? avatar.AddComponent<VRMMeta>();
            var metaObject = ScriptableObject.CreateInstance<VRMMetaObject>();
            metaObject.Title = string.IsNullOrEmpty(settings.Title) ? avatar.name : settings.Title;
            metaObject.Version = settings.Version ?? "";
            metaObject.Author = settings.Author ?? "";
            metaObject.ContactInformation = "";
            metaObject.Reference = "";
            metaObject.OtherLicenseUrl = "";
            // 既定は最も保守的なライセンス (改変アバターの再配布事故防止)。
            metaObject.LicenseType = LicenseType.Redistribution_Prohibited;
            metaObject.AllowedUser = AllowedUser.OnlyAuthor;
            metaObject.ViolentUssage = UssageLicense.Disallow;
            metaObject.SexualUssage = UssageLicense.Disallow;
            metaObject.CommercialUssage = UssageLicense.Disallow;
            meta.Meta = metaObject;
        }
    }
}
#endif
