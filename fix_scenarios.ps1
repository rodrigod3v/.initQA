$path = "c:\Users\777\.gemini\antigravity\scratch\initQA\frontend\src\pages\WebScenarios.tsx"
$content = Get-Content $path
$lines = @($content)
$newContent = @()
$modified = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    $currentLine = $lines[$i]
    if ($currentLine.Trim() -eq "))}") {
        if ($i -ge 5 -and 
            $lines[$i-1].Trim() -eq "</div>" -and 
            $lines[$i-2].Trim() -eq "</div>" -and 
            $lines[$i-3].Trim() -eq "</div>" -and 
            $lines[$i-4].Trim() -eq "</div>" -and 
            $lines[$i-5].Trim() -eq "</div>") {
            
            Write-Host "Found 5 divs block ending at line $i. Removing the last div (line $($i-1))."
            # Remove the last line added to newContent (which corresponds to lines[i-1])
            $startIndex = 0
            $endIndex = $newContent.Count - 2
            if ($endIndex -ge 0) {
                $newContent = $newContent[$startIndex..$endIndex]
            } else {
                $newContent = @()
            }
            $modified = $true
        }
    }
    $newContent += $currentLine
}

if ($modified) {
    $newContent | Set-Content $path -Encoding UTF8
    Write-Host "File updated successfully."
} else {
    Write-Host "No 5-div block found. File unchanged."
}
