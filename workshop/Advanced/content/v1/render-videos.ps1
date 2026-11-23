param(
    [ValidateSet('Foundry','LocalPreview')][string]$Voice = 'Foundry',
    [ValidateSet('both','child','trainer')][string]$Only = 'both',
    [string]$Python = 'python'
)
$ErrorActionPreference = 'Stop'
& $Python -B -c "import PIL, numpy, pptx, imageio_ffmpeg, subprocess; subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-version'], stdout=subprocess.DEVNULL, check=True)"
if ($LASTEXITCODE -ne 0) {
    throw "Media preflight failed. Install renderer packages with: & '$Python' -m pip install --user pillow numpy python-pptx imageio-ffmpeg"
}
$deck = (Resolve-Path (Join-Path $PSScriptRoot '..\..\Advanced Workshop Deck v1.pptx')).Path
$build = Join-Path ([IO.Path]::GetTempPath()) ('chronicle-v1-' + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory $build
$previousToken = $env:CHRONICLE_AUDIO_TOKEN
try {
    if ($Voice -eq 'Foundry' -and !$previousToken) {
        $secret = Read-Host 'Azure application secret (input is hidden)' -AsSecureString
        $cred = [Net.NetworkCredential]::new('', $secret)
        $body = @{grant_type='client_credentials';client_id='ed2bde81-6b45-419a-9fc7-41928e32969b';client_secret=$cred.Password;scope='https://cognitiveservices.azure.com/.default'}
        try {
            $auth = Invoke-RestMethod -Method Post -Uri 'https://login.microsoftonline.com/d903f0be-b963-41e1-9a9d-61b45a21129d/oauth2/v2.0/token' -MaximumRedirection 0 -Body $body -ErrorAction Stop
            $env:CHRONICLE_AUDIO_TOKEN = $auth.access_token
        } catch { throw 'Azure application authentication failed. No media request was sent.' }
        finally { $body.Clear(); $secret.Dispose(); $cred=$null; $auth=$null }
    }
    $app=$null; $pres=$null; $mine=$false
    $running=@(Get-Process POWERPNT -ErrorAction SilentlyContinue).Count
    try {
        try {$app=[Runtime.InteropServices.Marshal]::GetActiveObject('PowerPoint.Application')}
        catch {$app=New-Object -ComObject PowerPoint.Application; $mine=(!$running -and !$app.Presentations.Count)}
        foreach ($open in $app.Presentations) {
            if ($open.FullName -eq $deck) {throw 'Close only the generated deck before rendering; source decks may remain open.'}
        }
        $pres=$app.Presentations.Open($deck,-1,0,0)
        $height=[int][math]::Round(1920*$pres.PageSetup.SlideHeight/$pres.PageSetup.SlideWidth)
        for ($i=1;$i -le $pres.Slides.Count;$i++) {
            $pres.Slides.Item($i).Export((Join-Path $build "Slide$i.png"),'PNG',1920,$height)
        }
    } finally {
        if ($pres) {$pres.Close()}
        if ($mine -and $app -and !$app.Presentations.Count) {$app.Quit()}
        if ($app) {$null=[Runtime.InteropServices.Marshal]::ReleaseComObject($app)}
    }
    & $Python -B (Join-Path $PSScriptRoot 'render_videos.py') $build $Voice $Only
    if ($LASTEXITCODE -ne 0) {throw 'Video build failed.'}
} finally {
    $env:CHRONICLE_AUDIO_TOKEN=$previousToken
    if ($build -and (Test-Path -LiteralPath $build)) {Remove-Item -LiteralPath $build -Recurse -Force}
}
