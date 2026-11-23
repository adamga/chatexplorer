param([string]$Manifest,[string]$Role)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Speech
$s=New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    if ($Role -eq 'child') {$s.SelectVoice('Microsoft Zira Desktop'); $s.Rate=-1}
    else {$s.SelectVoice('Microsoft David Desktop'); $s.Rate=0}
    $fmt=[System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(24000,[System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,[System.Speech.AudioFormat.AudioChannel]::Mono)
    foreach ($item in (Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json)) {
        if (Test-Path -LiteralPath $item.path) {continue}
        $s.SetOutputToWaveFile(($item.path+'.part'),$fmt)
        $s.Speak($item.text)
        $s.SetOutputToNull()
        Move-Item -LiteralPath ($item.path+'.part') -Destination $item.path
    }
} finally {$s.Dispose()}
