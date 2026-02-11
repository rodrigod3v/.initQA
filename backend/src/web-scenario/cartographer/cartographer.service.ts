import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { chromium, Page } from 'playwright';
import { OracleService } from './oracle.service';
import { EventsGateway } from '../../events/events.gateway';

@Injectable()
export class CartographerService {
  constructor(
    private prisma: PrismaService,
    private oracle: OracleService,
    private events: EventsGateway
  ) {}

  async generateOracleScript(projectId: string) {
    return this.oracle.generateTestScript(projectId);
  }

  async generateOracleJSON(projectId: string) {
    return this.oracle.generateTestJSON(projectId);
  }

  async generateTestScenarios(projectId: string) {
    return this.oracle.generateTestScenarios(projectId);
  }

  async mapTopology(projectId: string, startUrl: string, maxPages = 10, maxDepth = 2) {
    console.log(`[Cartographer] Starting mapping for project ${projectId} at ${startUrl}`);
    this.events.emitMappingStatus(projectId, { status: 'MAPPING_STARTED' });

    // Clear existing map for this project to avoid data contamination
    await (this.prisma as any).$executeRawUnsafe(
        `DELETE FROM "GlobalElementMap" WHERE "projectId" = $1`,
        projectId
    );
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const queue: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];
    const visited = new Set<string>();
    const domain = new URL(startUrl).hostname;

    let pagesMapeadas = 0;
    const allDiscoveredElements: any[] = [];

