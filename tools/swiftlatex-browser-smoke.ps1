param(
  [string]$ChromePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe',
  [string]$TestUrl = 'http://127.0.0.1:5500/tests/swiftlatex-smoke.html',
  [string]$DownloadPath = "$env:TEMP\luma-swiftlatex-download",
  [int]$Port = 9223,
  [int]$TimeoutSeconds = 300
)

$ErrorActionPreference = 'Stop'
$profilePath = Join-Path $env:TEMP "luma-swiftlatex-cdp-$Port"
New-Item -ItemType Directory -Path $profilePath -Force | Out-Null
New-Item -ItemType Directory -Path $DownloadPath -Force | Out-Null
$outputPdf = Join-Path $DownloadPath 'swiftlatex-smoke.pdf'
if (Test-Path -LiteralPath $outputPdf) { Remove-Item -LiteralPath $outputPdf -Force }

$arguments = @(
  '--headless=new', '--disable-gpu', '--no-first-run', '--disable-default-apps',
  "--remote-debugging-port=$Port", "--user-data-dir=$profilePath", $TestUrl
)
$chrome = Start-Process -FilePath $ChromePath -ArgumentList $arguments -WindowStyle Hidden -PassThru
$socket = $null

function Receive-CdpMessage([System.Net.WebSockets.ClientWebSocket]$Client) {
  $buffer = New-Object byte[] 65536
  $stream = New-Object System.IO.MemoryStream
  do {
    $segment = [ArraySegment[byte]]::new($buffer)
    $result = $Client.ReceiveAsync($segment, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) { throw 'Chrome DevTools connection closed.' }
    $stream.Write($buffer, 0, $result.Count)
  } until ($result.EndOfMessage)
  [Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
}

function Invoke-Cdp([System.Net.WebSockets.ClientWebSocket]$Client, [int]$Id, [string]$Method, $Parameters) {
  $message = @{id=$Id; method=$Method; params=$Parameters} | ConvertTo-Json -Compress -Depth 8
  $bytes = [Text.Encoding]::UTF8.GetBytes($message)
  $Client.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
  do { $response = Receive-CdpMessage $Client } until ($response.id -eq $Id)
  if ($response.error) { throw "CDP $Method failed: $($response.error.message)" }
  $response.result
}

try {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    try {
      $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/list" -TimeoutSec 2
      $target = $targets | Where-Object { $_.type -eq 'page' -and $_.url -eq $TestUrl } | Select-Object -First 1
      if ($target) { break }
    } catch { }
    Start-Sleep -Milliseconds 250
  } until ((Get-Date) -ge $deadline)
  if (-not $target) { throw 'Chrome smoke-test page did not become available.' }

  $socket = [System.Net.WebSockets.ClientWebSocket]::new()
  $socket.ConnectAsync([Uri]$target.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
  $requestId = 1
  do {
    $evaluation = Invoke-Cdp $socket $requestId 'Runtime.evaluate' @{expression="document.getElementById('status')?.textContent || ''"; returnByValue=$true}
    $requestId++
    $status = [string]$evaluation.result.value
    Write-Output "STATUS=$status"
    if ($status.StartsWith('success:') -or $status.StartsWith('failure:')) { break }
    Start-Sleep -Seconds 2
  } until ((Get-Date) -ge $deadline)

  if ($status.StartsWith('failure:')) {
    $logResult = Invoke-Cdp $socket $requestId 'Runtime.evaluate' @{expression="document.getElementById('log')?.textContent || ''"; returnByValue=$true}
    Write-Output "LOG=$([string]$logResult.result.value)"
    exit 1
  }
  if (-not $status.StartsWith('success:')) { throw 'SwiftLaTeX smoke test timed out.' }

  $phaseResult = Invoke-Cdp $socket $requestId 'Runtime.evaluate' @{expression="JSON.stringify(window.smokePhases || [])"; returnByValue=$true}
  $requestId++
  Write-Output "PHASES=$([string]$phaseResult.result.value)"

  $null = Invoke-Cdp $socket $requestId 'Browser.setDownloadBehavior' @{behavior='allow'; downloadPath=$DownloadPath; eventsEnabled=$true}
  $requestId++
  $null = Invoke-Cdp $socket $requestId 'Runtime.evaluate' @{expression="document.getElementById('download').click()"; returnByValue=$true}
  do {
    Start-Sleep -Milliseconds 250
  } until ((Test-Path -LiteralPath $outputPdf) -or (Get-Date) -ge $deadline)
  if (-not (Test-Path -LiteralPath $outputPdf)) { throw 'Generated PDF download did not complete.' }
  $item = Get-Item -LiteralPath $outputPdf
  Write-Output "PDF=$($item.FullName)"
  Write-Output "PDF_BYTES=$($item.Length)"
} finally {
  if ($socket) { $socket.Dispose() }
  if ($chrome -and -not $chrome.HasExited) { Stop-Process -Id $chrome.Id -Force }
}
