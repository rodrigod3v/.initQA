$path = "c:\Users\777\.gemini\antigravity\scratch\initQA\frontend\src\pages\WebScenarios.tsx"
$lines = Get-Content $path
$lines = @($lines)
$found = $false
$newContent = @()

# Search backwards for ");"
# Because there might be multiple ); in the file.
# The one we want is near the end, usually last line of component.
# But file can have many lines. Line ~1190.

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line.Trim() -eq ");" -and $i -gt 1000) {
        # Found potential candidate. Check if it's the main return close.
        # The main return close is usually preceded by </div>
        if ($lines[$i - 1].Trim() -eq "</div>") {
            # Insert another div before this one? No, before );
            # If I am missing ONE closing div, I add one.
            $newContent += "            </div>"
            $found = $true
            Write-Host "Injected </div> at line $i"
        }
    }
    $newContent += $line
}

if (-not $found) {
    # If not found via pattern, just look for the last );
    Write-Host "Pattern not found, trying last );"
    $newContent = @()
    $lastIndex = -1
    for ($i = $lines.Count - 1; $i -ge 0; $i--) {
        if ($lines[$i].Trim() -eq ");") {
            $lastIndex = $i
            break
        }
    }
    
    if ($lastIndex -ne -1) {
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($i -eq $lastIndex) {
                $newContent += "            </div>"
                Write-Host "Injected </div> at line $lastIndex"
            }
            $newContent += $lines[$i]
        }
    }
}

$newContent | Set-Content $path -Encoding UTF8
