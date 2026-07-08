using System.Collections.Generic;
using System.Linq;

namespace VCam.VrmConverter.Validation
{
    public enum Severity
    {
        Info,
        Warning,
        Error,
    }

    public sealed class ValidationItem
    {
        public Severity Severity;
        public string Message;
        public string FixHint;
        public UnityEngine.Object Context;
    }

    /// <summary>変換前チェックと変換中の警告を集約するレポート。Error が 1 件でもあれば変換に進めない。</summary>
    public sealed class ValidationReport
    {
        public readonly List<ValidationItem> Items = new List<ValidationItem>();

        public bool HasErrors => Items.Any(i => i.Severity == Severity.Error);
        public int WarningCount => Items.Count(i => i.Severity == Severity.Warning);

        public void AddError(string message, string fixHint = null, UnityEngine.Object context = null)
        {
            Items.Add(new ValidationItem { Severity = Severity.Error, Message = message, FixHint = fixHint, Context = context });
        }

        public void AddWarning(string message, string fixHint = null, UnityEngine.Object context = null)
        {
            Items.Add(new ValidationItem { Severity = Severity.Warning, Message = message, FixHint = fixHint, Context = context });
        }

        public void AddInfo(string message, UnityEngine.Object context = null)
        {
            Items.Add(new ValidationItem { Severity = Severity.Info, Message = message, Context = context });
        }
    }
}
