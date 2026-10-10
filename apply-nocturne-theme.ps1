[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Position = 0)]
    [string]$WallpaperPath,

    [ValidatePattern('^#?[0-9A-Fa-f]{6}$')]
    [string]$AccentColor = '#FFFFFF',

    [ValidateSet('Fill', 'Fit', 'Stretch', 'Center', 'Tile')]
    [string]$WallpaperStyle = 'Fill',

    [switch]$DisableTransparency,

    [switch]$NoGui
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RegValue {
    param([string]$Path, [string]$Name)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    $item = Get-ItemProperty -LiteralPath $Path -ErrorAction SilentlyContinue
    if ($null -eq $item) {
        return $null
    }

    $property = $item.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }

    return $property.Value
}

if ($env:OS -ne 'Windows_NT') {
    throw 'This script supports Windows only.'
}

function Get-PolicyBlockers {
    $items = [System.Collections.Generic.List[string]]::new()

    foreach ($path in @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\System',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Policies\System'
    )) {
        $wallpaperPolicy = Get-RegValue $path 'Wallpaper'
        if ($wallpaperPolicy) {
            $items.Add("Managed desktop wallpaper is configured: $path")
        }
    }

    foreach ($path in @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\ActiveDesktop',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Policies\ActiveDesktop',
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer'
    )) {
        $policy = Get-RegValue $path 'NoChangingWallPaper'
        if ($policy -eq 1) {
            $items.Add("Policy prevents wallpaper changes: $path")
        }
    }

    return @($items | Select-Object -Unique)
}

