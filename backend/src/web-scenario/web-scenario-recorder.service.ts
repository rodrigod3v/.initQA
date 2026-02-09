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
    const browser = await chromium.launch({ headless: true }); // Standardizing on headless for this agent
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

      // Helper for robust path generation in-browser
      const getRobustPaths = (el: HTMLElement) => {
        const paths: Record<string, string> = {};

        // 1. Full XPath
        const getXPath = (element: Node | null): string => {
          if (!element || element.nodeType !== 1) return '';
          const htmlEl = element as HTMLElement;
          if (htmlEl.id) return `//*[@id="${htmlEl.id}"]`;
          const sames = Array.from(element.parentNode?.childNodes || []).filter(
            (x) => x.nodeName === element.nodeName,
          );
          const index = sames.indexOf(element as ChildNode) + 1;
          return (
            getXPath(element.parentNode) +
            '/' +
            element.nodeName.toLowerCase() +
            '[' +
            index +
            ']'
          );
        };
        paths.xpath = getXPath(el);

        // 2. CSS Path (Hierarchical)
        const getCssPath = (element: HTMLElement | null): string => {
          if (!element || element.nodeType !== 1) return '';
          let path = element.tagName.toLowerCase();
          if (element.id) return `#${element.id}`;
          if (element.classList.length > 0) {
            path += '.' + Array.from(element.classList).join('.');
          }
          const parentPath = getCssPath(element.parentElement);
          return parentPath ? `${parentPath} > ${path}` : path;
        };
        paths.cssPath = getCssPath(el);

        return paths;
      };

      win.addEventListener(
        'click',
        (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          if (
            target.tagName === 'INPUT' &&
            (target as HTMLInputElement).type === 'text'
          )
            return;

          const interactive =
            target.closest(
              'button, a, input, [role="button"], [onclick], select, textarea',
            ) || target;

          const el = interactive as HTMLElement;
          const { xpath, cssPath } = getRobustPaths(el);

          win.recordEvent({
            type: 'CLICK',
            selector: getSimpleSelector(el),
            metadata: getMetadata(el),
            xpath,
            cssPath,
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

        const { xpath, cssPath } = getRobustPaths(target);

        win.recordEvent({
          type: 'FILL',
          selector: getSimpleSelector(target),
          value: target.value,
          metadata: getMetadata(target),
          xpath,
          cssPath,
          timestamp: Date.now(),
        });
      };

      window.addEventListener('input', handleInput, true);
      window.addEventListener('change', handleInput, true);

      function getSimpleSelector(el: HTMLElement): string {
        const id = el.id;
        if (id && !id.includes(':')) return `#${id}`;
        const attr = (name: string) => el.getAttribute(name);
        if (attr('data-testid'))
          return `[data-testid="${attr('data-testid')}"]`;
        if (attr('name')) return `[name="${attr('name')}"]`;
        return el.tagName.toLowerCase();
      }

      function getMetadata(el: HTMLElement) {
        return {
          text: (el.innerText || el.textContent || '').trim().substring(0, 50),
          placeholder: el.getAttribute('placeholder'),
          role: el.getAttribute('role') || el.tagName.toLowerCase(),
          name:
            el.getAttribute('name') ||
            el.getAttribute('aria-label') ||
            (el.innerText || el.textContent || '').trim().substring(0, 30),
        };
      }
    });

    await page.goto(url);
    this.activeSessions.set(sessionId, { browser, context, page, steps });
    return sessionId;
  }

  async discoverPageElements(url: string) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle' });

      const elements = await page.evaluate(() => {
        const interactive = Array.from(
          document.querySelectorAll(
            'button, a, input, select, textarea, [role="button"], [onclick]',
          ),
        );

        return interactive.map((el) => {
          const htmlEl = el as HTMLElement;

          const getXPath = (element: Node | null): string => {
            if (!element || element.nodeType !== 1) return '';
            const e = element as HTMLElement;
            if (e.id) return `//*[@id="${e.id}"]`;
            const sames = Array.from(
              element.parentNode?.childNodes || [],
            ).filter((x) => x.nodeName === element.nodeName);
            const index = sames.indexOf(element as ChildNode) + 1;
            return (
              getXPath(element.parentNode) +
              '/' +
              element.nodeName.toLowerCase() +
              '[' +
              index +
              ']'
            );
          };

          const getCssPath = (element: HTMLElement | null): string => {
            if (!element || element.nodeType !== 1) return '';
            let path = element.tagName.toLowerCase();
            if (element.id) return `#${element.id}`;
            if (element.classList.length > 0) {
              path += '.' + Array.from(element.classList).join('.');
            }
            const parentPath = getCssPath(element.parentElement);
            return parentPath ? `${parentPath} > ${path}` : path;
          };

          const getSimpleSelector = (e: HTMLElement): string => {
            if (e.id && !e.id.includes(':')) return `#${e.id}`;
            const testid = e.getAttribute('data-testid');
            if (testid) return `[data-testid="${testid}"]`;
            const name = e.getAttribute('name');
            if (name) return `[name="${name}"]`;
            return e.tagName.toLowerCase();
          };

          return {
            tagName: htmlEl.tagName,
            text: (htmlEl.innerText || htmlEl.textContent || '')
              .trim()
              .substring(0, 100),
            role: htmlEl.getAttribute('role') || htmlEl.tagName.toLowerCase(),
            selector: getSimpleSelector(htmlEl),
            xpath: getXPath(htmlEl),
            cssPath: getCssPath(htmlEl),
            metadata: {
              name:
                htmlEl.getAttribute('name') ||
                htmlEl.getAttribute('aria-label') ||
                (htmlEl.innerText || htmlEl.textContent || '')
                  .trim()
                  .substring(0, 50),
              placeholder: htmlEl.getAttribute('placeholder'),
              type: htmlEl.getAttribute('type'),
            },
          };
        });
      });

      return elements;
    } finally {
      await browser.close();
    }
  }

  async stopRecording(sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return [];

    const browser = session.browser as { close: () => Promise<void> };
    await browser.close();
    this.activeSessions.delete(sessionId);

    return this.processSteps(session.steps);
  }

  private processSteps(rawSteps: RecordedEvent[]): any[] {
    const processed: any[] = [];

    for (let i = 0; i < rawSteps.length; i++) {
      const current = rawSteps[i];
      const next = rawSteps[i + 1];

      if (
        current.type === 'FILL' &&
        next &&
        next.type === 'FILL' &&
        next.selector === current.selector
      ) {
        continue;
      }

      processed.push(current);
    }

    return processed;
  }
}
