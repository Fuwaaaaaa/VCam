using VCam.VrmConverter.Dynamics;

namespace VCam.VrmConverter
{
    /// <summary>ウィザードで指定する変換オプション一式。</summary>
    public sealed class ConversionSettings
    {
        // --- VRM メタ情報 ---
        public string Title = "";
        public string Version = "1.0";
        public string Author = "";

        // --- 変換オプション ---
        public bool ConvertMaterials = true;
        public bool ConvertPhysBones = true;

        /// <summary>エクスポート後も変換済み複製をシーンに残す (目視検証用)。</summary>
        public bool KeepConvertedCopyInScene = true;

        public SpringBoneMapSettings SpringBone = SpringBoneMapSettings.Default;

        /// <summary>生成アセット (マテリアル・BlendShapeClip) の保存先ルート。</summary>
        public string WorkFolderRoot = "Assets/VCamVrmWork";
    }
}
