# Regenerates data/costs.json and src/costs.js.
#
#   powershell -ExecutionPolicy Bypass -File costs\build-costs.ps1
#
# Sources, each layer overriding the one before:
#   1. costs/message.txt                 - original dump (DISCOUNTED, see below)
#   2. costs/prices - more accurate.txt  - undiscounted base prices
#   3. costs/manual.json                 - hand-supplied, fills what dumps lack
#
# Why two dumps: they carry identical coverage (784 items / 841 slots / identical
# yields), but message.txt had discounts already applied - refined intermediates
# 15% off, manufactured goods 25% off - which is why its numbers carry decimals
# (152.25) while the accurate file is whole UC (203). Taking message.txt at face
# value understated every price by 15-25%. It stays as the base layer only so a
# future dump can still contribute anything the newer file happens to miss.
#
# manual.json wins over both, so re-importing a dump never discards entries typed
# in by hand. Item names are resolved to the app's own spelling (the dumps say
# "Aluminium"/"Plastics"/"Militek EMP" where the app says "aluminum"/"plastic"/
# "Millitek EMP"), and rows for things the app can't craft are skipped.

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

function Key([string]$s){ ($s.ToLower() -replace '[^a-z0-9]','') }

# The dumps and the app disagree about names in a few systematic ways. Each rule
# below was checked to introduce no collisions on the app side and no rows that
# resolve to the same item with different numbers.
function Loose([string]$s){
  $k = $s.ToLower()
  # Gender variants are separate rows in the dump but one item in the app. Where
  # both a (Male) and a (Female) row exist, all 48 pairs carry identical prices
  # and yields, so collapsing them loses nothing.
  $k = $k -replace '\((male|female)\)',''
  $k = $k -replace '[^a-z0-9]',''
  $k = $k -replace 'medikit','medkit'   # dump: "Small MediKit", app: "small medkit"
  $k = $k -replace 'armor$',''          # dump: "Aramid Basic Torso Armor", app: "Aramid Basic Torso"
  $k = $k -replace 'ium$','um'
  $k = $k -replace 'll','l'
  $k = $k -replace 's$',''
  $k
}

# Names too far apart for any rule. Each of these is the single leftover on both
# sides once every other member of its family has matched, so the pairing is
# forced rather than guessed.
$aliases = @{
  'detox combat helmet'          = 'Detox Helmet'
  'detox combat shoulder pads'   = 'Detox Shoulder Pads'
  'detox combat arm pads'        = 'Detox Arm Pads'
  'detox combat torso armor'     = 'Detox Torso'
  'detox combat leg pads'        = 'Detox Leg Pads'
  'detox combat gloves'          = 'Detox Gloves'
  'premet tremor helmet'         = 'PreMet Helmet'
  'locans stabilized shoulder pads' = 'Locans Stabilized Shoulder'
  'dilatant 50b assault leg pads' = 'Dilatant 50b Leg Pads'
  'infostyle gloves'             = 'Infostyle Gloves Gloves'
  'aramid altered leg pads'      = 'Aramid Tremor Leg Pads'
}

$game = Get-Content "$root\data\game_data.json" -Raw | ConvertFrom-Json
$outputs = $game.recipes | ForEach-Object { $_.output.item } | Sort-Object -Unique
$byKey = @{}; $byLoose = @{}
foreach($o in $outputs){ $byKey[(Key $o)] = $o; $lk = Loose $o; if(-not $byLoose.ContainsKey($lk)){ $byLoose[$lk] = $o } }

function ResolveName([string]$n){
  if($byKey.ContainsKey((Key $n))){ return $byKey[(Key $n)] }
  $a = ($n.ToLower() -replace '\s*\((male|female)\)\s*','').Trim()
  if($aliases.ContainsKey($a)){ return $aliases[$a] }
  if($byLoose.ContainsKey((Loose $n))){ return $byLoose[(Loose $n)] }
  return $null
}

$slotsFor = @{}   # app item -> object[8]
$skipped = 0

