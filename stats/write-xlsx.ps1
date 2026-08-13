# Minimal xlsx writer. No Excel or Python here, so build the OOXML by hand:
# a zip of a few XML parts. Text goes in as inline strings, which avoids the
# shared-string table entirely at the cost of a slightly larger file.
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function ColName([int]$n) {          # 1 -> A, 27 -> AA
    $s = ''
    while ($n -gt 0) {
        $r = ($n - 1) % 26
        $s = [char](65 + $r) + $s
        $n = [int](($n - $r - 1) / 26)
    }
    $s
}

function XmlEsc([string]$s) {
    if ($null -eq $s) { return '' }
    $s = $s -replace '&', '&amp;' -replace '<', '&lt;' -replace '>', '&gt;' -replace '"', '&quot;'
    # strip control characters Excel refuses to open
    ($s -replace '[\x00-\x08\x0B\x0C\x0E-\x1F]', '')
}

# $Rows: array of arrays. Row 0 is the header. Numbers stay numeric, everything
# else is written as text.
function Write-Xlsx {
    param([string]$Path, [object[]]$Rows, [string]$SheetName = 'Sheet1')

    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
    [void]$sb.Append('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">')
    # freeze the header so it stays put while scrolling a few hundred rows
    [void]$sb.Append('<sheetViews><sheetView tabSelected="1" workbookViewId="0">')
    [void]$sb.Append('<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>')
    [void]$sb.Append('</sheetView></sheetViews>')
    [void]$sb.Append('<sheetFormatPr defaultRowHeight="15"/>')
    [void]$sb.Append('<sheetData>')

    for ($r = 0; $r -lt $Rows.Count; $r++) {
        $rowNum = $r + 1
        [void]$sb.Append('<row r="' + $rowNum + '">')
        $cells = $Rows[$r]
        for ($c = 0; $c -lt $cells.Count; $c++) {
            $v = $cells[$c]
            if ($null -eq $v -or $v -eq '') { continue }
            $ref = (ColName ($c + 1)) + $rowNum
            $num = 0.0
            $isNum = ($r -gt 0) -and ($v -isnot [string] -or [double]::TryParse([string]$v, [ref]$num))
            if ($isNum) {
                $d = $(if ($v -is [string]) { [double]$v } else { [double]$v })
                [void]$sb.Append('<c r="' + $ref + '"><v>' + $d.ToString([System.Globalization.CultureInfo]::InvariantCulture) + '</v></c>')
            } else {
                [void]$sb.Append('<c r="' + $ref + '" t="inlineStr"><is><t xml:space="preserve">' + (XmlEsc ([string]$v)) + '</t></is></c>')
            }
        }
        [void]$sb.Append('</row>')
    }
    [void]$sb.Append('</sheetData>')
    if ($Rows.Count -gt 1) {
        [void]$sb.Append('<autoFilter ref="A1:' + (ColName $Rows[0].Count) + $Rows.Count + '"/>')
    }
    [void]$sb.Append('</worksheet>')
    $sheetXml = $sb.ToString()

    $contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '</Types>'
    $rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>'
    $workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="' + (XmlEsc $SheetName) + '" sheetId="1" r:id="rId1"/></sheets></workbook>'
    $wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '</Relationships>'

    if (Test-Path $Path) { Remove-Item $Path -Force }
    $zip = [System.IO.Compression.ZipFile]::Open($Path, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        function AddPart($name, $text) {
            $e = $zip.CreateEntry($name, [System.IO.Compression.CompressionLevel]::Optimal)
            $s = $e.Open()
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
            $s.Write($bytes, 0, $bytes.Length)
            $s.Dispose()
        }
        AddPart '[Content_Types].xml' $contentTypes
        AddPart '_rels/.rels' $rootRels
        AddPart 'xl/workbook.xml' $workbook
        AddPart 'xl/_rels/workbook.xml.rels' $wbRels
        AddPart 'xl/worksheets/sheet1.xml' $sheetXml
    } finally { $zip.Dispose() }
}
