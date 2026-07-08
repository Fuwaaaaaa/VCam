using UnityEditor;
using UnityEngine;
using VCam.VrmConverter.Validation;

namespace VCam.VrmConverter
{
    /// <summary>
    /// VRChat アバター → VRM 変換ウィザード。
    /// アバター選択 → ライセンス確認 → 検証 → 設定 → 変換&保存 の順に進む。
    /// </summary>
    public sealed class ConverterWindow : EditorWindow
    {
        private const string LicenseSessionKey = "VCam.VrmConverter.LicenseAccepted";

        private GameObject _avatar;
        private ValidationReport _report;
        private ConversionResult _lastResult;
        private readonly ConversionSettings _settings = new ConversionSettings();
        private Vector2 _scroll;
        private bool _advancedFoldout;

        [MenuItem("VCam/VRChat → VRM 変換ウィザード...")]
        public static void Open()
        {
            var window = GetWindow<ConverterWindow>("VCam VRM Converter");
            window.minSize = new Vector2(420f, 480f);
        }

        private static bool LicenseAccepted
        {
            get => SessionState.GetBool(LicenseSessionKey, false);
            set => SessionState.SetBool(LicenseSessionKey, value);
        }

        private void OnGUI()
        {
            _scroll = EditorGUILayout.BeginScrollView(_scroll);

            DrawDependencyState();
            DrawAvatarSection();
            DrawLicenseSection();

            using (new EditorGUI.DisabledScope(_avatar == null || !LicenseAccepted))
            {
                DrawValidationSection();
                var canConvert = _report != null && !_report.HasErrors;
                using (new EditorGUI.DisabledScope(!canConvert))
                {
                    DrawSettingsSection();
                    DrawConvertSection();
                }
            }

            DrawResultSection();
            EditorGUILayout.EndScrollView();
        }

        private void DrawDependencyState()
        {
#if !VCAM_HAS_UNIVRM0
            EditorGUILayout.HelpBox(
                "UniVRM (com.vrmc.univrm) が見つかりません。Package Manager で先にインストールしてください " +
                "(com.vrmc.gltf → com.vrmc.univrm の順)。",
                MessageType.Error);
#endif
#if !VCAM_HAS_VRCSDK
            EditorGUILayout.HelpBox(
                "VRChat SDK3 Avatars (com.vrchat.avatars) が見つかりません。" +
                "VRChat Creator Companion で作成した Avatars プロジェクトで実行してください。",
                MessageType.Error);
#endif
        }

        private void DrawAvatarSection()
        {
            EditorGUILayout.Space();
            EditorGUILayout.LabelField("ステップ 1: アバターを選ぶ", EditorStyles.boldLabel);
            var next = (GameObject)EditorGUILayout.ObjectField(
                "VRChat アバター", _avatar, typeof(GameObject), allowSceneObjects: true);
            if (next != _avatar)
            {
                _avatar = next;
                _report = null;
                _lastResult = null;
                if (_avatar != null && string.IsNullOrEmpty(_settings.Title))
                {
                    _settings.Title = _avatar.name;
                }
            }
            EditorGUILayout.HelpBox(
                "シーン内の、VRCAvatarDescriptor が付いたアバターのルートを指定してください。",
                MessageType.None);
        }

        private void DrawLicenseSection()
        {
            EditorGUILayout.Space();
            EditorGUILayout.LabelField("ステップ 2: ライセンスを確認する", EditorStyles.boldLabel);
            EditorGUILayout.HelpBox(
                "変換する前に、アバターの利用規約を必ず読んでください。\n" +
                "「VRChat 以外での利用禁止」「VRM への変換禁止」「改変禁止」と書かれている場合、" +
                "このツールで変換して VCam で使うことはできません。不明な場合は作者に確認してください。",
                MessageType.Warning);
            LicenseAccepted = EditorGUILayout.ToggleLeft(
                "アバターの規約で VRM 化と VRChat 外での利用が許可されていることを確認しました",
                LicenseAccepted);
        }