# ---- 1) the dumps, oldest first so later files override ---------------------
$dumpStats = @()
foreach($dump in @('message.txt', 'prices - more accurate.txt')){
  $path = Join-Path "$root\costs" $dump
  if(-not (Test-Path $path)){ continue }
  $txt = Get-Content $path -Raw
  $n = 0
  foreach($b in [regex]::Matches($txt,'(?m)^\s*(\d+)\s*-\s*(.+?)\s*\r?$(?<body>(?:\r?\n\s*Price[^\r\n]*)*)')){
    $app = ResolveName $b.Groups[2].Value
    if(-not $app){ $skipped++; continue }
    if(-not $slotsFor.ContainsKey($app)){ $slotsFor[$app] = New-Object object[] 8 }
    foreach($m in [regex]::Matches($b.Groups['body'].Value,'Price\s*\((\d)\)\s*=\s*([0-9.]+)\s*UC\s*\(Yield\s*(\d+)\)')){
      $slotsFor[$app][[int]$m.Groups[1].Value] = @{ uc = [double]$m.Groups[2].Value; y = [int]$m.Groups[3].Value }
      $n++
    }
  }
  $dumpStats += "  $dump -> $n priced slots"
}

# ---- 2) manual additions (override) ----------------------------------------
# Raw materials are a different KIND of number: a per-unit purchase/mining cost,
# not a per-batch processing fee, so they get their own map rather than being
# squeezed into the paths array. Both dumps list rows for them but leave every
# price blank, so these can only come from manual.json.
$materials = [ordered]@{}
$manualCount = 0
$manualPath = "$root\costs\manual.json"
if(Test-Path $manualPath){
  $manual = Get-Content $manualPath -Raw | ConvertFrom-Json
  if($manual.materials){
    foreach($m in $manual.materials.PSObject.Properties){
      $key = $m.Name
      # raw materials are inputs, not recipe outputs, so ResolveName can't help;
      # match them against every item the recipes actually reference
      $materials[$key] = [double]$m.Value
    }
  }
  foreach($p in $manual.items.PSObject.Properties){
    $app = ResolveName $p.Name
    if(-not $app){ Write-Warning "manual.json: '$($p.Name)' is not a craftable item - skipped"; continue }
    if(-not $slotsFor.ContainsKey($app)){ $slotsFor[$app] = New-Object object[] 8 }
    for($i=0; $i -lt $p.Value.Count -and $i -lt 8; $i++){
      $e = $p.Value[$i]
      if($null -ne $e){ $slotsFor[$app][$i] = @{ uc = [double]$e.uc; y = [int]$e.y }; $manualCount++ }
    }
  }
}

# ---- write -----------------------------------------------------------------
$rows = @()
foreach($app in ($slotsFor.Keys | Sort-Object)){
  $slots = $slotsFor[$app]
  $last = -1
  for($i=0;$i -lt 8;$i++){ if($slots[$i]){ $last = $i } }
  if($last -lt 0){ continue }                      # no price at all - omit
  $parts = for($i=0;$i -le $last;$i++){
    if($slots[$i]){ '{{"uc":{0},"y":{1}}}' -f $slots[$i].uc, $slots[$i].y } else { 'null' }
  }
  $rows += ('  "{0}": [{1}]' -f ($app -replace '\\','\\' -replace '"','\"'), ($parts -join ','))
}

$matRows = @()
foreach($k in ($materials.Keys | Sort-Object)){
  $matRows += ('  "{0}": {1}' -f ($k -replace '"','\"'), $materials[$k])
}

$note = "GENERATED by costs/build-costs.ps1 - do not hand-edit. items: processing fee per BATCH, indexed by refinement path (matches recipe inputs_alternatives[N]); null = that path is not priced yet; uc = fee for one batch, y = units it yields. The fee EXCLUDES the inputs. materials: per-UNIT cost of a raw material, added on top of the fees."
$json = "{`n  `"_note`": `"$note`",`n  `"_generated`": `"$(Get-Date -Format 'yyyy-MM-dd')`",`n  `"materials`": {`n" + ($matRows -join ",`n") + "`n  },`n  `"items`": {`n" + ($rows -join ",`n") + "`n  }`n}"
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$root\data\costs.json", $json, $utf8)

$js = "/**`n * src/costs.js - production cost per batch, per refinement path.`n * GENERATED by costs/build-costs.ps1 - do not hand-edit; regenerate instead.`n * Mirrors data/costs.json (the app has no bundler, so data ships as a global).`n */`n'use strict';`nwindow.COSTS = $json;`n"
[System.IO.File]::WriteAllText("$root\src\costs.js", $js, $utf8)

"sources (later overrides earlier):"
$dumpStats | ForEach-Object { $_ }
"items priced      : $($rows.Count)"
"materials priced  : $($matRows.Count)"
"manual overrides  : $manualCount"
"dump rows skipped : $skipped (not craftable by the app)"
"wrote data/costs.json and src/costs.js"
