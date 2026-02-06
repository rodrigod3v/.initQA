import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { chromium } from 'playwright';
import { UtilsService } from '../../utils/utils.service';

@Injectable()
export class WebExecutionService {
  constructor(
    private prisma: PrismaService,
    private utilsService: UtilsService,
  ) { }

  async execute(scenarioId: string, environmentId?: string) {
    const scenario = await this.prisma.webScenario.findUnique({
      where: { id: scenarioId },
    });

    if (!scenario) throw new NotFoundException('Scenario not found');

    let variables = {};
    if (environmentId) {
      const environment = await this.prisma.environment.findUnique({
        where: { id: environmentId },
      });
      variables = (environment?.variables as any) || {};
    }

    const startTime = Date.now();
    const logs: any[] = [];
    let status = 'SUCCESS';
    let screenshotPath: string | null = null;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'initQA-Web-Agent/1.0'
    });
    const page = await context.newPage();

    let scenarioUpdated = false;
    let updatedSteps: any[] = [];

    try {
      const steps = (scenario.steps as any[]) || [];
      updatedSteps = [...steps];

      let stepIndex = 0;
      for (const step of steps) {
        const stepStart = Date.now();
        const currentStepIdx = stepIndex + 1;
        try {
          // Replace variables in selector and value
          const selector = this.utilsService.replaceVariables(step.selector, variables);
          const value = this.utilsService.replaceVariables(step.value, variables);

          logs.push({ 
            step: `STEP_${currentStepIdx}: ${step.type}`, 
            info: `Attempting ${step.type} on ${selector || 'page'}...`, 
            timestamp: new Date().toISOString() 
          });
          
          let elementFoundByHealing = false;
          let effectiveSelector = selector;

          // --- SELF-HEALING LOGIC ---
          if (selector && !['GOTO', 'RELOAD', 'WAIT', 'ASSERT_URL', 'ASSERT_TITLE', 'KEY_PRESS'].includes(step.type)) {
            try {
              // Try to wait for the original selector briefly
              await page.waitForSelector(selector, { state: 'attached', timeout: 2000 });
            } catch (err) {
              // Primary selector failed. Try Self-Healing if metadata exists.
              if (step.metadata) {
                logs.push({ 
                  step: `STEP_${currentStepIdx}: SELF_HEALING`, 
                  info: `Primary selector failed. Attempting recovery using metadata...`, 
                  timestamp: new Date().toISOString() 
                });

                const { text, placeholder, role, name } = step.metadata;
                const healingSelectors: string[] = [];
                if (role && name) healingSelectors.push(`role=${role}[name="${name}"]`);
                if (text) healingSelectors.push(`text="${text}"`);
                if (placeholder) healingSelectors.push(`placeholder="${placeholder}"`);

                for (const hSelector of healingSelectors) {
                  try {
                    await page.waitForSelector(hSelector, { state: 'visible', timeout: 2000 });
                    effectiveSelector = hSelector;
                    elementFoundByHealing = true;
                    logs.push({ 
                      step: `STEP_${currentStepIdx}: SELF_HEALING`, 
                      info: `Recovered element using: ${hSelector}`, 
                      status: 'HEALED',
                      timestamp: new Date().toISOString() 
                    });
                    break;
                  } catch (e) { continue; }
                }

                if (!elementFoundByHealing) {
                  throw new Error(`Primary selector and recovery attempts failed for: ${selector}`);
                }
              } else {
                throw err; // No metadata, rethrow original error
              }
            }
          }

          switch (step.type) {
            case 'GOTO':
              await page.goto(value, { waitUntil: 'load', timeout: 60000 });
              break;
            case 'CLICK':
              await page.click(effectiveSelector, { force: true });
              break;
            case 'DOUBLE_CLICK':
              await page.dblclick(effectiveSelector, { force: true });
              break;
            case 'RIGHT_CLICK':
              await page.click(effectiveSelector, { button: 'right', force: true });
              break;
            case 'FILL':
              await page.fill(effectiveSelector, value);
              break;
            case 'TYPE':
              await page.type(effectiveSelector, value);
              break;
            case 'KEY_PRESS':
              await page.keyboard.press(value);
              break;
            case 'HOVER':
              await page.hover(effectiveSelector);
              break;
            case 'SELECT':
              await page.selectOption(effectiveSelector, value);
              break;
            case 'CHECK':
              await page.check(effectiveSelector, { force: true });
              break;
            case 'UNCHECK':
              await page.uncheck(effectiveSelector, { force: true });
              break;
            case 'SUBMIT':
              // Either click a submit button or press Enter in an input
              if (effectiveSelector) {
                await page.click(effectiveSelector);
              } else {
                await page.keyboard.press('Enter');
              }
              await page.waitForLoadState('load');
              break;
            case 'RELOAD':
              await page.reload({ waitUntil: 'load' });
              break;
            case 'ASSERT_VISIBLE':
              await page.waitForSelector(effectiveSelector, { state: 'visible', timeout: 5000 });
              break;
            case 'ASSERT_HIDDEN':
              await page.waitForSelector(effectiveSelector, { state: 'hidden', timeout: 5000 });
              break;
            case 'ASSERT_TEXT':
              const textContent = await page.textContent(effectiveSelector);
              if (!textContent?.includes(value)) {
                throw new Error(`Text "${value}" not found in ${effectiveSelector}`);
              }
              break;
            case 'ASSERT_VALUE':
              const inputVal = await page.inputValue(effectiveSelector);
              if (inputVal !== value) {
                throw new Error(`Value "${inputVal}" does not match expected "${value}" in ${effectiveSelector}`);
              }
              break;
            case 'ASSERT_URL':
              const currentUrl = page.url();
              if (!currentUrl.includes(value)) {
                throw new Error(`URL "${currentUrl}" does not include "${value}"`);
              }
              break;
            case 'ASSERT_TITLE':
              const titleValue = await page.title();
              if (!titleValue.includes(value)) {
                throw new Error(`Title "${titleValue}" does not include "${value}"`);
              }
              break;
            case 'WAIT':
              const ms = parseInt(value) || 2000;
              await page.waitForTimeout(ms);
              break;
            case 'SCROLL':
              await page.locator(effectiveSelector).scrollIntoViewIfNeeded();
              break;
            default:
              logs.push({ step: step.type, error: 'Unknown step type', timestamp: new Date().toISOString() });
          }

          // --- LEARNING PHASE (Metadata Collection) ---
          if (effectiveSelector && !['GOTO', 'RELOAD', 'WAIT', 'ASSERT_URL', 'ASSERT_TITLE', 'KEY_PRESS'].includes(step.type)) {
            try {
              const element = page.locator(effectiveSelector).first();
              const metadata = await element.evaluate(el => {
                const htmlEl = el as HTMLElement;
                return {
                  text: (htmlEl.innerText || htmlEl.textContent || '').trim().substring(0, 50),
                  placeholder: htmlEl.getAttribute('placeholder'),
                  role: htmlEl.getAttribute('role') || htmlEl.tagName.toLowerCase(),
                  name: htmlEl.getAttribute('name') || htmlEl.getAttribute('aria-label') || (htmlEl.innerText || htmlEl.textContent || '').trim().substring(0, 30)
                };
              });

              if (JSON.stringify(step.metadata) !== JSON.stringify(metadata)) {
                updatedSteps[stepIndex] = { ...step, metadata };
                scenarioUpdated = true;
              }
            } catch (learnErr) {
              // Non-blocking
              console.warn('Learning failed for step', stepIndex, learnErr.message);
            }
          }
          
          logs.push({ 
            step: `STEP_${currentStepIdx}: ${step.type}`, 
            status: elementFoundByHealing ? 'HEALED' : 'OK', 
            duration: Date.now() - stepStart,
            timestamp: new Date().toISOString() 
          });

        } catch (stepError) {
          status = 'FAILED';
          logs.push({ 
            step: `STEP_${currentStepIdx}: ${step.type}`, 
            error: stepError.message, 
            duration: Date.now() - stepStart,
            timestamp: new Date().toISOString() 
          });
          
          // Capture screenshot on failure
          try {
            const buffer = await page.screenshot();
            screenshotPath = `data:image/png;base64,${buffer.toString('base64')}`;
          } catch (ssErr) {
            console.error('Failed to capture failure screenshot', ssErr);
          }
          
          break; // Stop scenario execution on first error
        }
        stepIndex++;
      }
    } catch (err) {
      status = 'FAILED';
      logs.push({ error: 'Global execution error', message: err.message, timestamp: new Date().toISOString() });
    } finally {
      // Capture final screenshot if not already captured during failure
      if (!screenshotPath) {
        try {
          const buffer = await page.screenshot();
          screenshotPath = `data:image/png;base64,${buffer.toString('base64')}`;
        } catch (ssErr) {
          console.error('Failed to capture final screenshot', ssErr);
        }
      }
      await browser.close();

      // If we learned new metadata, update the scenario
      if (scenarioUpdated) {
        await this.prisma.webScenario.update({
          where: { id: scenario.id },
          data: { steps: updatedSteps as any }
        });
      }
    }

    const duration = Date.now() - startTime;

    return this.prisma.webExecution.create({
      data: {
        scenarioId: scenario.id,
        environmentId: environmentId || null,
        status,
        duration,
        logs: logs as any,
        screenshot: screenshotPath,
      },
    });
  }

  async getHistory(scenarioId: string) {
    return this.prisma.webExecution.findMany({
      where: { scenarioId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getProjectHistory(projectId: string) {
    return this.prisma.webExecution.findMany({
      where: { 
        scenario: { projectId } 
      },
      include: {
        scenario: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async clearHistory(scenarioId: string) {
    return this.prisma.webExecution.deleteMany({
      where: { scenarioId },
    });
  }
}
