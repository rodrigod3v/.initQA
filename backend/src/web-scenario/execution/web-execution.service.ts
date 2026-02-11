import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { chromium, Page, Locator } from 'playwright';
import { UtilsService } from '../../utils/utils.service';
import { EventsGateway } from '../../events/events.gateway';

interface StepMetadata {
  text?: string;
  placeholder?: string | null;
  role?: string;
  name?: string;
  testId?: string;
}

interface ScenarioStep {
  type: string;
  selector?: string;
  xpath?: string;
  cssPath?: string;
  value?: string;
  metadata?: StepMetadata;
}

@Injectable()
export class WebExecutionService {
  private executionStates = new Map<string, 'RUNNING' | 'PAUSED' | 'STOPPED'>();

  constructor(
    private prisma: PrismaService,
    private utilsService: UtilsService,
    private eventsGateway: EventsGateway,
  ) {}

  pause(scenarioId: string) {
    if (this.executionStates.get(scenarioId) === 'RUNNING') {
      this.executionStates.set(scenarioId, 'PAUSED');
      console.log(`[WebExecutionService] Scenario ${scenarioId} PAUSED`);
    }
  }

  resume(scenarioId: string) {
    if (this.executionStates.get(scenarioId) === 'PAUSED') {
      this.executionStates.set(scenarioId, 'RUNNING');
      console.log(`[WebExecutionService] Scenario ${scenarioId} RESUMED`);
    }
  }

  stop(scenarioId: string) {
    this.executionStates.set(scenarioId, 'STOPPED');
    console.log(`[WebExecutionService] Scenario ${scenarioId} STOPPED`);
  }

