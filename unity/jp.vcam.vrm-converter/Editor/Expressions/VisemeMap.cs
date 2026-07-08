using System.Collections.Generic;

namespace VCam.VrmConverter.Expressions
{
    /// <summary>
    /// VRChat の viseme 15 種。VRC.SDKBase.VRC_AvatarDescriptor.Viseme と同じ並び順
    /// (インデックス互換)。SDK 非依存でテストできるようにミラー定義している。
    /// </summary>
    public enum VrcViseme
    {
        Sil = 0,
        PP = 1,
        FF = 2,
        TH = 3,
        DD = 4,
        Kk = 5,
        CH = 6,
        SS = 7,
        Nn = 8,
        RR = 9,
        Aa = 10,
        E = 11,
        Ih = 12,
        Oh = 13,
        Ou = 14,
    }

    /// <summary>VRM 0.x の母音 BlendShapePreset に対応する 5 母音。</summary>
    public enum VrmVowel
    {
        A,
        I,
        U,
        E,
        O,
    }

    /// <summary>
    /// VRChat viseme 15 種 → VRM 5 母音へのマッピング表。
    /// VRM は 5 母音のみのため、子音系 viseme (sil/PP/FF/...) は変換対象外。
    /// </summary>
    public static class VisemeMap
    {
        public static readonly IReadOnlyDictionary<VrcViseme, VrmVowel> Table =
            new Dictionary<VrcViseme, VrmVowel>
            {
                { VrcViseme.Aa, VrmVowel.A },
                { VrcViseme.Ih, VrmVowel.I },
                { VrcViseme.Ou, VrmVowel.U },
                { VrcViseme.E, VrmVowel.E },
                { VrcViseme.Oh, VrmVowel.O },
            };

        /// <summary>
        /// VRCAvatarDescriptor.VisemeBlendShapes のインデックスから VRM 母音を引く。
        /// 子音系 viseme や範囲外は false。
        /// </summary>
        public static bool TryGetVowel(int visemeIndex, out VrmVowel vowel)
        {
            vowel = default;
            if (visemeIndex < (int)VrcViseme.Sil || visemeIndex > (int)VrcViseme.Ou)
            {
                return false;
            }
            return Table.TryGetValue((VrcViseme)visemeIndex, out vowel);
        }
    }
}
