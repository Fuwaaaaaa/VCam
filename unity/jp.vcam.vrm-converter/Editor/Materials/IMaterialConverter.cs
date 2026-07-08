using UnityEngine;
using VCam.VrmConverter.Validation;

namespace VCam.VrmConverter.Materials
{
    public sealed class MaterialConversionContext
    {
        /// <summary>変換後マテリアルの保存先 (例: Assets/VCamVrmWork/MyAvatar/Materials)。</summary>
        public string AssetDir;
        public ValidationReport Report;
    }

    /// <summary>
    /// VRChat 系シェーダのマテリアルを MToon (VRM/MToon) に近似変換するコンバータ。
    /// MaterialConverterRegistry に登録順 (具体的なもの → 汎用) で評価される。
    /// </summary>
    public interface IMaterialConverter
    {
        /// <summary>このコンバータが対象とするマテリアルか (シェーダ名で判定)。</summary>
        bool CanConvert(Material source);

        /// <summary>
        /// 変換後の新しいマテリアルを返す。変換できない場合は null
        /// (呼び出し側は元マテリアルを残し、UniVRM の Standard フォールバックに委ねる)。
        /// </summary>
        Material Convert(Material source, MaterialConversionContext context);
    }
}
