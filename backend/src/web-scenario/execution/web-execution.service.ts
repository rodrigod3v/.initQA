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
  constructor(
    private prisma: PrismaService,
    private utilsService: UtilsService,
    private eventsGateway: EventsGateway,
  ) {}

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
      const steps: ScenarioStep[] =
        (scenario.steps as unknown as ScenarioStep[]) || [];
      console.log(
        `[WebExecutionService] Steps retrieved. Count: ${steps.length}`,
      );
      updatedSteps = [...steps];

      let stepIndex = 0;
      for (const step of steps) {
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
                  page,
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
              break;
            }
            case 'DOUBLE_CLICK': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  page,
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
              break;
            }
            case 'RIGHT_CLICK': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  page,
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
              break;
            }
            case 'FILL': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  page,
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
              await locator.fill(value);
              break;
            }
            case 'TYPE': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  page,
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
              break;
            }
            case 'KEY_PRESS':
              await page.keyboard.press(value);
              break;
            case 'HOVER': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  page,
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
              break;
            }
            case 'SELECT': {
              const { locator, healed, method } =
                await this.findElementWithHealing(
                  page,
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
                  page,
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
                  page,
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
                await locator.click();
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
                  page,
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
                  page,
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
                  page,
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
                  page,
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

  private async findElementWithHealing(
    page: Page,
    selector: string,
    scenarioId: string,
    metadata?: StepMetadata,
  ): Promise<{ locator: Locator; healed: boolean; method?: string }> {
    // 1. Attempt Original Selector (Fast Fail)
    try {
      const locator = page.locator(selector).first();
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
        const locator = page.getByTestId(metadata.testId).first();
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
        const locator = page
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
        const locator = page.getByText(metadata.text).first();
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
        const locator = page.getByPlaceholder(metadata.placeholder).first();
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
        const locator = page.locator(`[name="${metadata.name}"]`).first();
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
    return { locator: page.locator(selector).first(), healed: false };
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
