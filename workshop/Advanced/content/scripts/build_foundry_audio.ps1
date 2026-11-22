param(
    [Parameter(Mandatory=$true)][string]$TenantId,
    [Parameter(Mandatory=$true)][string]$SubscriptionId,
    [string]$Python = 'python',
    [switch]$SmokeTestOnly
)
$ErrorActionPreference = 'Stop'
Import-Module Az.Accounts
Disable-AzContextAutosave -Scope Process | Out-Null
$context = (Connect-AzAccount -Tenant $TenantId -Subscription $SubscriptionId -Scope Process).Context
if ($context.Subscription.Id -ne $SubscriptionId -or $context.Tenant.Id -ne $TenantId) {
    throw 'The selected Azure context does not match the requested tenant and subscription.'
}
$access = Get-AzAccessToken -TenantId $TenantId -ResourceUrl 'https://cognitiveservices.azure.com' -DefaultProfile $context
$oldToken = $env:CHRONICLE_AUDIO_TOKEN
$oldMode = $env:CHRONICLE_VOICE
$oldBytecode = $env:PYTHONDONTWRITEBYTECODE
Push-Location $PSScriptRoot
try {
    $env:PYTHONDONTWRITEBYTECODE = '1'
    $env:CHRONICLE_VOICE = 'foundry'
    if ($access.Token -is [System.Security.SecureString]) {
        $env:CHRONICLE_AUDIO_TOKEN = [System.Net.NetworkCredential]::new('', $access.Token).Password
    } else {
        $env:CHRONICLE_AUDIO_TOKEN = $access.Token
    }
    & $Python -c "from voice import narrate; from pathlib import Path; import wave; p=Path('../.cache/audio-smoke.wav'); print(narrate('Chronicle workshop audio check.',p)); w=wave.open(str(p)); assert w.getnframes()>0; print('Audio smoke test passed.')"
    if ($LASTEXITCODE -ne 0) { throw 'Audio smoke test failed. No video build was started.' }
    if (-not $SmokeTestOnly) {
        & $Python .\build_videos.py
        if ($LASTEXITCODE -ne 0) { throw 'Video build failed.' }
    }
} finally {
    Pop-Location
    $env:CHRONICLE_AUDIO_TOKEN = $oldToken
    $env:CHRONICLE_VOICE = $oldMode
    $env:PYTHONDONTWRITEBYTECODE = $oldBytecode
}
