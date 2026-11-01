<#
.SYNOPSIS
    Normalizes unit artwork scaling for Mechanized Royale.

.DESCRIPTION
    The generated unit PNGs are all 1024x1024 canvases with wildly different amounts
    of transparent padding around the tank. Scaling them by canvas size (the old
    setDisplaySize(48, 48) approach) made units appear at arbitrary relative sizes -
    a Sherman rendered ~44% wider than a Panther purely because it was cropped tighter.

    This script measures the trimmed artwork bounds of every unit texture and emits
    src/data/unit-metrics.js, which the renderer uses to:
      * scale artwork by real-world width (metres) instead of canvas size
      * pivot each sprite on the centre of its trimmed artwork

    No image data is rewritten; the source PNGs stay untouched (no resampling).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools\normalize-units.ps1
#>

param(
    [string]$AssetsDir = (Join-Path $PSScriptRoot '..\assets\tanks'),
    [string]$OutFile   = (Join-Path $PSScriptRoot '..\src\data\unit-metrics.js'),
    [string]$PreviewFile = 'C:\Users\jentr\AppData\Local\Temp\opencode\unit-scale-preview.png',
    [int]$AlphaThreshold = 8
)

$ErrorActionPreference = 'Stop'

# Force invariant number formatting so generated JS uses '.' as the decimal separator
# regardless of the machine locale.
[System.Threading.Thread]::CurrentThread.CurrentCulture = [System.Globalization.CultureInfo]::InvariantCulture
[System.Threading.Thread]::CurrentThread.CurrentUICulture = [System.Globalization.CultureInfo]::InvariantCulture

Add-Type -AssemblyName System.Drawing

