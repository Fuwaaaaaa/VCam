# VCam VRM Converter の .unitypackage を Unity なしでビルドする。
#
# .unitypackage は gzip された tar で、アセットごとに
#   <guid>/asset       (ファイル本体。フォルダの場合は無し)
#   <guid>/asset.meta  (meta ファイル)
#   <guid>/pathname    (Assets/ からのパスを書いたテキスト)
# というエントリが並ぶ。GUID はリポジトリ内の .meta をそのまま使う。
#
# 使い方:  powershell -ExecutionPolicy Bypass -File unity\build-unitypackage.ps1
# 出力:    unity\dist\VCamVRMConverter-<version>.unitypackage

$ErrorActionPreference = "Stop"

$unityDir = $PSScriptRoot
$pkgRoot = Join-Path $unityDir "jp.vcam.vrm-converter"
$assetRootName = "VCamVRMConverter"   # Assets/ 直下に展開されるフォルダ名

$version = ([System.IO.File]::ReadAllText((Join-Path $pkgRoot "package.json"), [System.Text.Encoding]::UTF8) | ConvertFrom-Json).version
$distDir = Join-Path $unityDir "dist"
$output = Join-Path $distDir "VCamVRMConverter-$version.unitypackage"

$stage = Join-Path $env:TEMP ("vcam-unitypackage-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $stage | Out-Null
New-Item -ItemType Directory -Force $distDir | Out-Null

$utf8 = New-Object System.Text.UTF8Encoding($false)

function Get-GuidFromMeta([string]$metaPath) {
    $line = (Get-Content $metaPath | Where-Object { $_ -match "^guid: " } | Select-Object -First 1)
    if (-not $line) { throw "guid が見つかりません: $metaPath" }
    return $line.Substring(6).Trim()
}

function Add-Entry([string]$guid, [string]$assetPath, [string]$metaContent, [string]$unityPath) {
    $dir = Join-Path $stage $guid
    New-Item -ItemType Directory -Force $dir | Out-Null
    if ($assetPath) { Copy-Item $assetPath (Join-Path $dir "asset") }
    [System.IO.File]::WriteAllText((Join-Path $dir "asset.meta"), $metaContent, $utf8)
    [System.IO.File]::WriteAllText((Join-Path $dir "pathname"), ($unityPath + "`n"), $utf8)
}

# --- ルートフォルダ (Assets/VCamVRMConverter) ---
# ビルドごとに GUID が変わらないよう固定文字列から導出する
$md5 = [System.Security.Cryptography.MD5]::Create()
$rootGuid = ([System.BitConverter]::ToString(
    $md5.ComputeHash([System.Text.Encoding]::UTF8.GetBytes("jp.vcam.vrm-converter:assets-root"))
) -replace "-", "").ToLowerInvariant()
$rootMeta = "fileFormatVersion: 2`nguid: $rootGuid`nfolderAsset: yes`nDefaultImporter:`n  externalObjects: {}`n  userData: `n  assetBundleName: `n  assetBundleVariant: `n"
Add-Entry $rootGuid $null $rootMeta "Assets/$assetRootName"

# --- パッケージ内のフォルダとファイル ---
# package.json は Assets 配下では不要なため除外
$excludeNames = @("package.json", "package.json.meta")

$count = 1
foreach ($item in Get-ChildItem $pkgRoot -Recurse) {
    if ($item.Extension -eq ".meta") { continue }
    if ($excludeNames -contains $item.Name) { continue }

    $metaPath = $item.FullName + ".meta"
    if (-not (Test-Path $metaPath)) { throw ".meta がありません: $($item.FullName)" }

    $rel = $item.FullName.Substring($pkgRoot.Length + 1) -replace "\\", "/"
    $unityPath = "Assets/$assetRootName/$rel"
    $guid = Get-GuidFromMeta $metaPath
    $metaContent = [System.IO.File]::ReadAllText($metaPath)

    if ($item.PSIsContainer) {
        Add-Entry $guid $null $metaContent $unityPath
    } else {
        Add-Entry $guid $item.FullName $metaContent $unityPath
    }
    $count++
}

# --- tar.gz 化 ---
if (Test-Path $output) { Remove-Item $output -Force }
$namesFile = Join-Path $stage "..\vcam-unitypackage-names.txt"
Get-ChildItem $stage -Name | Set-Content -Path $namesFile -Encoding ascii
tar -czf $output -C $stage -T $namesFile
if ($LASTEXITCODE -ne 0) { throw "tar に失敗しました (exit $LASTEXITCODE)" }

Remove-Item $stage -Recurse -Force
Remove-Item $namesFile -Force

Write-Host "OK: $count assets -> $output"
