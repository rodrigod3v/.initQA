import { Injectable } from '@nestjs/common';
import { chromium, BrowserContext, Page } from 'playwright';

export interface RecordedEvent {
  type: string;
  selector: string;
  value?: string;
  timestamp?: number;
}

@Injectable()
export class WebScenarioRecorderService {
  private activeSessions = new Map<
    string,
    {
      browser: any;
      context: BrowserContext;
      page: Page;
      steps: RecordedEvent[];
    }
  >();

  async startRecording(url: string, sessionId: string) {
    const browser = await chromium.launch({ headless: false }); // User needs to interact! But in this environment...
    // Wait, if it's headless: false, and the user is on another machine, they won't see it.
    // I should probably use headless: true if I'm doing automated discovery,
    // but the user want to "record their actions".
    // Since the USER is likely local or expects a "remote browser" feel,
    // I'll stick to a "Discovery" approach or a Headful browser if the OS supports it.
    // However, in many server environments, headful fails without Xvfb.

    // REVISED APPROACH: Since I cannot provide a headful browser for the user to interact with easily via web,
    // I will implement a "Manual Step Assistant" in the UI that suggests selectors
    // or a backend recorder that the user can use if they run it locally.

    // For this task, I will implement the logic for the backend recorder.
    const context = await browser.newContext();
    const page = await context.newPage();
    const steps: RecordedEvent[] = [];

    await page.exposeFunction('recordEvent', (event: unknown) => {
      steps.push(event as RecordedEvent);
    });

    await page.addInitScript(() => {
      const win = window as unknown as {
        recordEvent: (event: any) => void;
        addEventListener: typeof window.addEventListener;
      };

      win.addEventListener(
        'click',
        (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          if (
            target.tagName === 'INPUT' &&
            (target as HTMLInputElement).type === 'text'
          )
            return; // Handled by input/change

          // --- SMART SELECTOR LOGIC ---
          // Search for the closest meaningful interactive element
          const interactive =
            target.closest('button, a, input, [role="button"], [onclick]') ||
            target;

          win.recordEvent({
            type: 'CLICK',
            selector: getSelector(interactive as HTMLElement),
            timestamp: Date.now(),
          });
        },
        true,
      );

      const handleInput = (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (
          !target.tagName ||
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
        )
          return;

        win.recordEvent({
          type: 'FILL',
          selector: getSelector(target),
          value: target.value,
          timestamp: Date.now(),
        });
      };

      window.addEventListener('input', handleInput, true);
      window.addEventListener('change', handleInput, true);

      function getSelector(el: HTMLElement): string {
        const id = el.id;
        if (id && !id.includes(':')) return `#${id}`;

        const attr = (name: string) => el.getAttribute(name);

        if (attr('data-testid'))
          return `[data-testid="${attr('data-testid')}"]`;
        if (attr('name')) return `[name="${attr('name')}"]`;
        if (attr('aria-label')) return `[aria-label="${attr('aria-label')}"]`;
        if (attr('role')) return `[role="${attr('role')}"]`;
        if (attr('placeholder'))
          return `[placeholder="${attr('placeholder')}"]`;

        let selector = el.tagName.toLowerCase();

        // Enrich tag selection with classes for more precision than just "div"
        if (el.classList.length > 0) {
          const classes = Array.from(el.classList)
            .filter(
              (c) => !c.includes(':') && !c.includes('[') && c.length < 50,
            )
            .join('.');
          if (classes) selector += `.${classes}`;
        }

        return selector;
      }
    });

    await page.goto(url);
    this.activeSessions.set(sessionId, { browser, context, page, steps });
    return sessionId;
  }

  async stopRecording(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return [];

    const browser = session.browser as { close: () => Promise<void> };
    await browser.close();
    this.activeSessions.delete(sessionId);

    return this.processSteps(session.steps);
  }

  private processSteps(rawSteps: RecordedEvent[]): RecordedEvent[] {
    // Deduplicate consecutive FILL/INPUT events for the same selector
    const processed: RecordedEvent[] = [];

    for (let i = 0; i < rawSteps.length; i++) {
      const current = rawSteps[i];
      const next = rawSteps[i + 1];

      // If current is FILL and next is ALSO FILL for the same selector, skip current
      if (
        current.type === 'FILL' &&
        next &&
        next.type === 'FILL' &&
        next.selector === current.selector
      ) {
        continue;
      }

      processed.push({
        type: current.type,
        selector: current.selector,
        value: current.value,
        timestamp: current.timestamp,
      });
    }

    return processed;
  }
}