if (-not ('UnitAssetProbe' -as [type])) {
    Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class UnitAssetProbe
{
    /// <summary>Returns the tight bounds of non-transparent pixels: {x, y, width, height}.</summary>
    public static int[] GetContentBounds(string path, int alphaThreshold)
    {
        using (var bmp = new Bitmap(path))
        {
            var rect = new Rectangle(0, 0, bmp.Width, bmp.Height);
            BitmapData data = bmp.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            try
            {
                int minX = bmp.Width, minY = bmp.Height, maxX = -1, maxY = -1;
                byte[] row = new byte[data.Stride];
                for (int y = 0; y < bmp.Height; y++)
                {
                    Marshal.Copy(IntPtr.Add(data.Scan0, y * data.Stride), row, 0, data.Stride);
                    for (int x = 0; x < bmp.Width; x++)
                    {
                        if (row[x * 4 + 3] > alphaThreshold)
                        {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }
                if (maxX < 0) return new int[] { 0, 0, 0, 0 };
                return new int[] { minX, minY, maxX - minX + 1, maxY - minY + 1 };
            }
            finally
            {
                bmp.UnlockBits(data);
            }
        }
    }

    /// <summary>Converts a straight-alpha bitmap into a premultiplied copy so scaled
    /// drawing does not bleed hidden RGB values into transparent edges.</summary>
    public static Bitmap ToPremultiplied(Bitmap source)
    {
        var copy = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppPArgb);
        using (var g = Graphics.FromImage(copy))
        {
            g.CompositingMode = System.Drawing.Drawing2D.CompositingMode.SourceCopy;
            g.DrawImage(source, 0, 0, source.Width, source.Height);
        }
        return copy;
    }
}
'@
}

# ---------------------------------------------------------------------------
# Real-world hull widths (metres). These drive relative on-screen size.
# Adjust a value here and re-run to re-balance a unit's footprint.
# ---------------------------------------------------------------------------
$WorldWidths = [ordered]@{
    tiger             = 3.55   # Tiger I  (3.55 m hull)
    panther           = 3.27   # Panther  (3.27 m hull)
    sherman           = 2.62   # M4 Sherman (2.62 m hull)
    jagdpanzer        = 3.17   # Jagdpanzer IV (3.17 m hull)
    v1_launcher       = 4.20   # launch ramp / building footprint
    flak_panzer       = 3.00   # Flakpanzer IV (3.0 m hull)
    attack_helicopter = 3.50   # Attack Helicopter gunship footprint
    bomber            = 5.00   # Tactical Dive Bomber wingspan
    infantry          = 1.20   # Infantry soldier / fireteam
}

# Game pixels per real-world metre (1 tile = 20 px, so 11 px/m => Tiger ~2 tiles wide).
$PixelsPerMeter = 11

$results = @()
$missing = @()

foreach ($id in $WorldWidths.Keys) {
    $file = Join-Path $AssetsDir "unit_$id.png"
    if (-not (Test-Path $file)) { $missing += $id; continue }

    $img = [System.Drawing.Bitmap]::FromFile($file)
    try {
        $b = [UnitAssetProbe]::GetContentBounds($file, $AlphaThreshold)
        if ($b[2] -le 0 -or $b[3] -le 0) {
            Write-Warning "No opaque pixels found in $file (skipping)"
            $missing += $id
            continue
        }

        $displayWidth = $WorldWidths[$id] * $PixelsPerMeter
        $aspect = $b[3] / $b[2]
        $results += [pscustomobject]@{
            Id           = $id
            CanvasW      = $img.Width
            CanvasH      = $img.Height
            ContentX     = $b[0]
            ContentY     = $b[1]
            ContentW     = $b[2]
            ContentH     = $b[3]
            WorldWidthM  = $WorldWidths[$id]
            DisplayWidth = [math]::Round($displayWidth, 1)
            DisplayHeight= [math]::Round($displayWidth * $aspect, 1)
            OriginX      = [math]::Round(($b[0] + $b[2] / 2) / $img.Width, 4)
            OriginY      = [math]::Round(($b[1] + $b[3] / 2) / $img.Height, 4)
        }
    }
    finally {
        $img.Dispose()
    }
}

if ($missing.Count -gt 0) {
    Write-Warning ("Missing unit textures: " + ($missing -join ', '))
}
if ($results.Count -eq 0) {
    throw "No unit textures processed - check -AssetsDir ($AssetsDir)"
}

# Card artwork gets the same treatment: trimmed bounds so icons are fitted by
# silhouette instead of being squashed into an 80x60 box.
$cardResults = @()
Get-ChildItem (Join-Path $AssetsDir 'card_*.png') -File | ForEach-Object {
    $cardId = $_.BaseName -replace '^card_', ''
    $b = [UnitAssetProbe]::GetContentBounds($_.FullName, $AlphaThreshold)
    if ($b[2] -le 0 -or $b[3] -le 0) { return }

    $cardImg = [System.Drawing.Bitmap]::FromFile($_.FullName)
    try {
        $cardResults += [pscustomobject]@{
            Id       = $cardId
            CanvasW  = $cardImg.Width
            CanvasH  = $cardImg.Height
            ContentX = $b[0]
            ContentY = $b[1]
            ContentW = $b[2]
            ContentH = $b[3]
        }
    }
    finally {
        $cardImg.Dispose()
    }
}

# ---------------------------------------------------------------------------
# Emit JS metrics module
# ---------------------------------------------------------------------------
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('/**')
$lines.Add(' * Unit texture metrics - AUTO-GENERATED by tools/normalize-units.ps1')
$lines.Add(' * Do not edit by hand: re-run the script after adding or replacing unit art.')
$lines.Add(' *')
$lines.Add(' * Generated unit PNGs are square canvases with inconsistent transparent padding.')
$lines.Add(' * Renderers must scale by trimmed content width and pivot on the content centre,')
$lines.Add(' * otherwise relative unit size is decided by how tightly the art was cropped.')
$lines.Add(' */')
$lines.Add('')
$lines.Add('const UNIT_SCALE = {')
$lines.Add("    PX_PER_METER: $PixelsPerMeter   // 1 tile = 20 px, so a Tiger hull is ~2 tiles wide")
$lines.Add('};')
$lines.Add('')
$lines.Add('const UNIT_METRICS = {')
foreach ($r in $results) {
    $lines.Add(("    {0}: {{ canvasW: {1}, canvasH: {2}, contentX: {3}, contentY: {4}, contentW: {5}, contentH: {6}, worldWidthM: {7} }}," -f `
        $r.Id, $r.CanvasW, $r.CanvasH, $r.ContentX, $r.ContentY, $r.ContentW, $r.ContentH, $r.WorldWidthM))
}
$lines.Add('};')
$lines.Add('')
$lines.Add('// Card artwork is separate art but suffers the same padding problem.')
$lines.Add('const CARD_METRICS = {')
foreach ($r in $cardResults) {
    $lines.Add(("    {0}: {{ canvasW: {1}, canvasH: {2}, contentX: {3}, contentY: {4}, contentW: {5}, contentH: {6} }}," -f `
        $r.Id, $r.CanvasW, $r.CanvasH, $r.ContentX, $r.ContentY, $r.ContentW, $r.ContentH))
}
$lines.Add('};')
$lines.Add('')

$outDir = Split-Path $OutFile -Parent
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
Set-Content -Path $OutFile -Value ($lines -join [Environment]::NewLine) -Encoding UTF8

# ---------------------------------------------------------------------------
# Contact sheet preview: every unit at its normalized display size (4x zoom)
# ---------------------------------------------------------------------------
$zoom = 4
$tile = 20
$maxDw = ($results | Measure-Object -Property DisplayWidth -Maximum).Maximum
$maxDh = ($results | Measure-Object -Property DisplayHeight -Maximum).Maximum
$cellW = [int]($maxDw * $zoom) + 40
$labelH = 70
$artH = [int]($maxDh * $zoom)
$tileBandH = $tile * $zoom + 24
$cellH = $labelH + $artH + $tileBandH
$sheetW = [int]($cellW * $results.Count) + 40
$sheetH = $cellH + 60

$sheet = New-Object System.Drawing.Bitmap($sheetW, $sheetH)
$g = [System.Drawing.Graphics]::FromImage($sheet)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::FromArgb(26, 39, 68))

