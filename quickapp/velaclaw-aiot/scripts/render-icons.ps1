param(
  [string[]]$Names = @('calendar', 'diagnostics', 'motion')
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$chromeCandidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
)
$browser = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) {
  throw 'Chrome or Edge was not found.'
}

Add-Type -AssemblyName System.Drawing
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' } |
  Select-Object -First 1
$quality = [System.Drawing.Imaging.Encoder]::Quality

foreach ($name in $Names) {
  $svgPath = Join-Path $root "assets\icons\$name.svg"
  $jpgPath = Join-Path $root "src\common\icons\$name.jpg"
  if (-not (Test-Path $svgPath)) {
    throw "Missing SVG icon: $svgPath"
  }

  $pngPath = Join-Path $env:TEMP "vela-band-$name-$PID.png"
  $uri = ([System.Uri](Resolve-Path $svgPath).Path).AbsoluteUri
  & $browser --headless --disable-gpu --hide-scrollbars --default-background-color=000000 --window-size=96,96 "--screenshot=$pngPath" $uri | Out-Null
  if (-not (Test-Path $pngPath)) {
    throw "Browser did not render PNG: $name"
  }

  $source = [System.Drawing.Image]::FromFile($pngPath)
  $bitmap = New-Object System.Drawing.Bitmap 96, 96
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Black)
  $graphics.DrawImage($source, 0, 0, 96, 96)
  $encoderParameters = New-Object System.Drawing.Imaging.EncoderParameters 1
  $encoderParameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($quality, 92L)
  $bitmap.Save($jpgPath, $jpegCodec, $encoderParameters)

  $encoderParameters.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
  $source.Dispose()
  Remove-Item -LiteralPath $pngPath
  Write-Output "Rendered $jpgPath"
}