  async execute(scenarioId: string, environmentId?: string) {
    console.log(
      `[WebExecutionService] Executing scenario: ${scenarioId}, env: ${environmentId}`,
    );
    const scenario = await this.prisma.webScenario.findUnique({
      where: { id: scenarioId },
    });

    if (!scenario) throw new NotFoundException('Scenario not found');

    let variables: Record<string, unknown> = {};
    if (environmentId) {
      const environment = await this.prisma.environment.findUnique({
        where: { id: environmentId },
      });
      variables = (environment?.variables as Record<string, unknown>) || {};
    }

    const startTime = Date.now();
    const logs: Record<string, unknown>[] = [];
    let status = 'SUCCESS';
    let screenshotPath: string | null = null;

    const browser = await chromium.launch({ headless: true });
    console.log(
      `[WebExecutionService] Browser launched for scenario ${scenarioId}`,
    );
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'initQA-Web-Agent/1.0',
    });
    const page = await context.newPage();

    let scenarioUpdated = false;
    let updatedSteps: ScenarioStep[] = [];

    try {
      this.executionStates.set(scenarioId, 'RUNNING');
      this.eventsGateway.emitStatus(scenarioId, 'RUNNING');

      const steps: ScenarioStep[] =
        (scenario.steps as unknown as ScenarioStep[]) || [];
      console.log(
        `[WebExecutionService] Steps retrieved. Count: ${steps.length}`,
      );
      updatedSteps = [...steps];

      let stepIndex = 0;
      let currentFrame: any = page; // Default to main page

      for (const step of steps) {
        // --- PAUSE/STOP CHECK ---
        while (this.executionStates.get(scenarioId) === 'PAUSED') {
          this.eventsGateway.emitStatus(scenarioId, 'PAUSED');
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        if (this.executionStates.get(scenarioId) === 'STOPPED') {
          status = 'STOPPED';
          logs.push({
            step: 'SYSTEM',
            info: 'Execution stopped by user',
            timestamp: new Date().toISOString(),
          });
          break;
        }
        
        // Ensure status is emitting as running when we proceed
        if (this.executionStates.get(scenarioId) === 'RUNNING') {
           this.eventsGateway.emitStatus(scenarioId, 'RUNNING');
        }

        const stepStart = Date.now();
        const currentStepIdx = stepIndex + 1;
        console.log(
          `[WebExecutionService] Processing step ${currentStepIdx}: ${step.type}`,
        );
        try {
          // Replace variables in selector and value
          const selector = this.utilsService.replaceVariables(
            step.selector,
            variables,
          ) as string;
          const value = this.utilsService.replaceVariables(
            step.value,
            variables,
          ) as string;

          logs.push({
            step: `STEP_${currentStepIdx}: ${step.type}`,
            info: `Attempting ${step.type} on ${selector || 'page'}...`,
            timestamp: new Date().toISOString(),
          });

          this.eventsGateway.emitProgress(scenario.id, {
            current: currentStepIdx,
            total: steps.length,
            type: step.type,
          });

          const effectiveSelector = selector;

          // --- LEARNING PHASE (Metadata Collection) ---
          // Perform this BEFORE the action to ensure the element is still there
          if (
            effectiveSelector &&
            ![
              'GOTO',
              'RELOAD',
              'WAIT',
              'ASSERT_URL',
              'ASSERT_TITLE',
              'KEY_PRESS',
            ].includes(step.type)
          ) {
            try {
              const element = page.locator(effectiveSelector).first();
              // Short timeout for learning - it's secondary to the execution
              const metadata = await element.evaluate(
                (el) => {
                  const htmlEl = el as HTMLElement;
                  return {
                    text: (htmlEl.innerText || htmlEl.textContent || '')
                      .trim()
                      .substring(0, 50),
                    placeholder: htmlEl.getAttribute('placeholder'),
                    role:
                      htmlEl.getAttribute('role') ||
                      htmlEl.tagName.toLowerCase(),
                    name:
                      htmlEl.getAttribute('name') ||
                      htmlEl.getAttribute('aria-label') ||
                      (htmlEl.innerText || htmlEl.textContent || '')
                        .trim()
                        .substring(0, 30),
                  };
                },
                { timeout: 2000 },
              );

              if (JSON.stringify(step.metadata) !== JSON.stringify(metadata)) {
                updatedSteps[stepIndex] = { ...step, metadata };
                scenarioUpdated = true;
              }
            } catch (learnErr: unknown) {
              // Non-blocking
              const message =
                learnErr instanceof Error ? learnErr.message : String(learnErr);
              console.warn(
                `Learning failed for step ${currentStepIdx}:`,
                message,
              );
            }
          }

          switch (step.type) {
            case 'GOTO':
              console.log(`[WebExecutionService] Navigating to ${value}`);
              await page.goto(value, {
                waitUntil: 'load',
                timeout: 60000,
              });
              console.log(
                `[WebExecutionService] Navigation to ${value} successful`,
              );
              break;
            case 'CLICK': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  currentFrame,
                  effectiveSelector,
                  scenario.id,
                  step.metadata,
                );
              if (healed)
                logs.push({
                  step: `STEP_${currentStepIdx}: CLICK`,
                  status: 'HEALED',
                  info: `Self-healed via ${method}`,
                  timestamp: new Date().toISOString(),
                });
              await locator.click({ force: true });
              await this.capturePageFeedback(currentFrame, logs, currentStepIdx);
              break;
            }
            case 'DOUBLE_CLICK': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  currentFrame,
                  effectiveSelector,
                  scenario.id,
                  step.metadata,
                );
              if (healed)
                logs.push({
                  step: `STEP_${currentStepIdx}: DOUBLE_CLICK`,
                  status: 'HEALED',
                  info: `Self-healed via ${method}`,
                  timestamp: new Date().toISOString(),
                });
              await locator.dblclick({ force: true });
              await this.capturePageFeedback(currentFrame, logs, currentStepIdx);
              break;
            }
            case 'RIGHT_CLICK': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  currentFrame,
                  effectiveSelector,
                  scenario.id,
                  step.metadata,
                );
              if (healed)
                logs.push({
                  step: `STEP_${currentStepIdx}: RIGHT_CLICK`,
                  status: 'HEALED',
                  info: `Self-healed via ${method}`,
                  timestamp: new Date().toISOString(),
                });
              await locator.click({ button: 'right', force: true });
              await this.capturePageFeedback(currentFrame, logs, currentStepIdx);
              break;
            }
            case 'HOVER': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  currentFrame,
                  effectiveSelector,
                  scenario.id,
                  step.metadata,
                );
              if (healed)
                logs.push({
                  step: `STEP_${currentStepIdx}: HOVER`,
                  status: 'HEALED',
                  info: `Self-healed via ${method}`,
                  timestamp: new Date().toISOString(),
                });
              await locator.hover({ force: true });
              await this.capturePageFeedback(currentFrame, logs, currentStepIdx);
              break;
            }
            case 'DRAG_AND_DROP': {
              // Value should be the target selector
              const targetSelector = value;
              const { locator: source, healed: sourceHealed } =
                await this.findElementWithHealing(
                  currentFrame,
                  effectiveSelector,
                  scenario.id,
                  step.metadata,
                );
              
              await source.dragTo(currentFrame.locator(targetSelector));
              break;
            }
            case 'SWITCH_FRAME': {
              if (!effectiveSelector || effectiveSelector === 'main' || effectiveSelector === 'top') {
                currentFrame = page;
                logs.push({
                  step: `STEP_${currentStepIdx}: SWITCH_FRAME`,
                  info: 'Switched to main page context',
                  timestamp: new Date().toISOString(),
                });
              } else {
                const frameElement = page.locator(effectiveSelector);
                currentFrame = frameElement.contentFrame();
                if (!currentFrame) {
                    // Try by name or ID if contentFrame fails
                    currentFrame = page.frame({ name: effectiveSelector }) || 
                                   page.frame({ url: new RegExp(effectiveSelector) });
                }
                
                if (!currentFrame) {
                  throw new Error(`Frame with selector/name "${effectiveSelector}" not found`);
                }

                logs.push({
                  step: `STEP_${currentStepIdx}: SWITCH_FRAME`,
                  info: `Switched to frame: ${effectiveSelector}`,
                  timestamp: new Date().toISOString(),
                });
              }
              break;
            }
            case 'FILL': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  currentFrame,
                  effectiveSelector,
                  scenario.id,
                  step.metadata,
                );
              if (healed)
                logs.push({
                  step: `STEP_${currentStepIdx}: FILL`,
                  status: 'HEALED',
                  info: `Self-healed via ${method}`,
                  timestamp: new Date().toISOString(),
                });

              // Robustness check: handle different element types in FILL
              const tagName = await locator.evaluate(el => el.tagName.toLowerCase());
              const type = await locator.getAttribute('type');

              if (tagName === 'select') {
                await locator.selectOption(value);
              } else if (type === 'radio' || type === 'checkbox') {
                await locator.check({ force: true });
              } else {
                await locator.fill(value);
              }
              await this.capturePageFeedback(currentFrame, logs, currentStepIdx);
              break;
            }
            case 'TYPE': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  currentFrame,
                  effectiveSelector,
                  scenario.id,
                  step.metadata,
                );
              if (healed)
                logs.push({
                  step: `STEP_${currentStepIdx}: TYPE`,
                  status: 'HEALED',
                  info: `Self-healed via ${method}`,
                  timestamp: new Date().toISOString(),
                });
              await locator.type(value);
              await this.capturePageFeedback(currentFrame, logs, currentStepIdx);
              break;
            }
            case 'KEY_PRESS':
              await page.keyboard.press(value);
              await this.capturePageFeedback(currentFrame, logs, currentStepIdx);
              break;
            case 'HOVER': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  currentFrame,
                  effectiveSelector,
                  scenario.id,
                  step.metadata,
                );
              if (healed)
                logs.push({
                  step: `STEP_${currentStepIdx}: HOVER`,
                  status: 'HEALED',
                  info: `Self-healed via ${method}`,
                  timestamp: new Date().toISOString(),
                });
              await locator.hover();
              await this.capturePageFeedback(currentFrame, logs, currentStepIdx);
              break;
            }
            case 'SELECT': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  currentFrame,
                  effectiveSelector,
                  scenario.id,
                  step.metadata,
                );
              if (healed)
                logs.push({
                  step: `STEP_${currentStepIdx}: SELECT`,
                  status: 'HEALED',
                  info: `Self-healed via ${method}`,
                  timestamp: new Date().toISOString(),
                });
              await locator.selectOption(value);
              break;
            }
            case 'CHECK': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  currentFrame,
                  effectiveSelector,
                  scenario.id,
                  step.metadata,
                );
              if (healed)
                logs.push({
                  step: `STEP_${currentStepIdx}: CHECK`,
                  status: 'HEALED',
                  info: `Self-healed via ${method}`,
                  timestamp: new Date().toISOString(),
                });
              await locator.check({ force: true });
              break;
            }
            case 'UNCHECK': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  currentFrame,
                  effectiveSelector,
                  scenario.id,
                  step.metadata,
                );
              if (healed)
                logs.push({
                  step: `STEP_${currentStepIdx}: UNCHECK`,
                  status: 'HEALED',
                  info: `Self-healed via ${method}`,
                  timestamp: new Date().toISOString(),
                });
              await locator.uncheck({ force: true });
              break;
            }
            case 'SUBMIT':
              if (effectiveSelector) {
                const { locator, healed, method } =
                  await this.findElementWithHealing(
                    page,
                    effectiveSelector,
                    scenario.id,
                    step.metadata,
                  );
                if (healed)
                  logs.push({
                    step: `STEP_${currentStepIdx}: SUBMIT`,
                    status: 'HEALED',
                    info: `Self-healed via ${method}`,
                    timestamp: new Date().toISOString(),
                  });
                await locator.click({ force: true });
              } else {
                await page.keyboard.press('Enter');
              }
              await page.waitForLoadState('load');
              break;
            case 'RELOAD':
              await page.reload({ waitUntil: 'load' });
              break;
            case 'ASSERT_VISIBLE': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  currentFrame,
                  effectiveSelector,
                  scenario.id,
                  step.metadata,
                );
              if (healed)
                logs.push({
                  step: `STEP_${currentStepIdx}: ASSERT_VISIBLE`,
                  status: 'HEALED',
                  info: `Self-healed via ${method}`,
                  timestamp: new Date().toISOString(),
                });
              await locator.waitFor({ state: 'visible', timeout: 5000 });
              break;
            }
            case 'ASSERT_HIDDEN':
              // Do not heal hidden assertions, we want to know if specific element is hidden
              await page.waitForSelector(effectiveSelector, {
                state: 'hidden',
                timeout: 5000,
              });
              break;
            case 'ASSERT_TEXT': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  currentFrame,
                  effectiveSelector,
                  scenario.id,
                  step.metadata,
                );
              if (healed)
                logs.push({
                  step: `STEP_${currentStepIdx}: ASSERT_TEXT`,
                  status: 'HEALED',
                  info: `Self-healed via ${method}`,
                  timestamp: new Date().toISOString(),
                });

              const textContent = await locator.textContent();
              if (!textContent?.includes(value)) {
                throw new Error(
                  `Text "${value}" not found in ${effectiveSelector}`,
                );
              }
              break;
            }
            case 'ASSERT_VALUE': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  currentFrame,
                  effectiveSelector,
                  scenario.id,
                  step.metadata,
                );
              if (healed)
                logs.push({
                  step: `STEP_${currentStepIdx}: ASSERT_VALUE`,
                  status: 'HEALED',
                  info: `Self-healed via ${method}`,
                  timestamp: new Date().toISOString(),
                });

              const inputVal = await locator.inputValue();
              if (inputVal !== value) {
                throw new Error(
                  `Value "${inputVal}" does not match expected "${value}" in ${effectiveSelector}`,
                );
              }
              break;
            }
            case 'ASSERT_URL': {
              const currentUrl = page.url();
              if (!currentUrl.includes(value)) {
                throw new Error(
                  `URL "${currentUrl}" does not include "${value}"`,
                );
              }
              break;
            }
            case 'ASSERT_TITLE': {
              const titleValue = await page.title();
              if (!titleValue.includes(value)) {
                throw new Error(
                  `Title "${titleValue}" does not include "${value}"`,
                );
              }
              break;
            }
            case 'WAIT': {
              const ms = parseInt(value) || 2000;
              await page.waitForTimeout(ms);
              break;
            }
            case 'SCROLL': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  currentFrame,
                  effectiveSelector,
                  scenario.id,
                  step.metadata,
                );
              if (healed)
                logs.push({
                  step: `STEP_${currentStepIdx}: SCROLL`,
                  status: 'HEALED',
                  info: `Self-healed via ${method}`,
                  timestamp: new Date().toISOString(),
                });
              await locator.scrollIntoViewIfNeeded();
              break;
            }
            case 'COMMENT':
              // Comment steps are just visual separators - log and continue
              logs.push({
                step: `STEP_${currentStepIdx}: COMMENT`,
                info: value || 'Separator',
                timestamp: new Date().toISOString(),
              });
              break;
            default:
              logs.push({
                step: step.type,
                error: 'Unknown step type',
                timestamp: new Date().toISOString(),
              });
          }
        } catch (stepError: unknown) {
          status = 'FAILED';
          const message =
            stepError instanceof Error ? stepError.message : String(stepError);
          logs.push({
            step: `STEP_${currentStepIdx}: ${step.type}`,
            error: message,
            duration: Date.now() - stepStart,
            timestamp: new Date().toISOString(),
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
    } catch (err: unknown) {
      status = 'FAILED';
      const message = err instanceof Error ? err.message : String(err);
      logs.push({
        error: 'Global execution error',
        message: message,
        timestamp: new Date().toISOString(),
      });
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
      this.executionStates.delete(scenarioId);
      this.eventsGateway.emitStatus(scenarioId, 'IDLE');

      // If we learned new metadata, update the scenario
      if (scenarioUpdated) {
        await this.prisma.webScenario.update({
          where: { id: scenario.id },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: { steps: updatedSteps as unknown as any },
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        logs: logs as any,
        screenshot: screenshotPath,
      },
    });
  }

  private async capturePageFeedback(
    container: Page | any,
    logs: any[],
    currentStepIdx: number,
  ) {
    try {
      // Common selectors for feedback on demoqa.com and similar sites
      const feedbackSelectors = [
        '#linkResponse',
        '#dynamicClickMessage',
        '#rightClickMessage',
        '#doubleClickMessage',
        '#submit-results',
        '#output',
        '.toast-message',
        '.alert-success',
        '.alert-danger',
        '[id*="Response"]',
        '[id*="Message"]',
        '[id*="Feedback"]',
      ];

      for (const selector of feedbackSelectors) {
        const element = container.locator(selector).first();
        const isVisible = await element
          .isVisible()
          .catch(() => false);
        
        if (isVisible) {
          const text = await element.innerText().catch(() => '');
          if (text) {
             // Only log if it looks like a real message (not just empty or too short)
             if (text.length > 3) {
                logs.push({
                    step: `STEP_${currentStepIdx}: OBSERVATION`,
                    status: 'INFO',
                    info: `Feedback detected: ${text.trim()}`,
                    timestamp: new Date().toISOString(),
                });
                // Once we found one, we usually don't need to keep looking for others in the same step
                return;
             }
          }
        }
      }
    } catch (e) {
      // Non-blocking catch
      console.warn('[capturePageFeedback] failed:', e);
    }
  }

  private async findElementWithHealing(
    container: Page | any, // Can be Page or Frame
    selector: string,
    scenarioId: string,
    metadata?: StepMetadata,
  ): Promise<{ locator: Locator; healed: boolean; method?: string }> {
    // 1. Attempt Original Selector (Fast Fail)
    try {
      const locator = container.locator(selector).first();
      // Short timeout to detect failure quickly.
      // If the element is not attached within 2s, we assume it's broken.
      await locator.waitFor({ state: 'attached', timeout: 2000 });
      return { locator, healed: false };
    } catch (e) {
      if (!metadata) throw e; // No metadata, let it fail naturally
      console.warn(
        `[Self-Healing] Selector ${selector} failed. Initiating recovery...`,
      );
    }

    // 2. Healing Strategy - Weighted Scoring
    const candidates: {
      locator: Locator;
      score: number;
      method: string;
      info: string;
    }[] = [];

    // A. Test ID (Weight: 1.0) - Highest Priority
    if (metadata.testId) {
      try {
        const locator = container.getByTestId(metadata.testId).first();
        if ((await locator.count()) > 0) {
          candidates.push({
            locator,
            score: 1.0,
            method: 'TEST_ID',
            info: `data-testid="${metadata.testId}"`,
          });
        }
      } catch {
        // Continue
      }
    }

    // B. Role + Name (Weight: 0.8)
    if (metadata.role && metadata.name) {
      try {
        const locator = container
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          .getByRole(metadata.role as any, { name: metadata.name })
          .first();
        if ((await locator.count()) > 0) {
          candidates.push({
            locator,
            score: 0.8,
            method: 'ROLE_AND_NAME',
            info: `role="${metadata.role}" name="${metadata.name}"`,
          });
        }
      } catch {
        // Continue
      }
    }

    // C. Text Content (Weight: 0.7)
    if (metadata.text) {
      try {
        const locator = container.getByText(metadata.text).first();
        if ((await locator.count()) > 0) {
          candidates.push({
            locator,
            score: 0.7,
            method: 'TEXT_CONTENT',
            info: `text="${metadata.text}"`,
          });
        }
      } catch {
        // Continue
      }
    }

    // D. Placeholder (Weight: 0.6)
    if (metadata.placeholder) {
      try {
        const locator = container.getByPlaceholder(metadata.placeholder).first();
        if ((await locator.count()) > 0) {
          candidates.push({
            locator,
            score: 0.6,
            method: 'PLACEHOLDER',
            info: `placeholder="${metadata.placeholder}"`,
          });
        }
      } catch {
        // Continue
      }
    }

    // E. Name Attribute (Weight: 0.5)
    if (metadata.name) {
      try {
        const locator = container.locator(`[name="${metadata.name}"]`).first();
        if ((await locator.count()) > 0) {
          candidates.push({
            locator,
            score: 0.5,
            method: 'NAME_ATTRIBUTE',
            info: `name="${metadata.name}"`,
          });
        }
      } catch {
        // Continue
      }
    }

    // Decision Phase
    if (candidates.length > 0) {
      // Sort by score DESC
      candidates.sort((a, b) => b.score - a.score);
      const winner = candidates[0];

      console.log(
        `[Self-Healing] Winner: ${winner.method} (Score: ${winner.score}) - ${winner.info}`,
      );
      this.eventsGateway.emitHealing(scenarioId, {
        method: winner.method,
        score: winner.score,
        info: winner.info,
        status: 'HEALED',
      });
      if (candidates.length > 1) {
        console.log(
          `[Self-Healing] Candidates: ${candidates.map((c) => `${c.method}(${c.score})`).join(', ')}`,
        );
      }

      await winner.locator.waitFor({ state: 'attached', timeout: 1000 });
      return { locator: winner.locator, healed: true, method: winner.method };
    }

    // Fallback: Return original to throw specific error from Playwright
    return { locator: container.locator(selector).first(), healed: false };
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
        scenario: { projectId },
      },
      include: {
        scenario: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async clearProjectHistory(projectId: string) {
    return this.prisma.webExecution.deleteMany({
      where: {
        scenario: { projectId },
      },
    });
  }

  async clearHistory(scenarioId: string) {
    return this.prisma.webExecution.deleteMany({
      where: { scenarioId },
    });
  }

  async getHealingStats() {
    // Fetch last 100 successful executions to analyze healing
    const executions = await this.prisma.webExecution.findMany({
      where: {
        status: { in: ['SUCCESS', 'FAILED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { scenario: { select: { name: true } } },
    });

    const stats: Record<string, number> = {};
    let totalHealedEvents = 0;

    for (const exec of executions) {
      const logs = exec.logs as unknown as { status: string }[];
      if (Array.isArray(logs)) {
        const healedLogs = logs.filter((log) => log.status === 'HEALED');
        if (healedLogs.length > 0) {
          const scenarioName = exec.scenario?.name || 'Unknown Scenario';
          stats[scenarioName] = (stats[scenarioName] || 0) + healedLogs.length;
          totalHealedEvents += healedLogs.length;
        }
      }
    }

    return {
      totalHealedEvents,
      scenarios: stats,
      analyzedExecutions: executions.length,
    };
  }
}