function Initialize-NocturneNative {
    if ('NocturneNative' -as [type]) {
        return
    }

    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class NocturneNative {
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SystemParametersInfo(
        int action, int parameter, string value, int flags);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern IntPtr SendMessageTimeout(
        IntPtr window, uint message, UIntPtr wParam, string lParam,
        uint flags, uint timeout, out UIntPtr result);
}
"@
}
function Show-NocturneDialog {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    [System.Windows.Forms.Application]::EnableVisualStyles()

    $form = [System.Windows.Forms.Form]::new()
    $form.Text = 'NOCTURNE / LAB - Windows theme'
    $form.ClientSize = [Drawing.Size]::new(560, 390)
    $form.StartPosition = 'CenterScreen'
    $form.FormBorderStyle = 'FixedDialog'
    $form.MaximizeBox = $false
    $form.MinimizeBox = $false
    $form.AutoScaleMode = 'Dpi'
    $form.BackColor = [Drawing.Color]::FromArgb(18, 20, 25)
    $form.ForeColor = [Drawing.Color]::White
    $form.Font = [Drawing.Font]::new('Segoe UI', 9)

    $title = [Windows.Forms.Label]::new()
    $title.Text = 'Обои и тёмная тема'
    $title.Font = [Drawing.Font]::new('Segoe UI Semibold', 16)
    $title.AutoSize = $true
    $title.Location = [Drawing.Point]::new(22, 18)
    $form.Controls.Add($title)

    $wallpaperLabel = [Windows.Forms.Label]::new()
    $wallpaperLabel.Text = 'Файл обоев'
    $wallpaperLabel.AutoSize = $true
    $wallpaperLabel.Location = [Drawing.Point]::new(24, 68)
    $form.Controls.Add($wallpaperLabel)

    $pathBox = [Windows.Forms.TextBox]::new()
    $pathBox.Location = [Drawing.Point]::new(24, 90)
    $pathBox.Size = [Drawing.Size]::new(420, 27)
    $pathBox.BackColor = [Drawing.Color]::FromArgb(29, 32, 39)
    $pathBox.ForeColor = [Drawing.Color]::White
    $pathBox.BorderStyle = 'FixedSingle'
    $form.Controls.Add($pathBox)

    $browse = [Windows.Forms.Button]::new()
    $browse.Text = 'Обзор...'
    $browse.Location = [Drawing.Point]::new(454, 88)
    $browse.Size = [Drawing.Size]::new(82, 30)
    $form.Controls.Add($browse)

    $styleLabel = [Windows.Forms.Label]::new()
    $styleLabel.Text = 'Размещение'
    $styleLabel.AutoSize = $true
    $styleLabel.Location = [Drawing.Point]::new(24, 137)
    $form.Controls.Add($styleLabel)

    $styleBox = [Windows.Forms.ComboBox]::new()
    $styleBox.DropDownStyle = 'DropDownList'
    [void]$styleBox.Items.AddRange(@('Fill', 'Fit', 'Stretch', 'Center', 'Tile'))
    $styleBox.SelectedItem = $WallpaperStyle
    $styleBox.Location = [Drawing.Point]::new(24, 159)
    $styleBox.Size = [Drawing.Size]::new(210, 27)
    $form.Controls.Add($styleBox)

    $accentLabel = [Windows.Forms.Label]::new()
    $accentLabel.Text = 'Акцент Windows'
    $accentLabel.AutoSize = $true
    $accentLabel.Location = [Drawing.Point]::new(258, 137)
    $form.Controls.Add($accentLabel)

    $accentBox = [Windows.Forms.TextBox]::new()
    $accentBox.Text = if ($AccentColor.StartsWith('#')) { $AccentColor } else { "#$AccentColor" }
    $accentBox.Location = [Drawing.Point]::new(258, 159)
    $accentBox.Size = [Drawing.Size]::new(150, 27)
    $accentBox.BackColor = [Drawing.Color]::FromArgb(29, 32, 39)
    $accentBox.ForeColor = [Drawing.Color]::White
    $accentBox.BorderStyle = 'FixedSingle'
    $form.Controls.Add($accentBox)

    $colorButton = [Windows.Forms.Button]::new()
    $colorButton.Text = 'Цвет...'
    $colorButton.Location = [Drawing.Point]::new(418, 157)
    $colorButton.Size = [Drawing.Size]::new(118, 30)
    $form.Controls.Add($colorButton)

    $transparencyBox = [Windows.Forms.CheckBox]::new()
    $transparencyBox.Text = 'Отключить прозрачность интерфейса Windows'
    $transparencyBox.Checked = [bool]$DisableTransparency
    $transparencyBox.AutoSize = $true
    $transparencyBox.Location = [Drawing.Point]::new(24, 210)
    $form.Controls.Add($transparencyBox)

    $policyLabel = [Windows.Forms.Label]::new()
    $policyLabel.Location = [Drawing.Point]::new(24, 244)
    $policyLabel.Size = [Drawing.Size]::new(512, 55)
    $policyLabel.ForeColor = [Drawing.Color]::FromArgb(181, 190, 202)
    $blockers = @(Get-PolicyBlockers)
    if ($blockers.Count -gt 0) {
        $policyLabel.ForeColor = [Drawing.Color]::FromArgb(255, 150, 105)
        $policyLabel.Text = 'Обнаружена управляемая политика. Обои останутся без изменений; тёмная тема и разрешённые параметры пользователя будут применены.'
    }
    else {
        $policyLabel.Text = 'Настройки применяются только для текущего пользователя. Перед изменением будет создана резервная копия.'
    }
    $form.Controls.Add($policyLabel)

    $apply = [Windows.Forms.Button]::new()
    $apply.Text = 'Применить'
    $apply.Location = [Drawing.Point]::new(344, 326)
    $apply.Size = [Drawing.Size]::new(92, 36)
    $apply.BackColor = [Drawing.Color]::FromArgb(169, 255, 104)
    $apply.ForeColor = [Drawing.Color]::FromArgb(8, 16, 5)
    $apply.FlatStyle = 'Flat'
    $form.Controls.Add($apply)

    $cancel = [Windows.Forms.Button]::new()
    $cancel.Text = 'Отмена'
    $cancel.Location = [Drawing.Point]::new(444, 326)
    $cancel.Size = [Drawing.Size]::new(92, 36)
    $cancel.DialogResult = [Windows.Forms.DialogResult]::Cancel
    $form.Controls.Add($cancel)
    $form.CancelButton = $cancel

    $browse.Add_Click({
        $dialog = [Windows.Forms.OpenFileDialog]::new()
        $dialog.Title = 'Выберите изображение для рабочего стола'
        $dialog.Filter = 'Изображения|*.png;*.jpg;*.jpeg;*.bmp|Все файлы|*.*'
        if ($dialog.ShowDialog($form) -eq [Windows.Forms.DialogResult]::OK) {
            $pathBox.Text = $dialog.FileName
        }
        $dialog.Dispose()
    })

    $colorButton.Add_Click({
        $dialog = [Windows.Forms.ColorDialog]::new()
        try {
            $dialog.Color = [Drawing.ColorTranslator]::FromHtml($accentBox.Text)
        }
        catch {
            $dialog.Color = [Drawing.Color]::White
        }
        if ($dialog.ShowDialog($form) -eq [Windows.Forms.DialogResult]::OK) {
            $accentBox.Text = '#{0:X2}{1:X2}{2:X2}' -f $dialog.Color.R, $dialog.Color.G, $dialog.Color.B
        }
        $dialog.Dispose()
    })

    $apply.Add_Click({
        if ([string]::IsNullOrWhiteSpace($pathBox.Text) -or -not (Test-Path -LiteralPath $pathBox.Text -PathType Leaf)) {
            [void][Windows.Forms.MessageBox]::Show($form, 'Выберите существующий файл обоев.', 'NOCTURNE / LAB', 'OK', 'Warning')
            return
        }
        if ($accentBox.Text -notmatch '^#?[0-9A-Fa-f]{6}$') {
            [void][Windows.Forms.MessageBox]::Show($form, 'Цвет должен быть записан как #RRGGBB.', 'NOCTURNE / LAB', 'OK', 'Warning')
            return
        }
        $form.Tag = [pscustomobject]@{
            WallpaperPath = $pathBox.Text
            AccentColor = $accentBox.Text
            WallpaperStyle = [string]$styleBox.SelectedItem
            DisableTransparency = $transparencyBox.Checked
        }
        $form.DialogResult = [Windows.Forms.DialogResult]::OK
        $form.Close()
    })

    $result = $form.ShowDialog()
    $selection = $form.Tag
    $form.Dispose()
    if ($result -ne [Windows.Forms.DialogResult]::OK) {
        return $null
    }
    return $selection
}

