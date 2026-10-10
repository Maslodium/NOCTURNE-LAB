# NOCTURNE Wallpaper Studio v2

The v2 editor is built from the original self-contained editor plus a readable extension module.

## Source layout

- `wallpaper-studio.base.html` — original editor extracted from v1.
- `nocturne-features.js` — grid bend handles, scene keyframes, spectrum and clock rendering, and Wallpaper Engine export.
- `WallpaperLauncher.cs` — .NET Framework launcher.
- `wallpaper-studio.html` — generated file; do not edit it directly.

Run `..\build-wallpaper.ps1` after changing the base editor or extension module. The build writes `wallpaper-studio.html` and compiles `..\dist\NOCTURNE Wallpaper v2.exe`.

## Animation model

A keyframe captures the complete scene. Numeric values and matching anchor arrays are interpolated between neighboring keys. Color values use RGB interpolation, while discrete properties switch halfway between keys. Smoothstep easing is enabled by default.

## Wallpaper Engine export

The exported ZIP contains a self-contained web wallpaper and `project.json`. Its audio listener follows the Wallpaper Engine web API and combines the two 64-bin channels. When no Wallpaper Engine audio source is present, an idle spectrum keeps the preview alive.
