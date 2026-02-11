import { Injectable } from '@nestjs/common';
import { chromium, BrowserContext, Page } from 'playwright';
import { EventsGateway } from '../events/events.gateway';

export interface RecordedEvent {
  type: string;
  selector: string;
  value?: string;
  timestamp?: number;
}

@Injectable()
export class WebScenarioRecorderService {
  constructor(private readonly eventsGateway: EventsGateway) {}

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
    const browser = await chromium.launch({ headless: false }); // Headful required for user recording
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
          
          // Don't record clicks on text-like inputs, they are handled by FILL
          const isTextLikeInput = 
            target.tagName === 'INPUT' && 
            ['text', 'password', 'email', 'tel', 'url', 'search', 'number'].includes((target as HTMLInputElement).type);
          
          if (isTextLikeInput) return;

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

        // Skip radio and checkboxes for FILL, they should be CLICKed
        if (['radio', 'checkbox'].includes(target.type)) return;

        const { xpath, cssPath } = getRobustPaths(target);

        win.recordEvent({
          type: target.tagName === 'SELECT' ? 'SELECT' : 'FILL',
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
        
        const tagName = el.tagName.toLowerCase();
        const attr = (name: string) => el.getAttribute(name);
        
        if (attr('data-testid')) return `[data-testid="${attr('data-testid')}"]`;
        if (attr('name')) return `[name="${attr('name')}"]`;

        if (tagName === 'input') {
          const type = attr('type');
          const value = (el as HTMLInputElement).value;
          if (['radio', 'checkbox'].includes(type || '') && value) {
            return `input[type="${type}"][value="${value}"]`;
          }
        }

        // For list items/links/spans in custom dropdowns or buttons
        if (['a', 'li', 'span', 'button', 'label'].includes(tagName)) {
          const text = (el.innerText || el.textContent || '').trim();
          if (text && text.length > 0 && text.length < 40) {
            return `${tagName}:has-text("${text.replace(/"/g, '\\"')}")`;
          }
        }
        
        // If it's a generic element with classes, use them
        if (['div', 'span', 'section', 'article'].includes(tagName) && el.classList.length > 0) {
          const classes = Array.from(el.classList).filter(c => !c.includes('hover') && !c.includes('active')).join('.');
          if (classes) return `${tagName}.${classes}`;
        }

        return tagName;
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
          testId: el.getAttribute('data-testid'),
        };
      }
    });

    await page.goto(url);
    this.activeSessions.set(sessionId, { browser, context, page, steps });

    // Listen for manual browser close
    page.on('close', async () => {
      if (this.activeSessions.has(sessionId)) {
        console.log(`[Recorder] Browser closed manually for session: ${sessionId}`);
        const finalSteps = await this.stopRecording(sessionId);
        this.eventsGateway.emitRecordingStopped(sessionId, finalSteps);
      }
    });

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
          const id = e.id;
          if (id && !id.includes(':')) return `#${id}`;

          const tagName = e.tagName.toLowerCase();
          const attr = (name: string) => e.getAttribute(name);

          if (attr('data-testid')) return `[data-testid="${attr('data-testid')}"]`;

          if (tagName === 'input') {
            const type = attr('type');
            const name = attr('name');
            const value = (e as HTMLInputElement).value;

            if (['radio', 'checkbox'].includes(type || '')) {
              if (name && value)
                return `input[name="${name}"][value="${value}"]`;
              if (name) return `input[name="${name}"]`;
            }
            if (name) return `input[name="${name}"]`;
          }

          if (tagName === 'select' || tagName === 'textarea') {
            const name = attr('name');
            if (name) return `${tagName}[name="${name}"]`;
          }

          if (tagName === 'a' || tagName === 'li' || tagName === 'span' || tagName === 'button') {
            const text = (e.innerText || e.textContent || '').trim();
            if (text && text.length < 30) {
              return `${tagName}:has-text("${text}")`;
            }
          }

          if (attr('name')) return `[name="${attr('name')}"]`;
          return tagName;
        };

        const getName = (e: HTMLElement): string => {
          // 1. Placeholder
          const placeholder = e.getAttribute('placeholder');
          if (placeholder) return placeholder.trim();

          // 2. Associated Label (via 'for')
          if (e.id) {
            const label = document.querySelector(`label[for="${e.id}"]`) as HTMLElement;
            if (label && (label.innerText || label.textContent)) {
              return (label.innerText || label.textContent || '').trim();
            }
          }

          // 3. Parent Label
          const parentLabel = e.closest('label') as HTMLElement;
          if (parentLabel && (parentLabel.innerText || parentLabel.textContent)) {
            return (parentLabel.innerText || parentLabel.textContent || '').trim();
          }

          // 4. Closest Sibling Label (often found in radio button groups)
          const type = e.getAttribute('type');
          if (['radio', 'checkbox'].includes(type || '')) {
            // Check preceding sibling
            const prev = e.previousElementSibling as HTMLElement;
            if (prev && prev.tagName === 'LABEL' && (prev.innerText || prev.textContent)) {
              return (prev.innerText || prev.textContent || '').trim();
            }
            // Check following sibling
            const next = e.nextElementSibling as HTMLElement;
            if (next && next.tagName === 'LABEL' && (next.innerText || next.textContent)) {
              return (next.innerText || next.textContent || '').trim();
            }
            // Check following text node (common in older sites)
            let nextNode = e.nextSibling;
            if (nextNode && nextNode.nodeType === 3 && nextNode.textContent?.trim()) {
              return nextNode.textContent.trim();
            }
          }

          // 5. Aria-label
          const ariaLabel = e.getAttribute('aria-label');
          if (ariaLabel) return ariaLabel.trim();

          // 6. Name attribute
          const nameAttr = e.getAttribute('name');
          if (nameAttr) return nameAttr.trim();

          // 7. ng-model (Common in demo sites like the one reported)
          const ngModel = e.getAttribute('ng-model');
          if (ngModel) return ngModel.trim();

          // 8. Value (for radio/checkbox)
          if (['radio', 'checkbox'].includes(type || '')) {
            const value = (e as HTMLInputElement).value;
            if (value && value !== 'on') return value.trim();
          }

          // 9. Inner Text (for buttons, links, etc)
          const innerText = (e.innerText || e.textContent || '').trim();
          if (innerText && innerText.length < 50) return innerText;

          return '';
        };

        const finalName = getName(htmlEl);

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
            name: finalName || `Unnamed ${htmlEl.tagName}`,
            placeholder: htmlEl.getAttribute('placeholder'),
            type: htmlEl.getAttribute('type'),
            testId: htmlEl.getAttribute('data-testid'),
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

  private processSteps(rawSteps: RecordedEvent[]): RecordedEvent[] {
    const processed: RecordedEvent[] = [];

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
