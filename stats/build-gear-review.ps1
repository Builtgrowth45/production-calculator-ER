# Build stats/gear-review.xlsx — every armour piece with its classification,
# recipe, price and full 1.8 stat line, for reviewing and correcting by hand.
#
#   powershell -ExecutionPolicy Bypass -File stats\build-gear-review.ps1
#
# The Weight / Faction columns are the ones to correct. Anything changed there
# goes back into data/armor_classes.json (and its src mirror) — this file is a
# worksheet, not a source of truth, and nothing reads it at runtime.
$ErrorActionPreference = 'Stop'
$here = Split-Path $MyInvocation.MyCommand.Path -Parent
$repo = Split-Path $here -Parent
. "$here\write-xlsx.ps1"
. "$here\read-xlsx.ps1"

$gd  = Get-Content "$repo\data\game_data.json"     -Raw | ConvertFrom-Json
$ac  = Get-Content "$repo\data\armor_classes.json" -Raw | ConvertFrom-Json
$cost = Get-Content "$repo\data\costs.json"        -Raw | ConvertFrom-Json

$fams = @($ac.families | Sort-Object { $_.prefix.Length } -Descending)
function ClassOf($n) { foreach ($f in $fams) { if ($n.StartsWith($f.prefix)) { return $f } } return $null }
function HitsAny($n, $list) { foreach ($p in $list) { if ($n.StartsWith($p)) { return $true } } return $false }
$notInGame = @($ac.not_in_game.prefixes)
$noClass   = @($ac.no_class.prefixes)

# every stat key actually used, so the columns fit the data
$statKeys = @{}
foreach ($r in $gd.recipes) {
    if ($r.output.stats) { foreach ($p in $r.output.stats.PSObject.Properties) { if ($p.Name) { $statKeys[$p.Name] = $true } } }
}
$statCols = @($statKeys.Keys | Sort-Object)

$header = @('Item','Category','Faction','Slot','Weight','Weight source','Notes (yours)',
            'Price UC','Yield','Paths','Inputs (path 1)','Has icon') + $statCols
$rows = @( ,$header )

$armor = @($gd.recipes | Where-Object { $_.output.category -eq 'Armor' } | Sort-Object { $_._faction }, { $_._armor_type }, { $_.output.item })
foreach ($r in $armor) {
    $n = $r.output.item
    $f = ClassOf $n
    $weight = $(if ($f) { $f.weight } else { '' })
    $src = if ($f) { 'faction table' }
           elseif (HitsAny $n $notInGame) { 'NOT IN GAME' }
           elseif (HitsAny $n $noClass)   { 'no class (glove)' }
           else { 'UNCLASSIFIED - please set' }

    $paths = $(if ($r.inputs_alternatives) { $r.inputs_alternatives.Count } else { 1 })
    $first = $(if ($r.inputs_alternatives) { $r.inputs_alternatives[0] } else { $r.inputs })
    $inputs = (($first | ForEach-Object { "$($_.quantity) $($_.item)" }) -join ', ')

    $c = $cost.items.$n
    $price = ''; $yield = ''
    if ($c -and $c[0]) { $price = $c[0].uc; $yield = $c[0].y }

    $icon = $(if (Test-Path "$repo\icons\$($n.ToLower()).png") { 'yes' } else { 'no' })

    $row = @($n, $r.output.category, $r._faction, $r._armor_type, $weight, $src, '',
             $price, $yield, $paths, $inputs, $icon)
    foreach ($s in $statCols) {
        $v = ''
        if ($r.output.stats -and $r.output.stats.PSObject.Properties[$s]) { $v = $r.output.stats.$s }
        $row += $v
    }
    $rows += , $row
}

# 1.8 rows with no counterpart in the app, so the sheet shows the whole picture
$notInApp = @()
$p = "$here\not-in-app.txt"
if (Test-Path $p) { $notInApp = @(Get-Content $p | Where-Object { $_.Trim() }) }
foreach ($n in $notInApp) {
    $row = @($n, '(not in the app)', '', '', '', 'v1.8 item the app has no recipe for', '',
             '', '', '', '', 'no')
    foreach ($s in $statCols) { $row += '' }
    $rows += , $row
}

$out = "$here\gear-review.xlsx"
Write-Xlsx -Path $out -Rows $rows -SheetName 'Gear'
"wrote $out"
"  armour rows      : $($armor.Count)"
"  1.8-only rows    : $($notInApp.Count)"
"  columns          : $($header.Count)  ($($statCols.Count) of them stats)"
"  needing a class  : $(@($armor | Where-Object { -not (ClassOf $_.output.item) -and -not (HitsAny $_.output.item $notInGame) -and -not (HitsAny $_.output.item $noClass) }).Count)"
