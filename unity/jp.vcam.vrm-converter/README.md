# VCam VRM Converter

VRChat アバター (VRCAvatarDescriptor 付き) を、VCam で読み込める **VRM 0.x** に
変換する Unity エディタ拡張。改変済みアバターをそのまま変換できる。

ユーザー向けの導入手順は [docs/VRCHAT_TO_VRM.md](../../docs/VRCHAT_TO_VRM.md) を参照。
このファイルは開発者向け。

## 変換内容

| 項目 | 変換 |
|---|---|
| メッシュ / Humanoid ボーン | UniVRM のエクスポート (PoseFreeze=ON で T-pose 強制・正規化) |
| リップシンク | VRC viseme 15 種のうち aa/E/ih/oh/ou → VRM の A/E/I/O/U |
| まばたき | Eyelids (Blendshapes) → Blink。Blink_L/R は BlendShape 名のヒューリスティック推定 |
| 視線 | Eye Look の回転角 → VRMLookAtBoneApplyer |
| 一人称視点 | ViewPosition → VRMFirstPerson.FirstPersonOffset |
| マテリアル | lilToon (フル近似) / Poiyomi (最小) / その他 (汎用) → VRM/MToon |
| 揺れもの | VRCPhysBone → VRMSpringBone 近似 (係数調整可)、コライダは球/カプセル(球近似) |

## 必要環境

- Unity **2022.3 LTS** (VRChat 公式バージョン)
- **VRChat SDK3 Avatars** (`com.vrchat.avatars`) — VCC プロジェクトに同梱
- **UniVRM v0.128.0 以上** (`com.vrmc.gltf` + `com.vrmc.univrm`)
  - 検証済みバージョン: **v0.128.0**
  - UPM の git 依存は推移的に解決されないため、**本パッケージより先に** UniVRM を
    インストールすること

## インストール (UPM git URL)

Package Manager → Add package from git URL... で上から順に:

```
https://github.com/vrm-c/UniVRM.git?path=/Assets/UniGLTF#v0.128.0
https://github.com/vrm-c/UniVRM.git?path=/Assets/VRM#v0.128.0
https://github.com/Fuwaaaaaa/VCam.git?path=unity/jp.vcam.vrm-converter
```

バージョン固定したい場合は本パッケージの URL 末尾に `#vrm-converter/v0.1.0` の
ようにタグを付ける。

### .unitypackage での配布

UPM を使わない人向けに、`unity/build-unitypackage.ps1` で `.unitypackage` を
ビルドできる (Unity 不要。リポジトリ内の .meta の GUID をそのまま使う):

```powershell
powershell -ExecutionPolicy Bypass -File unity\build-unitypackage.ps1
# → unity/dist/VCamVRMConverter-<version>.unitypackage (git ignore 対象)
```

`Assets/VCamVRMConverter/` 以下に展開される。UniVRM が先に必要なのは UPM 版と
同じ。Assets 配下に入れた場合、EditMode テストは `testables` 追記なしで
Test Runner に表示される。

## アーキテクチャ

```
Editor/
├─ ConverterWindow.cs        ウィザード UI (選択→ライセンス→検証→設定→変換)
├─ ConversionPipeline.cs     オーケストレーション。元を触らず複製に適用
├─ Validation/               変換前チェック (Error で変換ブロック)
├─ Extraction/               VRCAvatarDescriptor → VrcAvatarInfo (SDK 非依存コンテナ)
├─ Expressions/              viseme/blink/視線 → VRM0 BlendShapeClip
├─ Materials/                IMaterialConverter 群 (lilToon / Poiyomi / Generic → MToon)
├─ Dynamics/                 PhysBone → SpringBone (数値変換は pure 関数に分離)
└─ Export/                   VRC コンポーネント除去 + UniVRM エクスポート呼び出し
```

設計上のポイント:

- **防御的コンパイル**: asmdef の Version Defines で `VCAM_HAS_VRCSDK` /
  `VCAM_HAS_UNIVRM0` を定義し、SDK 依存コードを `#if` で囲む。Poiyomi は
  シェーダ名の文字列判定のみでコンパイル依存を持たない
- **UniVRM API の隔離**: エクスポート API 呼び出しは `Export/VrmExportRunner.cs`
  の 1 ファイルのみ。UniVRM のバージョン更新で API が変わったらここだけ直す
- **テスト容易性**: 変換式 (SpringBoneParameterMap)・マッピング表 (VisemeMap)・
  値変換 (MToonValueMap)・名前推定 (BlinkShapeNameMatcher) は Unity の
  Material/SDK に依存しない pure なクラスに分離

## テスト

EditMode テスト (`Tests/Editor/`)。git URL でインストールしたパッケージのテストを
Test Runner に出すには、プロジェクトの `Packages/manifest.json` に追記:

```json
"testables": ["jp.vcam.vrm-converter"]
```

Window → General → Test Runner → EditMode → Run All。

実アバターでの見た目・挙動の確認は
[docs/qa/VRM_CONVERTER_QA.md](../../docs/qa/VRM_CONVERTER_QA.md) のチェックリストに従う。

## リリース手順

1. `package.json` の `version` を更新
2. `CHANGELOG.md` に追記
3. タグ `vrm-converter/v<version>` を打って push
4. `unity/build-unitypackage.ps1` でビルドした `.unitypackage` を GitHub Release に添付
