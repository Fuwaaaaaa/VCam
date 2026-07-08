using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace VCam.VrmConverter.Expressions
{
    public enum BlinkSide
    {
        Left,
        Right,
    }

    /// <summary>
    /// 片目まばたき (Blink_L / Blink_R) 用 BlendShape を名前ヒューリスティックで探す。
    /// VRChat の Eyelids 設定は両目同時の blink しか持たないため、片目分は
    /// メッシュの BlendShape 名から推定する。見つからない場合は呼び出し側で
    /// combined blink にフォールバックする。
    /// </summary>
    public static class BlinkShapeNameMatcher
    {
        // 小文字化した名前に対して順に試す。先頭のパターンほど優先。
        private static readonly string[] LeftPatterns =
        {
            @"^(eye[\s_.-]*)?blink[\s_.-]*l(eft)?$",
            @"^eye[\s_.-]*close[\s_.-]*l(eft)?$",
            @"^wink[\s_.-]*l(eft)?$",
            @"^wink$",                       // MMD 系: 「ウィンク」は左
            @"^ウィンク$",
            @"^ウィンク2$",
            @"まばたき.*左",
            @"^左目.*(閉|つぶ)",
        };

        private static readonly string[] RightPatterns =
        {
            @"^(eye[\s_.-]*)?blink[\s_.-]*r(ight)?$",
            @"^eye[\s_.-]*close[\s_.-]*r(ight)?$",
            @"^wink[\s_.-]*r(ight)?$",
            @"^ウィンク右$",
            @"^ｳｨﾝｸ右$",
            @"^ウィンク2右$",
            @"まばたき.*右",
            @"^右目.*(閉|つぶ)",
        };

        /// <summary>
        /// BlendShape 名一覧から指定サイドのまばたき形状名を返す。見つからなければ null。
        /// </summary>
        public static string Find(IEnumerable<string> shapeNames, BlinkSide side)
        {
            var patterns = side == BlinkSide.Left ? LeftPatterns : RightPatterns;
            var names = shapeNames.ToList();
            foreach (var pattern in patterns)
            {
                var regex = new Regex(pattern, RegexOptions.IgnoreCase);
                var hit = names.FirstOrDefault(n => regex.IsMatch(n.Trim().ToLowerInvariant()));
                if (hit != null)
                {
                    return hit;
                }
            }
            return null;
        }
    }
}
