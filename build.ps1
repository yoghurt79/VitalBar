param(
    [switch]$TryPortable,
    [switch]$CreateDesktopShortcut
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
Set-Location -LiteralPath $Root
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"
$env:ELECTRON_BUILDER_CACHE = Join-Path $Root ".electron-builder-cache"

pnpm typecheck
if ($LASTEXITCODE -ne 0) { throw "TypeScript check failed." }
pnpm test
if ($LASTEXITCODE -ne 0) { throw "Tests failed." }
pnpm build
if ($LASTEXITCODE -ne 0) { throw "Renderer build failed." }

if ($TryPortable) {
    pnpm exec electron-builder --win portable
} else {
    pnpm exec electron-builder --win dir
}
if ($LASTEXITCODE -ne 0) { throw "Electron packaging failed." }

$Target = Join-Path $Root "release\win-unpacked\元气条.exe"
if (-not (Test-Path -LiteralPath $Target)) { throw "Executable not found: $Target" }

if ($CreateDesktopShortcut) {
    $Desktop = [Environment]::GetFolderPath("Desktop")
    $ShortcutPath = Join-Path $Desktop "元气条 Web版.lnk"
    $Shell = New-Object -ComObject WScript.Shell
    $Shortcut = $Shell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $Target
    $Shortcut.WorkingDirectory = Split-Path $Target
    $Shortcut.IconLocation = "$Target,0"
    $Shortcut.Description = "元气条 Electron 精致界面版"
    $Shortcut.Save()
    Write-Host "Desktop shortcut created: $ShortcutPath"
}

Write-Host "Build completed: $Target"
