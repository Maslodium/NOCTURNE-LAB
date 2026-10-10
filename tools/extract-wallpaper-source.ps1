[CmdletBinding()]
param(
    [string]$Executable = (Join-Path $PSScriptRoot '..\NOCTURNE Wallpaper.exe'),
    [string]$Destination = (Join-Path $PSScriptRoot '..\src')
)

$ErrorActionPreference = 'Stop'
$executablePath = (Resolve-Path -LiteralPath $Executable).Path
$assembly = [Reflection.Assembly]::LoadFile($executablePath)
New-Item -ItemType Directory -Path $Destination -Force | Out-Null

foreach ($resource in @(
    @{ Name = 'Nocturne.Wallpaper.html'; File = 'wallpaper-studio.html' },
    @{ Name = 'Nocturne.Wallpaper.svg'; File = 'nocturne-wallpaper-mark.svg' }
)) {
    $stream = $assembly.GetManifestResourceStream($resource.Name)
    if ($null -eq $stream) {
        throw "Embedded resource not found: $($resource.Name)"
    }
    try {
        $target = Join-Path $Destination $resource.File
        $output = [IO.File]::Create($target)
        try {
            $stream.CopyTo($output)
        }
        finally {
            $output.Dispose()
        }
    }
    finally {
        $stream.Dispose()
    }
}

Write-Host "Wallpaper sources extracted to $Destination"