$usedGui = $false
if (-not $WallpaperPath -and -not $NoGui) {
    if ([Threading.Thread]::CurrentThread.ApartmentState -ne 'STA') {
        throw 'GUI mode requires an STA PowerShell session. Use start-theme-setup.cmd or launch PowerShell with -STA.'
    }
    $selection = Show-NocturneDialog
    if ($null -eq $selection) {
        return
    }
    $WallpaperPath = $selection.WallpaperPath
    $AccentColor = $selection.AccentColor
    $WallpaperStyle = $selection.WallpaperStyle
    $DisableTransparency = [bool]$selection.DisableTransparency
    $usedGui = $true
}
Initialize-NocturneNative

function Convert-HexColor {
    param([string]$Hex)

    $clean = $Hex.TrimStart('#')
    $r = $clean.Substring(0, 2)
    $g = $clean.Substring(2, 2)
    $b = $clean.Substring(4, 2)

    $argb = [Convert]::ToUInt32("FF$r$g$b", 16)
    $abgr = [Convert]::ToUInt32("FF$b$g$r", 16)

    [pscustomobject]@{
        Argb = [BitConverter]::ToInt32([BitConverter]::GetBytes($argb), 0)
        Abgr = [BitConverter]::ToInt32([BitConverter]::GetBytes($abgr), 0)
    }
}

function Save-CurrentSettings {
    $folder = Join-Path $env:LOCALAPPDATA 'NocturneLab'
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
    $path = Join-Path $folder ('theme-backup-{0:yyyyMMdd-HHmmss}.json' -f (Get-Date))

    $personalizePath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
    $dwmPath = 'HKCU:\Software\Microsoft\Windows\DWM'
    $desktopPath = 'HKCU:\Control Panel\Desktop'

    [pscustomobject]@{
        CreatedAt = (Get-Date).ToString('o')
        AppsUseLightTheme = Get-RegValue $personalizePath 'AppsUseLightTheme'
        SystemUsesLightTheme = Get-RegValue $personalizePath 'SystemUsesLightTheme'
        EnableTransparency = Get-RegValue $personalizePath 'EnableTransparency'
        ColorPrevalence = Get-RegValue $personalizePath 'ColorPrevalence'
        DwmColorizationColor = Get-RegValue $dwmPath 'ColorizationColor'
        DwmAccentColor = Get-RegValue $dwmPath 'AccentColor'
        Wallpaper = Get-RegValue $desktopPath 'WallPaper'
        WallpaperStyle = Get-RegValue $desktopPath 'WallpaperStyle'
        TileWallpaper = Get-RegValue $desktopPath 'TileWallpaper'
    } | ConvertTo-Json | Set-Content -LiteralPath $path -Encoding UTF8

    return $path
}

$backupPath = Save-CurrentSettings
Write-Host "Backup saved to: $backupPath"

$themeKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
$dwmKey = 'HKCU:\Software\Microsoft\Windows\DWM'
$accentKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Accent'
$desktopKey = 'HKCU:\Control Panel\Desktop'

foreach ($path in @($themeKey, $dwmKey, $accentKey)) {
    New-Item -Path $path -Force | Out-Null
}

