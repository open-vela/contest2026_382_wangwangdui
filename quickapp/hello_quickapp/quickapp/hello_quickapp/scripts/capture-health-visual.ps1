[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('xiaomi_band', 'xiaomi_band_10')]
  [string]$Device,
  [string]$Serial = '',
  [string]$OutputDirectory = 'outputs\health_visual\current'
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$adbPath = Join-Path $env:USERPROFILE '.vela\sdk\tools\adb\win\adb.exe'

if (-not (Test-Path -LiteralPath $adbPath)) {
  throw "ADB not found: $adbPath"
}

if (-not $Serial) {
  $serials = @()
  $deviceLines = & $adbPath devices
  foreach ($line in $deviceLines) {
    if ($line -match '^(emulator-\d+)\s+device$') {
      $serials += $Matches[1]
    }
  }
  if ($serials.Count -ne 1) {
    throw 'Pass -Serial when zero or multiple emulators are connected.'
  }
  $Serial = $serials[0]
}

$resolvedOutputDirectory = Join-Path $projectRoot $OutputDirectory
New-Item -ItemType Directory -Force -Path $resolvedOutputDirectory | Out-Null
$outputFile = Join-Path $resolvedOutputDirectory ($Device + '.png')

Write-Output 'Open the Health Status page and keep it at the top before capture.'
& $adbPath -s $Serial emu screenrecord screenshot $outputFile
if ($LASTEXITCODE -ne 0) {
  throw "Screenshot failed for $Serial"
}

& node (Join-Path $PSScriptRoot 'check-health-visual.js') ($Device + '=' + $outputFile)
if ($LASTEXITCODE -ne 0) {
  throw 'Health visual regression failed.'
}

Write-Output "Captured and checked $Device on $Serial`: $outputFile"
