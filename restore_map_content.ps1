$path = "c:\Users\777\.gemini\antigravity\scratch\initQA\frontend\src\pages\WebScenarios.tsx"
$lines = Get-Content $path
$foundLine = -1

# Find the marker line
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "Map temporarily removed for debugging") {
        $foundLine = $i
        break
    }
}

if ($foundLine -eq -1) {
    Write-Error "Could not find map placeholder."
    exit 1
}

# The Map Content
$mapContent = @'
                                        {selectedScenario.steps.map((step, idx) => (
                                            <div key={idx} className="flex gap-3 items-start group">
                                                <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-[10px] font-mono text-accent shrink-0 mt-1">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 bg-deep/50 border border-main p-3 space-y-3 relative">
                                                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => moveStep(idx, 'up')} disabled={idx === 0} className="p-1 text-secondary-text hover:text-accent disabled:opacity-30 disabled:hover:text-secondary-text"><ChevronUp size={14} /></button>
                                                        <button onClick={() => moveStep(idx, 'down')} disabled={idx === selectedScenario.steps.length - 1} className="p-1 text-secondary-text hover:text-accent disabled:opacity-30 disabled:hover:text-secondary-text"><ChevronDown size={14} /></button>
                                                        <button onClick={() => removeStep(idx)} className="p-1 text-secondary-text hover:text-danger ml-1"><X size={14} /></button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {(step.type === 'GOTO') && <ExternalLink size={10} className="text-emerald-500" />}
                                                                {['CLICK', 'DOUBLE_CLICK', 'RIGHT_CLICK'].includes(step.type) && <MousePointer2 size={10} className="text-accent" />}
                                                                {['FILL', 'TYPE', 'KEY_PRESS'].includes(step.type) && <TextCursorInput size={10} className="text-accent" />}
                                                                {(step.type === 'HOVER') && <Target size={10} className="text-accent" />}
                                                                {(step.type === 'SELECT') && <ChevronDown size={10} className="text-accent" />}
                                                                {(step.type === 'CHECK') && <CheckSquare size={10} className="text-emerald-500" />}
                                                                {(step.type === 'UNCHECK') && <Square size={10} className="text-secondary-text" />}
                                                                {(step.type === 'SUBMIT') && <Anchor size={10} className="text-amber-500" />}
                                                                {(step.type === 'RELOAD') && <RefreshCw size={10} className="text-blue-500" />}
                                                                {(step.type === 'WAIT') && <Clock size={10} className="text-amber-400" />}
                                                                {(step.type === 'SCROLL') && <MoveDown size={10} className="text-purple-400" />}
                                                                {step.type?.startsWith('ASSERT') && !step.type?.includes('HIDDEN') && <CheckCircle2 size={10} className="text-emerald-500" />}
                                                                {step.type === 'ASSERT_HIDDEN' && <EyeOff size={10} className="text-rose-400" />}
                                                                <label className="text-[8px] font-mono text-secondary-text uppercase block">ACTION_TYPE</label>
                                                            </div>
                                                            <select value={step.type} onChange={(e) => updateStep(idx, 'type', e.target.value)} className="w-full bg-surface border-sharp border-main px-2 py-1 text-[10px] font-mono text-accent focus:outline-none">
                                                                <optgroup label="NAVIGATION" className="bg-deep text-[10px]">
                                                                    <option value="GOTO">GOTO_URL</option>
                                                                    <option value="RELOAD">RELOAD_PAGE</option>
                                                                </optgroup>
                                                                <optgroup label="INTERACTION" className="bg-deep text-[10px]">
                                                                    <option value="CLICK">MOUSE_CLICK</option>
                                                                    <option value="DOUBLE_CLICK">DOUBLE_CLICK</option>
                                                                    <option value="RIGHT_CLICK">RIGHT_CLICK</option>
                                                                    <option value="HOVER">HOVER_OVER</option>
                                                                    <option value="SCROLL">SCROLL_TO</option>
                                                                </optgroup>
                                                                <optgroup label="FORM_DATA" className="bg-deep text-[10px]">
                                                                    <option value="FILL">SET_VALUE</option>
                                                                    <option value="TYPE">TYPE_KEYS</option>
                                                                    <option value="KEY_PRESS">SINGLE_KEY</option>
                                                                    <option value="SELECT">SELECT_OPTION</option>
                                                                    <option value="CHECK">CHECK_BOX</option>
                                                                    <option value="UNCHECK">UNCHECK_BOX</option>
                                                                    <option value="SUBMIT">SUBMIT_FORM</option>
                                                                </optgroup>
                                                                <optgroup label="VALIDATION" className="bg-deep text-[10px]">
                                                                    <option value="ASSERT_VISIBLE">ASSERT_VISIBLE</option>
                                                                    <option value="ASSERT_HIDDEN">ASSERT_HIDDEN</option>
                                                                    <option value="ASSERT_TEXT">ASSERT_CONTENT</option>
                                                                    <option value="ASSERT_VALUE">ASSERT_INPUT_VALUE</option>
                                                                    <option value="ASSERT_URL">ASSERT_URL</option>
                                                                    <option value="ASSERT_TITLE">ASSERT_TITLE</option>
                                                                </optgroup>
                                                                <optgroup label="CONTROL" className="bg-deep text-[10px]">
                                                                    <option value="WAIT">WAIT_TIME</option>
                                                                </optgroup>
                                                            </select>
                                                        </div>
                                                        {['CLICK', 'DOUBLE_CLICK', 'RIGHT_CLICK', 'FILL', 'TYPE', 'HOVER', 'SELECT', 'CHECK', 'UNCHECK', 'SUBMIT', 'ASSERT_VISIBLE', 'ASSERT_HIDDEN', 'ASSERT_TEXT', 'ASSERT_VALUE', 'SCROLL'].includes(step.type) && (
                                                            <div>
                                                                <label className="text-[8px] font-mono text-secondary-text uppercase mb-1 block">UI_SELECTOR</label>
                                                                <input 
                                                                    onChange={(e) => updateStep(idx, 'selector', e.target.value)}
                                                                    value={step.selector || ''}
                                                                    className="w-full bg-surface border-sharp border-main px-2 py-1 text-[10px] font-mono text-primary-text focus:outline-none placeholder:opacity-20"
                                                                    placeholder="#id, .class, [data-testid]..."
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex gap-2 items-end">
                                                        <div className="flex-1">
                                                            <label className="text-[8px] font-mono text-secondary-text uppercase mb-1 block">VALUE_STRING</label>
                                                            <input
                                                                value={step.value || ''}
                                                                onChange={(e) => updateStep(idx, 'value', e.target.value)}
                                                                className="w-full bg-surface border-sharp border-main px-2 py-1 text-[10px] font-mono text-primary-text focus:outline-none"
                                                                placeholder={
                                                                    step.type === 'GOTO' ? 'https://...' :
                                                                        step.type === 'WAIT' ? 'Milliseconds (e.g. 2000)' :
                                                                            step.type === 'KEY_PRESS' ? 'Key Name (e.g. Escape, Enter, Tab)' :
                                                                                step.type === 'SELECT' ? 'Value or label of the option' :
                                                                                    (step.type?.includes('ASSERT_URL') ? 'Substring of URL' : 'Data or expected text')
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
'@

# Reconstruct file
$newContent = $lines[0..($foundLine - 1)]
$newContent += $mapContent
$newContent += $lines[($foundLine + 1)..($lines.Count - 1)]

$newContent | Set-Content $path -Encoding UTF8
Write-Host "Map restored."
