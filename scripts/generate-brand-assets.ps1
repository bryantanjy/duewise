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
    $points = [System.Drawing.PointF[]]@(
      [System.Drawing.PointF]::new(31, 25), [System.Drawing.PointF]::new(49, 25),
      [System.Drawing.PointF]::new(65, 25), [System.Drawing.PointF]::new(76, 36),
      [System.Drawing.PointF]::new(76, 50), [System.Drawing.PointF]::new(76, 64),
      [System.Drawing.PointF]::new(65, 75), [System.Drawing.PointF]::new(49, 75)
    )
    $path.AddLine(31, 25, 31, 75)
    $path.AddLine(31, 75, 49, 75)
    $path.AddBezier($points[7], $points[6], $points[5], $points[4])
    $path.AddBezier($points[4], $points[3], $points[2], $points[1])
    $path.AddLine(49, 25, 31, 25)
    $stroke = [System.Drawing.Pen]::new([System.Drawing.Color]::White, 8)
    $stroke.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $stroke.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $stroke.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawPath($stroke, $path)
    $dotColor = if ($monochrome) { [System.Drawing.Color]::White } else { New-Color '#F0C78C' }
    $graphics.FillEllipse([System.Drawing.SolidBrush]::new($dotColor), 69, 20, 14, 14)

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