if ($PSCmdlet.ShouldProcess('Current user', 'Enable Windows and app dark mode')) {
    New-ItemProperty -Path $themeKey -Name AppsUseLightTheme -PropertyType DWord -Value 0 -Force | Out-Null
    New-ItemProperty -Path $themeKey -Name SystemUsesLightTheme -PropertyType DWord -Value 0 -Force | Out-Null
    New-ItemProperty -Path $themeKey -Name ColorPrevalence -PropertyType DWord -Value 1 -Force | Out-Null
    New-ItemProperty -Path $themeKey -Name EnableTransparency -PropertyType DWord -Value ([int](-not $DisableTransparency)) -Force | Out-Null
}

$colors = Convert-HexColor $AccentColor
if ($PSCmdlet.ShouldProcess($AccentColor, 'Set the current-user accent color')) {
    New-ItemProperty -Path $dwmKey -Name ColorizationColor -PropertyType DWord -Value $colors.Argb -Force | Out-Null
    New-ItemProperty -Path $dwmKey -Name AccentColor -PropertyType DWord -Value $colors.Abgr -Force | Out-Null
    New-ItemProperty -Path $dwmKey -Name ColorPrevalence -PropertyType DWord -Value 1 -Force | Out-Null
    New-ItemProperty -Path $accentKey -Name AccentColorMenu -PropertyType DWord -Value $colors.Abgr -Force | Out-Null
}

$policyBlockers = @(Get-PolicyBlockers)
if ($WallpaperPath) {
    $resolvedWallpaper = (Resolve-Path -LiteralPath $WallpaperPath).Path
    $extension = [IO.Path]::GetExtension($resolvedWallpaper).ToLowerInvariant()
    if ($extension -notin @('.png', '.jpg', '.jpeg', '.bmp')) {
        throw 'Wallpaper must be PNG, JPG, JPEG, or BMP.'
    }

    if ($policyBlockers.Count -gt 0) {
        Write-Warning 'Wallpaper was not changed because Windows reports a managed policy:'
        $policyBlockers | ForEach-Object { Write-Warning "  $_" }
    }
    elseif ($PSCmdlet.ShouldProcess($resolvedWallpaper, 'Set desktop wallpaper')) {
        $style = @{
            Fill    = @('10', '0')
            Fit     = @('6',  '0')
            Stretch = @('2',  '0')
            Center  = @('0',  '0')
            Tile    = @('0',  '1')
        }[$WallpaperStyle]

        Set-ItemProperty -LiteralPath $desktopKey -Name WallpaperStyle -Value $style[0]
        Set-ItemProperty -LiteralPath $desktopKey -Name TileWallpaper -Value $style[1]

        $ok = [NocturneNative]::SystemParametersInfo(20, 0, $resolvedWallpaper, 3)
        if (-not $ok) {
            throw "Windows rejected the wallpaper change. Win32 error: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
        }
    }
}

if ($PSCmdlet.ShouldProcess('Windows shell', 'Broadcast theme setting changes')) {
    $broadcastResult = [UIntPtr]::Zero
    foreach ($setting in @('ImmersiveColorSet', 'WindowsThemeElement')) {
        [void][NocturneNative]::SendMessageTimeout(
            [IntPtr]0xFFFF,
            0x001A,
            [UIntPtr]::Zero,
            $setting,
            0x0002,
            2000,
            [ref]$broadcastResult
        )
    }

    $rundll32 = Join-Path $env:SystemRoot 'System32\rundll32.exe'
    if (Test-Path -LiteralPath $rundll32 -PathType Leaf) {
        & $rundll32 user32.dll,UpdatePerUserSystemParameters
    }
}
Write-Host 'Theme settings applied for the current user.'
if ($policyBlockers.Count -gt 0) {
    Write-Host 'Managed policy settings were detected and left unchanged.'
}
Write-Host 'Some applications may need to be restarted before adopting dark mode.'

if ($usedGui) {
    Add-Type -AssemblyName System.Windows.Forms
    $nl = [Environment]::NewLine
    $message = if ($policyBlockers.Count -gt 0) {
        "Разрешённые параметры темы применены. Обои не изменены, потому что Windows сообщает об управляемой политике.$nl$nl" + "Резервная копия: $backupPath"
    }
    else {
        "Обои и тёмная тема применены.$nl$nl" + "Резервная копия: $backupPath"
    }
    [void][Windows.Forms.MessageBox]::Show($message, 'NOCTURNE / LAB', 'OK', 'Information')
}