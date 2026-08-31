[CmdletBinding()]
param(
  [string]$Avd = 'mi-band10',
  [string]$Serial = '',
  [string]$Package = 'com.application.watch.demo'
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$adbPath = Join-Path $env:USERPROFILE '.vela\sdk\tools\adb\win\adb.exe'
$sessionRoot = Join-Path $env:USERPROFILE '.vela\sessions'

if (-not (Test-Path -LiteralPath $adbPath)) {
  throw "ADB not found: $adbPath"
}

if (-not $Serial) {
  $deviceLines = & $adbPath devices
  foreach ($line in $deviceLines) {
    if ($line -notmatch '^(emulator-\d+)\s+device$') {
      continue
    }
    $candidateSerial = $Matches[1]
    $nameOutput = & $adbPath -s $candidateSerial emu avd name 2>$null
    $candidateName = ($nameOutput | Select-Object -First 1).Trim()
    if ($candidateName -eq $Avd) {
      $Serial = $candidateSerial
      break
    }
  }
}

if (-not $Serial) {
  throw "Running AVD not found: $Avd"
}

$brokerSession = $null
$sessionFiles = Get-ChildItem -LiteralPath $sessionRoot -Filter 'broker-window-*.json' -File | Sort-Object LastWriteTime -Descending
foreach ($sessionFile in $sessionFiles) {
  $candidate = Get-Content -Raw -Encoding utf8 -LiteralPath $sessionFile.FullName | ConvertFrom-Json
  $candidateProject = [System.IO.Path]::GetFullPath([string]$candidate.projectPath).TrimEnd('\')
  if ($candidateProject -ine $projectRoot.TrimEnd('\')) {
    continue
  }
  if (-not (Get-Process -Id ([int]$candidate.pid) -ErrorAction SilentlyContinue)) {
    continue
  }
  $brokerSession = $candidate
  break
}

if (-not $brokerSession) {
  throw 'No active AIoT IDE broker session found for this project.'
}

$debugConfig = [ordered]@{
  mqttHost = [string]$brokerSession.mqttHost
  mqttPort = [int]$brokerSession.mqttPort
  device = 'vela_emulator_' + $Avd
} | ConvertTo-Json -Compress

$tempConfig = Join-Path ([System.IO.Path]::GetTempPath()) ('quickapp_debug_cfg_' + [guid]::NewGuid().ToString('N') + '.json')
try {
  [System.IO.File]::WriteAllText($tempConfig, $debugConfig, (New-Object System.Text.UTF8Encoding($false)))
  & $adbPath -s $Serial push $tempConfig /tmp/quickapp_debug_cfg.json
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to push Quick App debug configuration.'
  }
  & $adbPath -s $Serial shell am start $Package
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to start package: $Package"
  }
} finally {
  if (Test-Path -LiteralPath $tempConfig) {
    Remove-Item -LiteralPath $tempConfig -Force
  }
}

Write-Output "Started $Package on $Avd ($Serial)."
