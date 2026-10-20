# NOCTURNE Wallpaper Studio v2

The v2 editor is built from the original self-contained editor plus a readable extension module.

## Source layout

- `wallpaper-studio.base.html` — original editor extracted from v1.
- `nocturne-features.js` — directional grid bend handles, scene keyframes, spectrum, clock and globe-grid rendering, and Wallpaper Engine export.
- `WallpaperLauncher.cs` — optional Windows .NET Framework launcher. The editor itself is a self-contained browser application.
- `wallpaper-studio.html` — generated file; do not edit it directly.

Run `..\build-wallpaper.ps1` after changing the base editor or extension module. The build writes `wallpaper-studio.html` and compiles `..\dist\NOCTURNE-Wallpaper-Studio.exe`.

## Animation model

A keyframe captures the complete scene. Legacy or incomplete keyframes are normalized against the current layer set before saving and export, preventing layers added later from disappearing during playback. Numeric values and matching anchor arrays are interpolated between neighboring keys. Color values use RGB interpolation, while discrete properties switch halfway between keys. Motion is linear by default; the optional **Плавно** checkbox enables smoothstep easing. Key markers can be dragged, removed with the context menu, and are proportionally rescaled when the timeline duration changes.

The editor starts with an empty canvas. Newly added geometry uses neutral transforms and zero bend/rotation. Every slider has a synchronized editable number field. The clock accepts an installed font name, can request the browser's local font list, or embed TTF/OTF/WOFF/WOFF2 data into the project. Heavy wave and grid paths are cached, with reduced path detail while dragging. Radial spectrum layers support a directed arc sector.

## Wallpaper Engine export

The project-name field controls project JSON, PNG, ZIP filenames, and the Wallpaper Engine title. Folder and ZIP exports contain a self-contained web wallpaper, `project.json`, generated `preview.png`, `APPLY-WALLPAPER.cmd`, and `INSTALL-PUBLISH.cmd`. The latter installs the editable project under `wallpaper_engine\projects\myprojects` for Workshop publishing and mobile transfer. Its audio listener follows the Wallpaper Engine web API. Wallpaper properties allow stereo, left, right, or strongest-channel capture, an extra gain multiplier, and an optional signal diagnostic overlay. The physical recording device remains a global Wallpaper Engine setting under **Settings → General → Media**. When no Wallpaper Engine audio source is present, the spectrum remains still unless idle motion was explicitly enabled.

The editor UI uses the exact `#00E9FF` accent and embeds the variable Oxanium typeface during the build. Custom canvas resolutions are persisted locally and included in saved project metadata.

The editor includes a native **1260×2800 Nothing Phone (3)** preset with an editor-only safe-area guide. Exported wallpapers support cover, contain, and stretch fitting. The Wallpaper Engine property panel exposes audio gain, AGC, spectrum sensitivity, gate, attack/release, bass/treble balance, spectrum geometry, render quality, and FPS. Wallpaper Engine for Android can drive audio visualizers when recording permission is granted, but the NOCTURNE Web export is not a native Scene package, so mobile Web exports retain the optional idle-motion fallback.

The runtime retries audio registration if the host API arrives late, applies optional automatic gain and a noise gate, and drops stale samples. Static scene layers are cached, animated wave geometry is batched into one `Path2D`, and expensive blur radii are capped for 4K playback. Idle spectrum motion is disabled by default so missing audio is not hidden.

Selected layers can be centered with **В центр** or snapped to the horizontal and vertical center axes while dragging with Shift.
