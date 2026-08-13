# Minimal xlsx reader. An xlsx is a zip of XML: sheet1.xml holds cells keyed by
# A1-style refs, and text cells (t="s") point at an index in sharedStrings.xml.
# No Python or Excel on this machine, so read it straight.
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-Xlsx {
    param([string]$Path, [string]$Sheet = 'xl/worksheets/sheet1.xml')

    $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
    try {
        function Slurp($name) {
            $e = $zip.Entries | Where-Object { $_.FullName -eq $name }
            if (-not $e) { return $null }
            $sr = New-Object System.IO.StreamReader($e.Open())
            try { return $sr.ReadToEnd() } finally { $sr.Dispose() }
        }

        # shared strings: <si> may hold one <t> or several inside <r> runs
        $shared = @()
        $ssXml = Slurp 'xl/sharedStrings.xml'
        if ($ssXml) {
            $doc = New-Object System.Xml.XmlDocument
            $doc.LoadXml($ssXml)
            foreach ($si in $doc.DocumentElement.ChildNodes) {
                $sb = New-Object System.Text.StringBuilder
                foreach ($t in $si.SelectNodes('.//*[local-name()="t"]')) { [void]$sb.Append($t.InnerText) }
                $shared += $sb.ToString()
            }
        }

        $sheetXml = Slurp $Sheet
        if (-not $sheetXml) { throw "sheet not found: $Sheet" }
        $doc = New-Object System.Xml.XmlDocument
        $doc.LoadXml($sheetXml)

        $rows = @{}
        $maxCol = 0
        foreach ($c in $doc.SelectNodes('//*[local-name()="c"]')) {
            $ref = $c.GetAttribute('r')
            if (-not ($ref -match '^([A-Z]+)(\d+)$')) { continue }
            $colRef = $Matches[1]; $rowNum = [int]$Matches[2]
            # column letters -> index
            $ci = 0
            foreach ($ch in $colRef.ToCharArray()) { $ci = $ci * 26 + ([int][char]$ch - 64) }
            if ($ci -gt $maxCol) { $maxCol = $ci }

            $type = $c.GetAttribute('t')
            $vNode = $c.SelectSingleNode('*[local-name()="v"]')
            $isNode = $c.SelectSingleNode('*[local-name()="is"]')
            $val = ''
            if ($type -eq 's' -and $vNode) { $val = $shared[[int]$vNode.InnerText] }
            elseif ($type -eq 'inlineStr' -and $isNode) { $val = $isNode.InnerText }
            elseif ($vNode) { $val = $vNode.InnerText }
            if (-not $rows.ContainsKey($rowNum)) { $rows[$rowNum] = @{} }
            $rows[$rowNum][$ci] = $val
        }

        $out = @()
        foreach ($rn in ($rows.Keys | Sort-Object)) {
            $arr = New-Object 'string[]' $maxCol
            for ($i = 1; $i -le $maxCol; $i++) { $arr[$i-1] = $(if ($rows[$rn].ContainsKey($i)) { $rows[$rn][$i] } else { '' }) }
            $out += , [pscustomobject]@{ row = $rn; cells = $arr }
        }
        return $out
    } finally { $zip.Dispose() }
}
