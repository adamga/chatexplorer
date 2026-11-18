param(
    [Parameter(Mandatory = $true)][string]$Deck,
    [Parameter(Mandatory = $true)][string]$Out,
    [int]$Width = 1600
)

$ErrorActionPreference = 'Stop'
$deckPath = [System.IO.Path]::GetFullPath($Deck)
$outPath = [System.IO.Path]::GetFullPath($Out)

if (-not (Test-Path -LiteralPath $deckPath)) {
    throw "Deck not found: $deckPath"
}

if (Test-Path -LiteralPath $outPath) {
    Get-ChildItem -LiteralPath $outPath -Force | Remove-Item -Recurse -Force
} else {
    New-Item -ItemType Directory -Force -Path $outPath | Out-Null
}

$startedOwnApp = $false
$app = $null
$pres = $null

try {
    try {
        $app = [System.Runtime.InteropServices.Marshal]::GetActiveObject('PowerPoint.Application')
    } catch {
        $app = New-Object -ComObject PowerPoint.Application
        $startedOwnApp = $true
    }

    # Open read-only, untitled=false, withWindow=false so we never disturb any user PowerPoint window
    $pres = $app.Presentations.Open($deckPath, -1, 0, 0)
    $height = [int][Math]::Round($Width * ($pres.PageSetup.SlideHeight / $pres.PageSetup.SlideWidth))

    $count = $pres.Slides.Count
    for ($i = 1; $i -le $count; $i++) {
        $slidePng = Join-Path $outPath ("Slide{0}.PNG" -f $i)
        $pres.Slides.Item($i).Export($slidePng, 'PNG', $Width, $height)
    }
    Write-Output "Exported $count slides from $([System.IO.Path]::GetFileName($deckPath)) to $outPath (${Width}x${height})"
} finally {
    if ($null -ne $pres) {
        try { $pres.Close() } catch {}
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($pres)
    }
    if ($startedOwnApp -and $null -ne $app) {
        try { $app.Quit() } catch {}
    }
    if ($null -ne $app) {
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($app)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
