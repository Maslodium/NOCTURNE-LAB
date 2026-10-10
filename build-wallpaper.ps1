[CmdletBinding()]
param(
    [string]$OutputName = 'NOCTURNE Wallpaper v2.exe'
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$source = Join-Path $root 'src'
$basePath = Join-Path $source 'wallpaper-studio.base.html'
$featurePath = Join-Path $source 'nocturne-features.js'
$generatedPath = Join-Path $source 'wallpaper-studio.html'
$dist = Join-Path $root 'dist'

$base = [IO.File]::ReadAllText($basePath, [Text.Encoding]::UTF8)
$features = [IO.File]::ReadAllText($featurePath, [Text.Encoding]::UTF8)
$marker = "`$('#projectSave').onclick=saveProject;"
$markerIndex = $base.IndexOf($marker, [StringComparison]::Ordinal)
if ($markerIndex -lt 0) {
    throw 'Could not find the feature injection marker in wallpaper-studio.base.html.'
}

$generated = $base.Insert($markerIndex, "`r`n/* BEGIN NOCTURNE V2 FEATURES */`r`n$features`r`n/* END NOCTURNE V2 FEATURES */`r`n")
[IO.File]::WriteAllText($generatedPath, $generated, [Text.UTF8Encoding]::new($true))

New-Item -ItemType Directory -Path $dist -Force | Out-Null
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler -PathType Leaf)) {
    throw 'The .NET Framework 4 C# compiler was not found.'
}

$output = Join-Path $dist $OutputName
$arguments = @(
    '/nologo', '/target:winexe', '/optimize+', '/platform:anycpu',
    ('/out:' + $output),
    ('/win32icon:' + (Join-Path $root 'nocturne-wallpaper-mark.ico')),
    ('/resource:' + $generatedPath + ',Nocturne.Wallpaper.html'),
    ('/resource:' + (Join-Path $source 'nocturne-wallpaper-mark.svg') + ',Nocturne.Wallpaper.svg'),
    ('/reference:' + (Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\System.Windows.Forms.dll')),
    (Join-Path $source 'WallpaperLauncher.cs')
)

& $compiler $arguments
if ($LASTEXITCODE -ne 0) {
    throw "C# compiler failed with exit code $LASTEXITCODE."
}

Write-Host "Built $output"