    try {
      while (queue.length > 0 && pagesMapeadas < maxPages) {
        const { url, depth } = queue.shift()!;
        if (visited.has(url) || depth > maxDepth) continue;
        visited.add(url);

        console.log(`[Cartographer] Mapping [${pagesMapeadas + 1}/${maxPages}] depth ${depth}: ${url}`);
        this.events.emitMappingStatus(projectId, { 
          status: 'MAPPING_IN_PROGRESS', 
          pagesMapped: pagesMapeadas + 1 
        });

        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        
        // Wait for potential dynamic content (SPAs)
        await page.waitForTimeout(2000);

        // --- TREE EXPANSION HEURISTIC ---
        // Try to expand trees if a "Expand all" or similar button exists
        try {
            const expandAll = page.locator('button:has-text("Expand"), button[aria-label*="Expand"], .rct-option-expand-all').first();
            if (await expandAll.isVisible()) {
                console.log(`[Cartographer] Found tree expansion trigger, clicking...`);
                await expandAll.click();
                await page.waitForTimeout(1000); // Wait for tree to expand
            }
        } catch (e) { /* ignore expansion failure */ }

        // --- FORM DISCOVERY HEURISTIC ---
        // Try to trigger "Add" or "Edit" to reveal hidden modals/forms
        try {
            const potentialTrigger = page.locator('button:has-text("Add"), button:has-text("New"), #addNewRecordButton').first();
            if (await potentialTrigger.isVisible()) {
                console.log(`[Cartographer] Triggering form discovery (Add)...`);
                await potentialTrigger.click();
                await page.waitForTimeout(1000); // Wait for modal to appear
            }
        } catch (e) { /* ignore discovery failure */ }

        // Compute content hash for deduplication
        const pageContent = await page.content();
        const contentHash = this.computeHash(pageContent);
        
        console.log(`[Cartographer] Content Hash: ${contentHash}`);

        // Inject MutationObserver to detect state changes (modals, etc)
        await page.evaluate(() => {
          (window as any)._initqaMutations = [];
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.addedNodes.length > 0) {
                (window as any)._initqaMutations.push({
                  type: 'ADDITION',
                  nodeCount: mutation.addedNodes.length,
                  timestamp: Date.now()
                });
              }
            });
          });
          observer.observe(document.body, { childList: true, subtree: true });
        });

        // Perform some "wait time" to see if mutations occur naturally
        await page.waitForTimeout(1000);

        const mutations = await page.evaluate(() => (window as any)._initqaMutations);
        if (mutations && mutations.length > 0) {
          console.log(`[Cartographer] Detected ${mutations.length} dynamic UI changes on ${url}`);
        }

        pagesMapeadas++;

        // Discovery elements and links
        // Discovery elements and links
        const { elements, links } = await page.evaluate(() => {
          const allElements: any[] = [];
          const allLinks: string[] = [];

          const discoverRecursive = (doc: Document | ShadowRoot, framePath: string[] = []) => {
              // EXPANDED SELECTOR: 40+ element types for comprehensive coverage
              const interactive = Array.from(doc.querySelectorAll(`
                button, a, input, select, textarea, label,
                [role="button"], [role="link"], [role="tab"], [role="menuitem"],
                [role="option"], [role="switch"], [role="slider"], [role="spinbutton"],
                [role="listbox"], [role="combobox"], [role="searchbox"], [role="checkbox"],
                [role="radio"], [role="treeitem"],
                [onclick], [ng-click], [v-on\\:click],
                span[class*="btn"], span[class*="button"], span[class*="link"], span[class*="clickable"],
                div[class*="btn"], div[class*="button"], div[class*="clickable"], div[class*="action"],
                td[onclick], tr[onclick], td[class*="clickable"], tr[class*="action"],
                th[onclick], th[class*="sortable"],
                [aria-haspopup], [aria-controls], [aria-selected],
                [contenteditable="true"],
                .rct-collapse, .rct-checkbox, .rct-node,
                [id*="edit"], [id*="delete"], [id*="add"], [id*="submit"], [id*="save"],
                [class*="edit"], [class*="delete"], [class*="action"], [class*="close"],
                img[onclick], svg[onclick], i[onclick],
                details, summary
              `.trim().replace(/\s+/g, ' ')));
              
              const els = interactive
                .filter(el => {
                  const rect = el.getBoundingClientRect();
                  return rect.width > 0 && rect.height > 0;
                })
                .map(el => {
                  const htmlEl = el as HTMLElement;
                  const rect = htmlEl.getBoundingClientRect();
                  
                  const neighbors: { tag: string; text?: string }[] = [];
                  let prev = htmlEl.previousElementSibling as HTMLElement;
                  if (prev) neighbors.push({ tag: prev.tagName, text: (prev.innerText || '').substring(0, 20) });
                  let next = htmlEl.nextElementSibling as HTMLElement;
                  if (next) neighbors.push({ tag: next.tagName, text: (next.innerText || '').substring(0, 20) });

                  // Find associated label
                  let labelText = '';
                  if (htmlEl.id) {
                    const label = doc.querySelector(`label[for="${htmlEl.id}"]`);
                    if (label) labelText = (label as HTMLElement).innerText;
                  }
                  if (!labelText) {
                    const parentLabel = htmlEl.closest('label');
                    if (parentLabel) labelText = parentLabel.innerText;
                  }
                  
                  // CONTEXT CAPTURE: Track parent containers for better test generation
                  const parentForm = htmlEl.closest('form');
                  const parentTable = htmlEl.closest('table');
                  const parentModal = htmlEl.closest('[role="dialog"], .modal, .modal-content, [aria-modal="true"]');
                  const parentTabPanel = htmlEl.closest('[role="tabpanel"]');
                  const parentRow = htmlEl.closest('tr');

                   const isFeedbackElement = (htmlEl.id && (
                        htmlEl.id.toLowerCase().includes('response') || 
                        htmlEl.id.toLowerCase().includes('message') || 
                        htmlEl.id.toLowerCase().includes('output') ||
                        htmlEl.id.toLowerCase().includes('feedback')
                   )) || (htmlEl.getAttribute('role') || '').toLowerCase().includes('status') || htmlEl.classList.contains('toast-message');

                   return {
                     tagName: htmlEl.tagName,
                     text: (htmlEl.innerText || htmlEl.textContent || htmlEl.getAttribute('placeholder') || '').trim().substring(0, 100),
                     label: labelText.trim().substring(0, 100),
                     role: htmlEl.getAttribute('role') || htmlEl.tagName.toLowerCase(),
                     isFeedback: isFeedbackElement, // Flag for Oracle
                     framePath: framePath, // Track iFrame context
                     attributes: {
                         id: htmlEl.id,
                         name: htmlEl.getAttribute('name'),
                         placeholder: htmlEl.getAttribute('placeholder'),
                         ariaLabel: htmlEl.getAttribute('aria-label'),
                         dataTestId: htmlEl.getAttribute('data-testid') || htmlEl.getAttribute('data-test'),
                         type: htmlEl.getAttribute('type'),
                         sourceUrl: window.location.href,
                     },
                     // CONTEXT for better selector generation and test flow
                     context: {
                         formId: parentForm?.id || null,
                         tableId: parentTable?.id || null,
                         modalId: parentModal?.id || null,
                         tabPanelId: parentTabPanel?.id || null,
                         rowIndex: parentRow?.rowIndex ?? null,
                     },
                     state: {
                         checked: (htmlEl as HTMLInputElement).checked || false,
                         value: (htmlEl as HTMLInputElement).value || '',
                     },
                     boundingBox: {
                         x: rect.x,
                         y: rect.y,
                         width: rect.width,
                         height: rect.height
                     },
                     neighbors
                   };
                 });
              
              allElements.push(...els);

              // Find links in this document
              const links = Array.from(doc.querySelectorAll('a'))
                .map(a => (a as HTMLAnchorElement).href)
                .filter(href => href && href.startsWith('http'));
              allLinks.push(...links);

              // RECURSE into iFrames
              const iframes = Array.from(doc.querySelectorAll('iframe'));
              for (const iframe of iframes) {
                  try {
                      const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
                      if (frameDoc) {
                          // Generate a selector for the frame to use in framePath
                          const frameId = iframe.id || iframe.name || '';
                          const frameSelector = frameId ? `#${frameId}` : `iframe[src*="${iframe.src.split('/').pop()}"]`;
                          discoverRecursive(frameDoc, [...framePath, frameSelector]);
                      }
                  } catch (e) {
                      // Cross-origin iFrame, cannot access content
                      console.warn('Cannot access iFrame content due to CORS', iframe.src);
                  }
              }
          };

          discoverRecursive(document);
          return { elements: allElements, links: Array.from(new Set(allLinks)) };
        });

        allDiscoveredElements.push(...elements);

        // Add internal links to queue
        for (const link of links) {
          try {
            const linkUrl = new URL(link);
            const normalizedLink = linkUrl.origin + linkUrl.pathname;
            if (linkUrl.hostname === domain && !visited.has(normalizedLink)) {
              queue.push({ url: normalizedLink, depth: depth + 1 });
            }
          } catch (e) { /* ignore invalid URLs */ }
        }

        // Save to DB
        for (const el of elements) {
          try {
            await (this.prisma as any).$executeRawUnsafe(
              `INSERT INTO "GlobalElementMap" ("id", "projectId", "tagName", "textContent", "semanticRole", "visualBoundingBox", "confidenceScore", "interactionHistory", "createdAt", "updatedAt") 
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, NOW(), NOW())`,
               projectId, el.tagName, el.label || el.text, this.inferSemanticRole(el), JSON.stringify(el.boundingBox), 1.0, JSON.stringify({ ...el.attributes, text: el.text })
            );
          } catch (e) {
            console.error(`[Cartographer] Failed to process element: ${e.message}`);
          }
        }
      }

      // UI Contract Validation: Detect missing elements
      const previouslyMapped = await (this.prisma as any).$queryRawUnsafe(
        `SELECT * FROM "GlobalElementMap" WHERE "projectId" = $1`, projectId
      ) as any[];
      
      const currentElementKeys = new Set(allDiscoveredElements.map(el => `${el.tagName}:${el.text}`));
      
      for (const prev of previouslyMapped) {
        if (!currentElementKeys.has(`${prev.tagName}:${prev.textContent}`)) {
            console.warn(`[Cartographer] UI Contract Violation: Element ${prev.semanticRole} (${prev.tagName}) is missing!`);
        }
      }

      // Success Notification
      this.events.emitMappingStatus(projectId, { 
        status: 'MAPPING_SUCCESS', 
        pagesMapped: pagesMapeadas 
      });

      return { pagesMapped: pagesMapeadas, status: 'TOPOLOGY_RECONCILED' };
    } catch (error) {
      console.error(`[Cartographer] Mapping failed: ${error.message}`);
      this.events.emitMappingStatus(projectId, { 
        status: 'MAPPING_FAILED', 
        error: error.message 
      });
      throw error;
    } finally {
      await browser.close();
    }
  }

  private computeHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash.toString();
  }

  private inferSemanticRole(el: any): string {
    const text = (el.text || '').toUpperCase();
    const label = (el.label || '').toUpperCase();
    const name = (el.attributes?.name || '').toUpperCase();
    const id = (el.attributes?.id || '').toUpperCase();
    const placeholder = (el.attributes?.placeholder || '').toUpperCase();
    const ariaLabel = (el.attributes?.ariaLabel || '').toUpperCase();
    const role = (el.role || '').toUpperCase();
    const combined = `${text} ${label} ${name} ${placeholder} ${id} ${ariaLabel}`;
    
    // .initQA Specific Roles
    if (combined.includes('START_MAP') || combined.includes('MAPPING')) return 'CARTOGRAPHER_ACTION';
    if (combined.includes('GENERATE_GOLDEN') || combined.includes('THE ORACLE')) return 'ORACLE_ACTION';
    if (combined.includes('RUN SCENARIO') || combined.includes('EXECUTION')) return 'EXECUTION_TRIGGER';
    if (combined.includes('REGISTER_NEW') || combined.includes('CREATE_SCENARIO')) return 'SCENARIO_CREATION';
    
    // HTML5 Input Types (NEW)
    if (el.attributes?.type === 'date') return 'DATE_INPUT';
    if (el.attributes?.type === 'time') return 'TIME_INPUT';
    if (el.attributes?.type === 'datetime-local') return 'DATETIME_INPUT';
    if (el.attributes?.type === 'month') return 'MONTH_INPUT';
    if (el.attributes?.type === 'week') return 'WEEK_INPUT';
    if (el.attributes?.type === 'color') return 'COLOR_PICKER';
    if (el.attributes?.type === 'range') return 'RANGE_SLIDER';
    if (el.attributes?.type === 'file') return 'FILE_UPLOAD';
    if (el.attributes?.type === 'number') return 'NUMBER_INPUT';
    if (el.attributes?.type === 'search') return 'SEARCH_INPUT';
    if (el.attributes?.type === 'url') return 'URL_INPUT';
    
    // ARIA Roles (NEW)
    if (role === 'TAB' || el.attributes?.role === 'tab') return 'TAB_ACTION';
    if (role === 'MENUITEM' || el.attributes?.role === 'menuitem') return 'MENU_ITEM_ACTION';
    if (role === 'SWITCH' || el.attributes?.role === 'switch') return 'TOGGLE_SWITCH';
    if (role === 'SLIDER' || el.attributes?.role === 'slider') return 'SLIDER_ACTION';
    if (role === 'SPINBUTTON' || el.attributes?.role === 'spinbutton') return 'SPIN_BUTTON';
    if (role === 'OPTION' || el.attributes?.role === 'option') return 'SELECT_OPTION';
    if (role === 'COMBOBOX' || el.attributes?.role === 'combobox') return 'COMBOBOX_ACTION';
    if (role === 'LISTBOX' || el.attributes?.role === 'listbox') return 'LISTBOX_ACTION';
    if (role === 'SEARCHBOX' || el.attributes?.role === 'searchbox') return 'SEARCHBOX_INPUT';
    if (role === 'TREEITEM' || el.attributes?.role === 'treeitem') return 'TREE_ITEM_ACTION';
    
    // Contenteditable (NEW)
    if (el.attributes?.contenteditable === 'true') return 'RICH_TEXT_EDITOR';
    
    // Table Interactions (NEW)
    if (el.tagName === 'TD' || el.tagName === 'TH') {
      if (combined.includes('SELECT') || combined.includes('CHOOSE')) return 'TABLE_ROW_SELECT';
      if (combined.includes('VIEW') || combined.includes('DETAILS')) return 'TABLE_ROW_VIEW';
      if (combined.includes('SORT') || el.attributes?.class?.includes('sortable')) return 'TABLE_HEADER_SORT';
      if (el.tagName === 'TH') return 'TABLE_HEADER';
      return 'TABLE_CELL_ACTION';
    }
    if (el.tagName === 'TR') return 'TABLE_ROW_ACTION';
    
    // Labels as Clickable Elements (NEW)
    if (el.tagName === 'LABEL') {
      if (combined.includes('AGREE') || combined.includes('ACCEPT') || combined.includes('TERMS')) return 'TERMS_LABEL_ACTION';
      return 'FORM_LABEL_ACTION';
    }
    
    // Spans and Divs with Actions (NEW)
    if (el.tagName === 'SPAN' || el.tagName === 'DIV') {
      if (el.attributes?.class?.includes('btn') || el.attributes?.class?.includes('button')) return 'CUSTOM_BUTTON_ACTION';
      if (el.attributes?.class?.includes('link')) return 'CUSTOM_LINK_ACTION';
      if (el.attributes?.class?.includes('close')) return 'CLOSE_ACTION';
      if (combined.includes('CLOSE') || combined.includes('×')) return 'CLOSE_ACTION';
    }
    
    // Details/Summary (NEW)
    if (el.tagName === 'SUMMARY') return 'ACCORDION_TOGGLE';
    if (el.tagName === 'DETAILS') return 'ACCORDION_CONTAINER';
    
    // Identity & Contact
    if (combined.includes('FIRST NAME') || combined.includes('NOME')) return 'FIRST_NAME_INPUT';
    if (combined.includes('LAST NAME') || combined.includes('SOBRENOME')) return 'LAST_NAME_INPUT';
    if (combined.includes('FULL NAME') || combined.includes('NOME COMPLETO')) return 'FULL_NAME_INPUT';
    if (combined.includes('EMAIL') || el.attributes?.type === 'email') return 'EMAIL_INPUT';
    if (combined.includes('PHONE') || combined.includes('TELEFONE') || combined.includes('MOBILE') || combined.includes('CELULAR') || el.attributes?.type === 'tel') return 'PHONE_INPUT';
    
    // Security
    if (combined.includes('PASSWORD') || combined.includes('SENHA') || el.attributes?.type === 'password') return 'SECURITY_INPUT';
    
    // Address
    if (combined.includes('CURRENT') && combined.includes('ADDRESS')) return 'CURRENT_ADDRESS_INPUT';
    if (combined.includes('PERMANENT') && (combined.includes('ADDRESS') || combined.includes('ENDERECO'))) return 'PERMANENT_ADDRESS_INPUT';
    if (combined.includes('ADDRESS') || combined.includes('ENDERECO')) return 'ADDRESS_INPUT';
    if (combined.includes('CITY') || combined.includes('CIDADE')) return 'CITY_INPUT';
    if (combined.includes('ZIP') || combined.includes('CEP') || combined.includes('POSTAL')) return 'ZIP_CODE_INPUT';
    if (combined.includes('COUNTRY') || combined.includes('PAIS')) return 'COUNTRY_INPUT';

    // Hierarchical UI (Trees) & Form Controls
    if (combined.includes('COLLAPSE') || el.attributes?.ariaExpanded === 'true') return 'TREE_COLLAPSE';
    if (combined.includes('EXPAND') || el.attributes?.class?.includes('rct-collapse') || el.attributes?.ariaExpanded === 'false' || el.tagName === 'SVG') return 'TREE_EXPAND';
    if (el.attributes?.class?.includes('rct-checkbox') || el.attributes?.type === 'checkbox' || combined.includes('CHECKBOX')) return 'CHECKBOX_ACTION';
    if (el.attributes?.type === 'radio' || combined.includes('RADIO')) return 'RADIO_ACTION';

    // UI Structure & Tables
    if (combined.includes('ADD') || combined.includes('NEW') || combined.includes('CREATE') || id.includes('ADD')) return 'TABLE_ADD_ACTION';
    if (combined.includes('EDIT') || id.includes('EDIT')) return 'TABLE_EDIT_ACTION';
    if (combined.includes('DELETE') || combined.includes('REMOVE') || id.includes('DELETE')) return 'TABLE_DELETE_ACTION';
    
    // Complex Form Fields & Pagination
    if (combined.includes('PAGE') || combined.includes('SALTO')) return 'TABLE_PAGINATION_ACTION';
    if ((combined.includes('AGE') || id.includes('AGE')) && !combined.includes('PAGE')) return 'AGE_INPUT';
    if (combined.includes('SALARY') || id.includes('SALARY')) return 'SALARY_INPUT';
    if (combined.includes('DEPARTMENT') || id.includes('DEPARTMENT')) return 'DEPARTMENT_INPUT';

    if (combined.includes('SUBJECT') || combined.includes('ASSUNTO')) return 'SUBJECT_INPUT';
    if (combined.includes('MESSAGE') || combined.includes('MENSAGEM') || combined.includes('COMMENTS')) return 'MESSAGE_INPUT';

    // Actions (check INPUT types first to avoid misclassification)
    if (combined.includes('LOGIN') || combined.includes('ENTRAR') || combined.includes('SIGN IN')) return 'LOGIN_ACTION';
    
    // SEARCH: Distinguish between input and button
    if (el.tagName === 'INPUT' && (combined.includes('SEARCH') || el.attributes?.type === 'search')) return 'SEARCH_INPUT';
    if (combined.includes('SEARCH') || combined.includes('BUSCAR') || combined.includes('QUERY')) return 'SEARCH_ACTION';
    
    if (combined.includes('SUBMIT') || combined.includes('ENVIAR') || combined.includes('REGISTER') || combined.includes('CADASTRAR')) return 'SUBMISSION_ACTION';
    if (combined.includes('SAVE') || combined.includes('SALVAR')) return 'SAVE_ACTION';
    if (combined.includes('CANCEL') || combined.includes('CANCELAR')) return 'CANCEL_ACTION';
    
    if (el.isFeedback) return 'FEEDBACK_MESSAGE';

    return `GENERIC_${el.tagName}`;
  }
}
