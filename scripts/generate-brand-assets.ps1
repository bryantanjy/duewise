Add-Type -AssemblyName System.Drawing

$assetRoot = Join-Path $PSScriptRoot '../assets/images'
$assetRoot = [System.IO.Path]::GetFullPath($assetRoot)

function New-Color([string] $hex) {
  return [System.Drawing.ColorTranslator]::FromHtml($hex)
}

function Write-BrandImage([string] $name, [int] $size, [bool] $background, [bool] $tile, [bool] $monochrome) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.ScaleTransform($size / 100.0, $size / 100.0)

    if ($background) {
      $graphics.FillRectangle([System.Drawing.SolidBrush]::new((New-Color '#3B3468')), 0, 0, 100, 100)
      $bitmap.Save((Join-Path $assetRoot $name), [System.Drawing.Imaging.ImageFormat]::Png)
      return
    }

    if ($tile) {
      $tilePath = [System.Drawing.Drawing2D.GraphicsPath]::new()
      $tilePath.AddArc(0, 0, 54, 54, 180, 90)
      $tilePath.AddArc(46, 0, 54, 54, 270, 90)
      $tilePath.AddArc(46, 46, 54, 54, 0, 90)
      $tilePath.AddArc(0, 46, 54, 54, 90, 90)
      $tilePath.CloseFigure()
      $graphics.FillPath([System.Drawing.SolidBrush]::new((New-Color '#5B50C5')), $tilePath)
      $tilePath.Dispose()
    }

    if ($name -eq 'icon.png' -or $name -eq 'favicon.png') {
      $graphics.FillRectangle([System.Drawing.SolidBrush]::new((New-Color '#3B3468')), 0, 0, 100, 100)
    }

    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddLine(34, 30, 34, 70)
    $path.AddLine(34, 70, 48, 70)
    $path.AddBezier(48, 70, 62, 70, 71, 62, 71, 50)
    $path.AddBezier(71, 50, 71, 38, 62, 30, 48, 30)
    $path.AddLine(48, 30, 34, 30)
    $stroke = [System.Drawing.Pen]::new([System.Drawing.Color]::White, 7)
    $stroke.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $stroke.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $stroke.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawPath($stroke, $path)
    $dotColor = if ($monochrome) { [System.Drawing.Color]::White } else { New-Color '#F0C78C' }
    $graphics.FillEllipse([System.Drawing.SolidBrush]::new($dotColor), 68, 26, 11, 11)

    $bitmap.Save((Join-Path $assetRoot $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $stroke.Dispose()
    $path.Dispose()
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

Write-BrandImage 'icon.png' 1024 $false $false $false
Write-BrandImage 'android-icon-foreground.png' 1024 $false $false $false
Write-BrandImage 'android-icon-background.png' 1024 $true $false $false
Write-BrandImage 'android-icon-monochrome.png' 1024 $false $false $true
Write-BrandImage 'splash-icon.png' 512 $false $true $false
Write-BrandImage 'favicon.png' 64 $false $false $false