# Checkerboard so transparency is obvious
$dark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(34, 50, 84))
$light = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 58, 96))
$check = 24
for ($cy = 0; $cy -lt $sheetH; $cy += $check) {
    for ($cx = 0; $cx -lt $sheetW; $cx += $check) {
        $brush = if ((($cx / $check) + ($cy / $check)) % 2 -eq 0) { $dark } else { $light }
        $g.FillRectangle($brush, $cx, $cy, $check, $check)
    }
}

$font = New-Object System.Drawing.Font('Consolas', 11)
$fontSmall = New-Object System.Drawing.Font('Consolas', 9)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(241, 245, 249))
$mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(148, 163, 184))
$tilePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 96, 165, 250), 1)

$i = 0
foreach ($r in $results) {
    $x = 20 + $i * $cellW
    $file = Join-Path $AssetsDir ("unit_" + $r.Id + ".png")
    $img = [System.Drawing.Bitmap]::FromFile($file)
    $premul = [UnitAssetProbe]::ToPremultiplied($img)
    try {
        $dw = $r.DisplayWidth * $zoom
        $dh = $r.DisplayHeight * $zoom
        $dx = $x + ($cellW - $dw) / 2
        $dy = $labelH + ($artH - $dh)
        $g.DrawImage($premul, [single]$dx, [single]$dy, [single]$dw, [single]$dh)

        # 20px tile reference at the same zoom, centred under each unit
        $tileX = $x + ($cellW - $tile * $zoom) / 2
        $tileY = $labelH + $artH + 8
        $g.DrawRectangle($tilePen, [single]$tileX, [single]$tileY, [single]($tile * $zoom), [single]($tile * $zoom))

        $g.DrawString($r.Id, $font, $textBrush, [single]($x + 10), [single]10)
        $g.DrawString(("w {0}px  h {1}px  ({2}m)" -f $r.DisplayWidth, $r.DisplayHeight, $r.WorldWidthM), $fontSmall, $mutedBrush, [single]($x + 10), [single]30)
        $g.DrawString(("content {0}x{1}" -f $r.ContentW, $r.ContentH), $fontSmall, $mutedBrush, [single]($x + 10), [single]46)
    }
    finally {
        $premul.Dispose()
        $img.Dispose()
    }
    $i++
}

$g.DrawString(("Normalized unit scale - {0} px per metre, 1 tile = {1} px - shown at {2}x" -f $PixelsPerMeter, $tile, $zoom), $font, $textBrush, [single]20, [single]($sheetH - 24))
$g.Dispose()

$previewDir = Split-Path $PreviewFile -Parent
if (-not (Test-Path $previewDir)) { New-Item -ItemType Directory -Path $previewDir -Force | Out-Null }
$sheet.Save($PreviewFile, [System.Drawing.Imaging.ImageFormat]::Png)
$sheet.Dispose()

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
$results | Format-Table Id, CanvasW, ContentW, ContentH, WorldWidthM, DisplayWidth, DisplayHeight, OriginX, OriginY -AutoSize
Write-Host ""
Write-Host "Wrote $OutFile"
Write-Host "Preview: $PreviewFile"
