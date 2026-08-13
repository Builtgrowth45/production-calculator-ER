# Write the 1.8 stats into game_data.json and its JS mirror.
#
# Surgical text edits, not a reparse-and-rewrite: ConvertTo-Json would reflow the
# whole 700KB file and quietly change number formatting (300.0 -> 300), turning a
# stats update into an unreviewable diff.
$sp = "C:\Users\chris\AppData\Local\Temp\claude\C--Users-chris-Desktop-estella-sweet-website\20f25570-ca3c-440b-9b07-66ed683ae4d7\scratchpad"
. "$sp\xlsx.ps1"
$repo = "C:\Users\chris\Desktop\production-calculator"

function Key([string]$s) { ($s.ToLower() -replace '[^a-z0-9]', '') }
function Loose([string]$s) {
    $k = $s.ToLower(); $k = $k -replace '\((male|female)\)', ''; $k = $k -replace '[^a-z0-9]', ''
    $k = $k -replace 'medikit', 'medkit'; $k = $k -replace 'armor$', ''
    $k = $k -replace 'ium$', 'um'; $k = $k -replace 'll', 'l'; $k = $k -replace 's$', ''; $k
}
$aliases = @{
    'detox combat helmet' = 'Detox Helmet'; 'detox combat shoulder pads' = 'Detox Shoulder Pads'
    'detox combat arm pads' = 'Detox Arm Pads'; 'detox combat torso armor' = 'Detox Torso'
    'detox combat leg pads' = 'Detox Leg Pads'; 'detox combat gloves' = 'Detox Gloves'
    'premet tremor helmet' = 'PreMet Helmet'
    'locans stabilized shoulder pads' = 'Locans Stabilized Shoulder'
    'dilatant 50b assault leg pads' = 'Dilatant 50b Leg Pads'
    'infostyle gloves' = 'Infostyle Gloves Gloves'
    'aramid altered leg pads' = 'Aramid Tremor Leg Pads'
}
$gd = Get-Content "$repo\data\game_data.json" -Raw | ConvertFrom-Json
$outputs = @($gd.recipes | ForEach-Object { $_.output.item } | Sort-Object -Unique)
$byKey = @{}; $byLoose = @{}
foreach ($o in $outputs) { $byKey[(Key $o)] = $o; $lk = Loose $o; if (-not $byLoose.ContainsKey($lk)) { $byLoose[$lk] = $o } }
function Resolve([string]$n) {
    if ($byKey.ContainsKey((Key $n))) { return $byKey[(Key $n)] }
    $a = ($n.ToLower() -replace '\s*\((male|female)\)\s*', '').Trim()
    if ($aliases.ContainsKey($a)) { return $aliases[$a] }
    if ($byLoose.ContainsKey((Loose $n))) { return $byLoose[(Loose $n)] }
    return $null
}

$rows = Read-Xlsx "$repo\stats\1.8.xlsx"
$hdr = $rows[0].cells
$data = @($rows | Select-Object -Skip 1 | Where-Object { $_.cells[1] })

# item -> ordered stat pairs from the sheet
$want = @{}
foreach ($d in $data) {
    $r = Resolve $d.cells[1].Trim()
    if (-not $r -or $want.ContainsKey($r)) { continue }
    $pairs = @()
    for ($i = 2; $i -lt $hdr.Count; $i++) {
        if (-not $hdr[$i]) { continue }
        $v = $d.cells[$i]
        if ($v -eq '' -or $null -eq $v) { continue }
        $pairs += [pscustomobject]@{ k = $hdr[$i].ToLower(); v = [double]$v }
    }
    if ($pairs.Count) { $want[$r] = $pairs }
}
"items with 1.8 stats to write: $($want.Count)"

function Apply-Stats {
    param([string]$Path)
    $t = [System.IO.File]::ReadAllText($Path)
    $updated = 0; $inserted = 0; $missed = @()

    foreach ($item in ($want.Keys | Sort-Object)) {
        $esc = [regex]::Escape($item)
        $m = [regex]::Match($t, '"output":\s*\{\s*\r?\n\s*"item":\s*"' + $esc + '"\s*,')
        if (-not $m.Success) { $missed += $item; continue }

        # indentation of the "item" line tells us how the sibling keys are laid out
        $lineStart = $t.LastIndexOf("`n", $m.Index + $m.Length - 1) + 1
        $itemLine = $t.Substring($lineStart, $t.IndexOf("`n", $lineStart) - $lineStart)
        $indent = ($itemLine -replace '\S.*$', '')

        $block = '"stats":  {' + "`r`n" +
                 (($want[$item] | ForEach-Object { $indent + '              "' + $_.k + '":  ' + $_.v }) -join ",`r`n") +
                 "`r`n" + $indent + '          }'

        # existing stats object inside THIS output block?
        $outEnd = $t.IndexOf('},', $m.Index)
        $sIdx = $t.IndexOf('"stats":', $m.Index)
        if ($sIdx -ge 0 -and $sIdx -lt $t.IndexOf('"process":', $m.Index)) {
            # walk braces from the opening one to find the end of the object
            $open = $t.IndexOf('{', $sIdx)
            $depth = 0; $end = -1
            for ($i = $open; $i -lt $t.Length; $i++) {
                if ($t[$i] -eq '{') { $depth++ }
                elseif ($t[$i] -eq '}') { $depth--; if ($depth -eq 0) { $end = $i; break } }
            }
            if ($end -lt 0) { $missed += $item; continue }
            $t = $t.Remove($sIdx, $end - $sIdx + 1).Insert($sIdx, $block)
            $updated++
        } else {
            # No stats yet. Insert immediately before the output object's own
            # closing brace — anchoring on a named key instead put the block
            # after "quantity" and therefore BEFORE "category", with no comma
            # between them, which is invalid and silently corrupts the file.
            $open = $t.IndexOf('{', $m.Index)
            $depth = 0; $close = -1
            for ($i = $open; $i -lt $t.Length; $i++) {
                if ($t[$i] -eq '{') { $depth++ }
                elseif ($t[$i] -eq '}') { $depth--; if ($depth -eq 0) { $close = $i; break } }
            }
            if ($close -lt 0) { $missed += $item; continue }
            # back up over the whitespace before the brace to reach the last value
            $tail = $close - 1
            while ($tail -gt 0 -and [char]::IsWhiteSpace($t[$tail])) { $tail-- }
            $ins = ',' + "`r`n" + $indent + $block
            $t = $t.Insert($tail + 1, $ins)
            $inserted++
        }
    }
    [System.IO.File]::WriteAllText($Path, $t, (New-Object System.Text.UTF8Encoding $false))
    [pscustomobject]@{ file = (Split-Path $Path -Leaf); updated = $updated; inserted = $inserted; missed = $missed.Count }
}

Apply-Stats "$repo\data\game_data.json" | Format-List
