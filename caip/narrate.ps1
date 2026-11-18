param([string]$Root = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$story = Get-Content -LiteralPath (Join-Path $Root 'story.json') -Raw | ConvertFrom-Json
$audio = Join-Path $Root '.build\audio'
New-Item -ItemType Directory -Force -Path $audio | Out-Null
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$segments = [System.Collections.Generic.List[object]]::new()
try {
    $synth.SelectVoice('Microsoft Zira Desktop')
    $synth.Rate = 1
    $format = [System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(
        24000,
        [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,
        [System.Speech.AudioFormat.AudioChannel]::Mono)
    for ($i = 0; $i -lt $story.slides.Count; $i++) {
        $sentences = [regex]::Split($story.slides[$i].narration, '(?<=[.!?])\s+')
        for ($j = 0; $j -lt $sentences.Count; $j++) {
            $file = Join-Path $audio ("s{0:D2}-{1:D2}.wav" -f ($i+1), ($j+1))
            $synth.SetOutputToWaveFile($file, $format)
            $synth.Speak($sentences[$j])
            $synth.SetOutputToNull()
            $segments.Add([pscustomobject]@{
                slide = $i + 1
                text = $sentences[$j]
                wav = $file
            })
        }
    }
} finally {
    $synth.Dispose()
}
$segments | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $Root '.build\segments.json') -Encoding utf8
Write-Output "Generated $($segments.Count) offline narration segments using Microsoft Zira Desktop."
