$path = "c:\Users\777\.gemini\antigravity\scratch\initQA\frontend\src\pages\WebScenarios.tsx"
$lines = Get-Content $path
# Line 674 is index 673
$startIdx = 673
# Line 792 is index 791 (based on previous observations)
# We want to find the line that matches "    {selectedScenario.steps.map((step, idx) => ("
# And the line that matches "    ))}" around index 791.

# Search for start
$foundStart = -1
for ($i = 670; $i -lt 680; $i++) {
    if ($lines[$i] -match "selectedScenario.steps.map") {
        $foundStart = $i
        break
    }
}

if ($foundStart -eq -1) {
    Write-Error "Could not find start of map block."
    exit 1
}

# Search for end
$foundEnd = -1
for ($i = 780; $i -lt 800; $i++) {
    if ($lines[$i].Trim() -eq "))}") {
        $foundEnd = $i
        break
    }
}

if ($foundEnd -eq -1) {
    Write-Error "Could not find end of map block."
    exit 1
}

Write-Host "Replacing block from line $($foundStart+1) to $($foundEnd+1)."

# Construct new content
$newContent = $lines[0..($foundStart - 1)]
$newContent += "{/* Map temporarily removed for debugging */ null}"
$newContent += $lines[($foundEnd + 1)..($lines.Count - 1)]

$newContent | Set-Content $path -Encoding UTF8
Write-Host "File updated."
