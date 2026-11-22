# Offline native proof: never attach to an existing PowerPoint session.
# No output is written into the repository. All proofs are under a new temp folder.
param([string]$Content = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = 'Stop'
if (@(Get-Process POWERPNT -ErrorAction SilentlyContinue).Count) {
    throw 'PowerPoint is already running. Not opening, exporting, or closing anything.'
}
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class ChronicleProofWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint id);
}
'@
$out = Join-Path ([IO.Path]::GetTempPath()) ('build_decks_proof_' + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory $out
$app = $null; $mine = $false; $pres = $null
$issues = @()
try {
    $openedAt = Get-Date
    $app = New-Object -ComObject PowerPoint.Application
    [uint32]$officeId = 0
    $null = [ChronicleProofWindow]::GetWindowThreadProcessId([IntPtr]$app.HWND,[ref]$officeId)
    if (!$officeId -or (Get-Process -Id $officeId).StartTime -lt $openedAt.AddSeconds(-1) -or $app.Presentations.Count -ne 0) {
        throw 'Could not verify a fresh empty PowerPoint instance. No presentation was opened.'
    }
    $mine = $true
    foreach ($role in 'Presenter','Attendee') {
        $src = (Resolve-Path (Join-Path $Content "Advanced-$role.pptx")).Path
        $pres = $app.Presentations.Open($src,-1,0,0)
        $dir = Join-Path $out $role; $null = New-Item -ItemType Directory $dir
        $count = $pres.Slides.Count
        for ($i=1; $i -le $count; $i++) {
            $slide = $pres.Slides.Item($i)
            $slide.Export((Join-Path $dir ('{0:00}.png' -f $i)),'PNG',1440,810)
            $boxes = @()
            foreach ($shape in $slide.Shapes) {
                if (!$shape.HasTextFrame -or !$shape.TextFrame.HasText) {continue}
                $rng = $shape.TextFrame.TextRange
                $r = [double]$rng.BoundLeft+$rng.BoundWidth
                $b = [double]$rng.BoundTop+$rng.BoundHeight
                # TextRange includes the advance of an invisible end-of-paragraph
                # mark. Allow up to one space horizontally, never vertically.
                $advance = [math]::Max(2,0.35*$rng.Font.Size)
                if ($b -gt ($shape.Top+$shape.Height+2) -or $r -gt ($shape.Left+$shape.Width+$advance)) {
                    $issues += "$role $i overflow: $($shape.Name)"
                }
                foreach ($box in $boxes) {
                    if ($box.R -gt $rng.BoundLeft+1 -and $r -gt $box.L+1 -and $box.B -gt $rng.BoundTop+1 -and $b -gt $box.T+1) {
                        $issues += "$role $i intersecting text: $($shape.Name) / $($box.Name)"
                    }
                }
                $boxes += [pscustomobject]@{R=$r;B=$b;L=$rng.BoundLeft;T=$rng.BoundTop;Name=$shape.Name}
            }
        }
        $pres.Close(); $pres=$null
        for ($start=1; $start -le $count; $start+=6) {
            $sheet=New-Object Drawing.Bitmap 1200,1014
            $g=[Drawing.Graphics]::FromImage($sheet)
            try {
                $g.Clear([Drawing.Color]::White)
                $g.InterpolationMode='HighQualityBicubic'
                for ($j=0; $j -lt 6 -and $start+$j -le $count; $j++) {
                    $file=Join-Path $dir ('{0:00}.png' -f ($start+$j))
                    $img=[Drawing.Image]::FromFile($file)
                    try {$g.DrawImage($img,(600*($j%2)),(338*[math]::Floor($j/2)),600,337)}
                    finally {$img.Dispose()}
                }
                $sheet.Save((Join-Path $out ("$role-{0:00}.jpg" -f $start)),[Drawing.Imaging.ImageFormat]::Jpeg)
            } finally {$g.Dispose(); $sheet.Dispose()}
        }
        Write-Output "$role : rendered $count pages"
    }
} finally {
    if ($pres) {$pres.Close()}
    if ($mine -and $app -and $app.Presentations.Count -eq 0) {$app.Quit()}
    if ($app) {$null=[Runtime.InteropServices.Marshal]::ReleaseComObject($app)}
}
Write-Output "Proof directory: $out"
if ($issues.Count) {$issues | Write-Output; throw "$($issues.Count) text bounds warnings"}
Write-Output 'All text boxes fit and no rendered text bounds intersect.'