        private void DrawValidationSection()
        {
            EditorGUILayout.Space();
            EditorGUILayout.LabelField("ステップ 3: 検証する", EditorStyles.boldLabel);
            if (GUILayout.Button("検証を実行"))
            {
                _report = AvatarValidator.Validate(_avatar);
                _lastResult = null;
            }

            if (_report == null)
            {
                return;
            }
            foreach (var item in _report.Items)
            {
                var type = item.Severity == Severity.Error ? MessageType.Error
                    : item.Severity == Severity.Warning ? MessageType.Warning
                    : MessageType.Info;
                var message = string.IsNullOrEmpty(item.FixHint)
                    ? item.Message
                    : $"{item.Message}\n対処: {item.FixHint}";
                EditorGUILayout.HelpBox(message, type);
            }
            if (_report.HasErrors)
            {
                EditorGUILayout.HelpBox("エラーを解消してから再度「検証を実行」を押してください。", MessageType.Error);
            }
        }

        private void DrawSettingsSection()
        {
            EditorGUILayout.Space();
            EditorGUILayout.LabelField("ステップ 4: 変換の設定", EditorStyles.boldLabel);
            _settings.Title = EditorGUILayout.TextField("タイトル", _settings.Title);
            _settings.Version = EditorGUILayout.TextField("バージョン", _settings.Version);
            _settings.Author = EditorGUILayout.TextField("作者 (自分の名前)", _settings.Author);
            _settings.ConvertMaterials = EditorGUILayout.ToggleLeft(
                "マテリアルを MToon に変換する (lilToon / Poiyomi / その他)", _settings.ConvertMaterials);
            _settings.ConvertPhysBones = EditorGUILayout.ToggleLeft(
                "PhysBone を揺れもの (SpringBone) に変換する", _settings.ConvertPhysBones);
            _settings.KeepConvertedCopyInScene = EditorGUILayout.ToggleLeft(
                "変換後の複製をシーンに残す (目視確認用)", _settings.KeepConvertedCopyInScene);

            _advancedFoldout = EditorGUILayout.Foldout(_advancedFoldout, "詳細設定 (揺れの係数)");
            if (_advancedFoldout)
            {
                EditorGUI.indentLevel++;
                var sb = _settings.SpringBone;
                sb.PullToStiffness = EditorGUILayout.Slider("Pull → 硬さ 係数", sb.PullToStiffness, 0f, 8f);
                sb.GravityFactor = EditorGUILayout.Slider("Gravity 係数", sb.GravityFactor, 0f, 40f);
                sb.InvertSpring = EditorGUILayout.ToggleLeft(
                    "Spring を反転して減衰にする (揺れすぎる場合に ON)", sb.InvertSpring);
                _settings.SpringBone = sb;
                EditorGUI.indentLevel--;
                EditorGUILayout.HelpBox(
                    "PhysBone と SpringBone は計算方法が違うため、揺れ方は完全には一致しません。" +
                    "VCam で確認しながら係数を調整してください。",
                    MessageType.None);
            }
        }

        private void DrawConvertSection()
        {
            EditorGUILayout.Space();
            EditorGUILayout.LabelField("ステップ 5: 変換して保存", EditorStyles.boldLabel);
            if (!GUILayout.Button("変換して .vrm をエクスポート", GUILayout.Height(32f)))
            {
                return;
            }

            var savePath = EditorUtility.SaveFilePanel(
                "VRM として保存", "", Sanitize(_avatar.name) + ".vrm", "vrm");
            if (string.IsNullOrEmpty(savePath))
            {
                return;
            }

            _lastResult = ConversionPipeline.Run(_avatar, _settings, savePath, _report);
        }

        private void DrawResultSection()
        {
            if (_lastResult == null)
            {
                return;
            }
            EditorGUILayout.Space();
            if (_lastResult.Success)
            {
                EditorGUILayout.HelpBox(
                    ".vrm の書き出しが完了しました 🎉\n" +
                    "VCam を起動して、画面の「ここに .vrm をドラッグ&ドロップ」の枠にこのファイルを" +
                    "ドラッグ&ドロップしてください。",
                    MessageType.Info);
                if (GUILayout.Button("エクスポート先のフォルダを開く"))
                {
                    EditorUtility.RevealInFinder(_lastResult.ExportPath);
                }
            }
            else
            {
                foreach (var error in _lastResult.Errors)
                {
                    EditorGUILayout.HelpBox(error, MessageType.Error);
                }
            }
        }

        private static string Sanitize(string name)
        {
            foreach (var c in System.IO.Path.GetInvalidFileNameChars())
            {
                name = name.Replace(c, '_');
            }
            return name;
        }
    }
}
