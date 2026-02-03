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

    try {
      const steps = (scenario.steps as any[]) || [];
      
      let stepIndex = 1;
      for (const step of steps) {
        const stepStart = Date.now();
        const currentStepIdx = stepIndex++;
        try {
          // Replace variables in selector and value
          const selector = this.utilsService.replaceVariables(step.selector, variables);
          const value = this.utilsService.replaceVariables(step.value, variables);

          logs.push({ 
            step: `STEP_${currentStepIdx}: ${step.type}`, 
            info: `Initializing ${step.type}...`, 
            timestamp: new Date().toISOString() 
          });
          
          switch (step.type) {
            case 'GOTO':
              await page.goto(value, { waitUntil: 'load', timeout: 60000 });
              break;
            case 'CLICK':
              await page.click(selector, { force: true });
              break;
            case 'DOUBLE_CLICK':
              await page.dblclick(selector, { force: true });
              break;
            case 'RIGHT_CLICK':
              await page.click(selector, { button: 'right', force: true });
              break;
            case 'FILL':
              await page.fill(selector, value);
              break;
            case 'TYPE':
              await page.type(selector, value);
              break;
            case 'KEY_PRESS':
              await page.keyboard.press(value);
              break;
            case 'HOVER':
              await page.hover(selector);
              break;
            case 'SELECT':
              await page.selectOption(selector, value);
              break;
            case 'CHECK':
              await page.check(selector, { force: true });
              break;
            case 'UNCHECK':
              await page.uncheck(selector, { force: true });
              break;
            case 'SUBMIT':
              // Either click a submit button or press Enter in an input
              if (selector) {
                await page.click(selector);
              } else {
                await page.keyboard.press('Enter');
              }
              await page.waitForLoadState('load');
              break;
            case 'RELOAD':
              await page.reload({ waitUntil: 'load' });
              break;
            case 'ASSERT_VISIBLE':
              await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
              break;
            case 'ASSERT_HIDDEN':
              await page.waitForSelector(selector, { state: 'hidden', timeout: 5000 });
              break;
            case 'ASSERT_TEXT':
              const text = await page.textContent(selector);
              if (!text?.includes(value)) {
                throw new Error(`Text "${value}" not found in ${selector}`);
              }
              break;
            case 'ASSERT_VALUE':
              const val = await page.inputValue(selector);
              if (val !== value) {
                throw new Error(`Value "${val}" does not match expected "${value}" in ${selector}`);
              }
              break;
            case 'ASSERT_URL':
              const currentUrl = page.url();
              if (!currentUrl.includes(value)) {
                throw new Error(`URL "${currentUrl}" does not include "${value}"`);
              }
              break;
            case 'ASSERT_TITLE':
              const title = await page.title();
              if (!title.includes(value)) {
                throw new Error(`Title "${title}" does not include "${value}"`);
              }
              break;
            case 'WAIT':
              const ms = parseInt(value) || 2000;
              await page.waitForTimeout(ms);
              break;
            case 'SCROLL':
              await page.locator(selector).scrollIntoViewIfNeeded();
              break;
            default:
              logs.push({ step: step.type, error: 'Unknown step type', timestamp: new Date().toISOString() });
          }
          
          logs.push({ 
            step: `STEP_${currentStepIdx}: ${step.type}`, 
            status: 'OK', 
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
