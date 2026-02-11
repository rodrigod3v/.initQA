import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { faker } from '@faker-js/faker';

@Injectable()
export class OracleService {
  constructor(private prisma: PrismaService) {}

  async generateTestScript(projectId: string): Promise<string> {
    const elements = await (this.prisma as any).$queryRawUnsafe(
      `SELECT * FROM "GlobalElementMap" WHERE "projectId" = $1 ORDER BY "createdAt" ASC`,
      projectId
    ) as any[];

    let entryUrl = 'https://demo.automationtesting.in/Register.html';
    if (elements.length > 0) {
      try {
        const firstElHistory = typeof elements[0].interactionHistory === 'string' ? JSON.parse(elements[0].interactionHistory) : elements[0].interactionHistory;
        if (firstElHistory?.sourceUrl) entryUrl = firstElHistory.sourceUrl;
      } catch (e) { /* fallback */ }
    }

    let script = `import { test, expect } from '@playwright/test';\n\n`;
    script += `test('auto-generated test for project ${projectId}', async ({ page }) => {\n`;
    script += `  await page.goto('${entryUrl}'); // Base URL\n\n`;

    // --- INTELLIGENT SCRIPT FILTERING ---
    const hasExpansion = elements.some(el => (el.semanticRole || '').includes('EXPAND'));
    const tableRoles = ['TABLE_ADD_ACTION', 'TABLE_EDIT_ACTION', 'TABLE_DELETE_ACTION', 'SEARCH_ACTION'];
    const uniqueTableActions = new Set<string>();

    const filteredElements = elements.filter(el => {
        const role = el.semanticRole || '';
        const selector = this.generateSelector(el);
        
        if (hasExpansion) {
            if (role === 'TREE_COLLAPSE') return false;
            if (role === 'TREE_EXPAND' && !selector.toLowerCase().includes('all')) return false;
        }

        if (tableRoles.includes(role)) {
            if (uniqueTableActions.has(role)) return false;
            uniqueTableActions.add(role);
        }

        return true;
    });

    // Logical Sorting for Script
    filteredElements.sort((a, b) => {
        const roleOrder = ['TABLE_ADD_ACTION', 'SEARCH_ACTION', 'TABLE_EDIT_ACTION', 'TABLE_DELETE_ACTION', 'CHECKBOX_ACTION', 'RADIO_ACTION'];
        const aIdx = roleOrder.findIndex(r => (a.semanticRole || '') === r);
        const bIdx = roleOrder.findIndex(r => (b.semanticRole || '') === r);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return 0;
    });

    // Logic: Trigger (Add/Edit) -> Inputs -> Submission -> Others
    const addTrigger = filteredElements.find(el => (el.semanticRole || '') === 'TABLE_ADD_ACTION');
    const editTrigger = filteredElements.find(el => (el.semanticRole || '') === 'TABLE_EDIT_ACTION');
    
    let finalElements: any[] = [];
    if (addTrigger) {
        // Find inputs and submission
        const inputs = filteredElements.filter(el => (el.semanticRole || '').includes('INPUT') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
        const submission = filteredElements.find(el => (el.semanticRole || '').includes('SUBMISSION'));
        const others = filteredElements.filter(el => el !== addTrigger && !inputs.includes(el) && el !== submission);
        
        finalElements = [addTrigger, ...inputs, ...(submission ? [submission] : []), ...others];
    } else {
        finalElements = filteredElements;
    }

    for (const el of finalElements) {
      const selector = this.generateSelector(el);
      if (!selector) continue;

      const role = el.semanticRole || el.role || '';
      const isInput = (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || role.includes('INPUT')) && !role.includes('CHECKBOX') && !role.includes('RADIO') && !role.includes('ACTION');
      const isAction = ['BUTTON', 'A', 'SPAN', 'SVG'].includes(el.tagName) || role.includes('ACTION') || role.includes('TREE') || role.includes('CHECKBOX') || role.includes('RADIO') || role.includes('TABLE');

      if (isInput) {
        script += `  // Role: ${role}\n`;
        if (el.tagName === 'SELECT') {
          script += `  await page.selectOption('${selector}', '${this.inferValueForRole(role)}');\n`;
        } else {
          script += `  await page.fill('${selector}', '${this.inferValueForRole(role)}');\n`;
        }
      } else if (isAction) {
        script += `  // Role: ${role}\n`;
        script += `  await page.click('${selector}');\n`;
      }
    }

    script += `});\n`;
    return script;
  }

  async generateTestJSON(projectId: string): Promise<any[]> {
    const elements = await (this.prisma as any).$queryRawUnsafe(
      `SELECT * FROM "GlobalElementMap" WHERE "projectId" = $1 ORDER BY "confidenceScore" DESC, "createdAt" ASC`,
      projectId
    ) as any[];

    if (elements.length === 0) return [];

    const steps: any[] = [];
    const seenSelectors = new Set<string>();

    // Group elements by source URL
    const urlGroups: Record<string, any[]> = {};
    for (const el of elements) {
        let attrs: any = {};
        try {
            attrs = typeof el.interactionHistory === 'string' ? JSON.parse(el.interactionHistory) : el.interactionHistory || {};
        } catch (e) { /* ignore */ }
        
        const url = attrs.sourceUrl;
        if (!url) continue; // SKIP "zombie" elements without source URL tracking

        if (!urlGroups[url]) urlGroups[url] = [];
        urlGroups[url].push({ ...el, attrs });
    }

    // Process each URL group
    for (const [url, groupElements] of Object.entries(urlGroups)) {
        steps.push({
            type: 'GOTO',
            value: url,
            metadata: { generated: true }
        });

        // --- CONTEXT-AWARE STEP ORDERING ---
        // Separate form inputs from table actions based on semantic roles
        // Form inputs are typically triggered by Add/Edit buttons and appear in modals
        const formInputRoles = [
            'FIRST_NAME_INPUT', 'LAST_NAME_INPUT', 'FULL_NAME_INPUT',
            'EMAIL_INPUT', 'PHONE_INPUT', 'SECURITY_INPUT',
            'AGE_INPUT', 'SALARY_INPUT', 'DEPARTMENT_INPUT',
            'ADDRESS_INPUT', 'CITY_INPUT', 'ZIP_CODE_INPUT', 'COUNTRY_INPUT',
            'SUBJECT_INPUT', 'MESSAGE_INPUT',
            'DATE_INPUT', 'TIME_INPUT', 'DATETIME_INPUT',
            'COLOR_PICKER', 'RANGE_SLIDER', 'FILE_UPLOAD', 'URL_INPUT',
            'RICH_TEXT_EDITOR'
        ];
        
        // Only classify as modal if it's a form input OR submission button
        const modalElements = groupElements.filter(el => {
            const role = el.semanticRole || '';
            return formInputRoles.includes(role) || role.includes('SUBMISSION');
        });
        
        // Everything else (table actions, search, pagination) is non-modal
        const nonModalElements = groupElements.filter(el => {
            const role = el.semanticRole || '';
            return !formInputRoles.includes(role) && !role.includes('SUBMISSION');
        });

        // Helper to create steps from elements
        const createSteps = (elements: any[]) => {
            const inputs: any[] = [];
            const clicks: any[] = [];
            const submissions: any[] = [];

            for (const el of elements) {
                const selector = this.generateSelector(el);
                if (!selector || seenSelectors.has(selector)) continue;
                seenSelectors.add(selector);

                const text = (el.text || '').toUpperCase();
                const isSubmission = text.includes('SUBMIT') || text.includes('ENVIAR') || text.includes('REGISTER') || text.includes('SAVE') || (el.semanticRole || '').includes('SUBMISSION');
                const role = el.semanticRole || '';
                const isInputLike = (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || role.includes('INPUT')) && !role.includes('CHECKBOX') && !role.includes('RADIO') && !role.includes('ACTION');
                const isClickOnly = ['BUTTON', 'A'].includes(el.tagName) || el.attrs.type === 'radio' || el.attrs.type === 'checkbox' || role.includes('TREE') || role.includes('CHECKBOX') || role.includes('RADIO') || role.includes('ACTION') || role.includes('TABLE');

                if (isSubmission) {
                    submissions.push({ type: 'CLICK', selector, metadata: { role } });
                } else if (isInputLike) {
                    inputs.push({ type: 'FILL', selector, value: this.inferValueForRole(role), metadata: { role } });
                } else if (isClickOnly) {
                    clicks.push({ type: 'CLICK', selector, metadata: { role } });
                }
            }

            return { inputs, clicks, submissions };
        };

        // Process non-modal elements (table actions, search, pagination)
        const nonModalSteps = createSteps(nonModalElements);
        
        // Process modal elements (form inputs)
        const modalSteps = createSteps(modalElements);

        // DEBUG: Log what we found
        console.log(`[Oracle] Modal elements: ${modalElements.length}, Non-modal: ${nonModalElements.length}`);
        console.log(`[Oracle] Modal steps - inputs: ${modalSteps.inputs.length}, clicks: ${modalSteps.clicks.length}, submissions: ${modalSteps.submissions.length}`);
        console.log(`[Oracle] Non-modal steps - inputs: ${nonModalSteps.inputs.length}, clicks: ${nonModalSteps.clicks.length}`);

        // Extract specific action types
        const addAction = nonModalSteps.clicks.find(s => s.metadata.role === 'TABLE_ADD_ACTION');
        const editAction = nonModalSteps.clicks.find(s => s.metadata.role === 'TABLE_EDIT_ACTION');
        const deleteAction = nonModalSteps.clicks.find(s => s.metadata.role === 'TABLE_DELETE_ACTION');
        const searchInput = nonModalSteps.inputs.find(s => s.metadata.role === 'SEARCH_INPUT');
        const paginationInput = nonModalSteps.inputs.find(s => s.metadata.role === 'TABLE_PAGINATION_ACTION' || s.metadata.role === 'NUMBER_INPUT');

        console.log(`[Oracle] Found actions - Add: ${!!addAction}, Edit: ${!!editAction}, Delete: ${!!deleteAction}, Search: ${!!searchInput}, Pagination: ${!!paginationInput}`);

        // Remove these from the general lists to avoid duplication
        nonModalSteps.clicks = nonModalSteps.clicks.filter(s => 
            !['TABLE_ADD_ACTION', 'TABLE_EDIT_ACTION', 'TABLE_DELETE_ACTION'].includes(s.metadata.role)
        );
        nonModalSteps.inputs = nonModalSteps.inputs.filter(s => 
            !['SEARCH_INPUT', 'TABLE_PAGINATION_ACTION', 'NUMBER_INPUT'].includes(s.metadata.role)
        );

        // Track steps added (excluding GOTO)
        const stepsBeforeFlow = steps.length;

        // --- BUILD CRUD FLOW ---
        // Priority: CREATE → READ → UPDATE → DELETE → PAGINATION
        
        // 1. CREATE flow (if we have Add button and form inputs)
        if (addAction && modalSteps.inputs.length > 0) {
            steps.push(addAction);                          // Open modal
            steps.push(...modalSteps.inputs.slice(0, 10));  // Fill form (max 10 fields)
            if (modalSteps.submissions.length > 0) {
                steps.push(modalSteps.submissions[0]);      // Submit form
            }
        }

        // 2. READ flow (search for created record)
        if (searchInput) {
            // Use the first name from modal inputs as search value
            const firstNameInput = modalSteps.inputs.find(s => s.metadata.role === 'FIRST_NAME_INPUT');
            if (firstNameInput) {
                searchInput.value = firstNameInput.value;
            }
            steps.push(searchInput);
        }

        // 3. UPDATE flow (if we have Edit button)
        if (editAction && modalSteps.inputs.length > 0) {
            steps.push(editAction);                         // Open edit modal
            // Modify only some fields (e.g., salary)
            const salaryInput = modalSteps.inputs.find(s => s.metadata.role === 'SALARY_INPUT');
            if (salaryInput) {
                steps.push({ ...salaryInput, value: this.inferValueForRole('SALARY_INPUT') });
            }
            if (modalSteps.submissions.length > 0) {
                steps.push(modalSteps.submissions[0]);      // Submit changes
            }
        }

        // 4. DELETE flow
        if (deleteAction) {
            steps.push(deleteAction);
        }

        // 5. PAGINATION (only at the end, outside modal context)
        if (paginationInput) {
            steps.push(paginationInput);
        }

        // 6. Fallback: Add remaining interactions if no CRUD flow detected
        const stepsAdded = steps.length - stepsBeforeFlow;
        if (stepsAdded === 0) {
            console.log('[Oracle] No CRUD flow detected, using fallback');
            // Add all available steps
            steps.push(...modalSteps.inputs.slice(0, 10));
            steps.push(...nonModalSteps.inputs.slice(0, 10));
            steps.push(...nonModalSteps.clicks.slice(0, 15));
            steps.push(...modalSteps.clicks.slice(0, 15));
            steps.push(...modalSteps.submissions.slice(0, 1));
            steps.push(...nonModalSteps.submissions.slice(0, 1));
        }
    }

    return steps;
  }

  private inferValueForRole(role: string): string {
    switch (role) {
        // Identity & Contact
        case 'FIRST_NAME_INPUT': return faker.person.firstName();
        case 'LAST_NAME_INPUT': return faker.person.lastName();
        case 'FULL_NAME_INPUT': return faker.person.fullName();
        case 'EMAIL_INPUT': return faker.internet.email();
        case 'PHONE_INPUT': return faker.phone.number();
        case 'SECURITY_INPUT': return faker.internet.password();
        
        // Address
        case 'CURRENT_ADDRESS_INPUT': return faker.location.streetAddress();
        case 'PERMANENT_ADDRESS_INPUT': return faker.location.streetAddress();
        case 'ADDRESS_INPUT': return faker.location.streetAddress();
        case 'CITY_INPUT': return faker.location.city();
        case 'ZIP_CODE_INPUT': return faker.location.zipCode();
        case 'COUNTRY_INPUT': return faker.location.country();
        
        // Form Fields
        case 'SUBJECT_INPUT': return faker.lorem.sentence(3);
        case 'MESSAGE_INPUT': return faker.lorem.paragraph();
        case 'AGE_INPUT': return faker.number.int({ min: 18, max: 65 }).toString();
        case 'SALARY_INPUT': return faker.number.int({ min: 2000, max: 15000 }).toString();
        case 'DEPARTMENT_INPUT': return faker.commerce.department();
        
        // HTML5 Input Types (NEW)
        case 'DATE_INPUT': return faker.date.future().toISOString().split('T')[0]; // YYYY-MM-DD
        case 'TIME_INPUT': return '14:30'; // HH:MM
        case 'DATETIME_INPUT': return faker.date.future().toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
        case 'MONTH_INPUT': return '2024-06'; // YYYY-MM
        case 'WEEK_INPUT': return '2024-W25'; // YYYY-Www
        case 'COLOR_PICKER': return faker.color.rgb({ format: 'hex' }); // #RRGGBB
        case 'RANGE_SLIDER': return faker.number.int({ min: 0, max: 100 }).toString();
        case 'FILE_UPLOAD': return ''; // Cannot auto-fill file inputs
        case 'NUMBER_INPUT': return faker.number.int({ min: 1, max: 100 }).toString();
        case 'SEARCH_INPUT': return faker.lorem.word();
        case 'URL_INPUT': return faker.internet.url();
        
        // Rich Text (NEW)
        case 'RICH_TEXT_EDITOR': return faker.lorem.paragraphs(2);
        
        // Table Pagination (NEW)
        case 'TABLE_PAGINATION_ACTION': return '1'; // Default to first page or rows
        
        // ARIA Components - Most are click actions, not fill actions
        // These will be handled by CLICK in generateTestJSON, but if needed:
        case 'SEARCHBOX_INPUT': return faker.lorem.word();
        case 'COMBOBOX_ACTION': return faker.lorem.word();
        
        default:
            if (role.toLowerCase().includes('textarea')) return faker.lorem.paragraphs(2);
            if (role.includes('SEARCH')) return faker.lorem.word();
            if (role.includes('INPUT')) return faker.lorem.words(2);
            return faker.lorem.words(2);
    }
  }

  private generateSelector(el: any): string {
    const text = (el.text || '').trim();
    const tag = (el.tagName || '').toLowerCase();
    
    let attrs: any = {};
    try {
        attrs = typeof el.interactionHistory === 'string' ? JSON.parse(el.interactionHistory) : el.interactionHistory || {};
    } catch (e) { /* ignore */ }

    // 1. Technical Anchors (Best for Automation)
    if (attrs.dataTestId) return `[data-testid="${attrs.dataTestId}"], [data-test="${attrs.dataTestId}"]`;
    if (attrs.id) {
        // Blacklist common ads/banners
        const id = attrs.id.toLowerCase();
        if (id.includes('fixedban') || id.includes('google_ads') || id.includes('banner')) return '';
        return `#${attrs.id}`;
    }
    if (attrs.name) return `${tag}[name="${attrs.name}"]`;
    if (attrs.ariaLabel) return `${tag}[aria-label="${attrs.ariaLabel}"]`;

    // 2. Semantic Role Combinations
    if (el.semanticRole?.includes('EMAIL')) return 'input[type="email"]';
    if (el.semanticRole?.includes('PASSWORD')) return 'input[type="password"]';
    
    // 3. Textual content (Stable for Buttons/Links)
    if (text.length > 2 && text.length < 50) {
      if (tag === 'button' || tag === 'a' || tag === 'label' || el.tagName === 'SPAN') {
        return `${tag}:has-text("${text}")`;
      }
      if (tag === 'input' && attrs.placeholder) {
        return `input[placeholder*="${attrs.placeholder.substring(0, 15)}"]`;
      }
    }

    // 4. CSS Class-based heuristics for complex components (Trees/Grids)
    if (attrs.class) {
        if (attrs.class.includes('rct-collapse')) return '.rct-collapse';
        if (attrs.class.includes('rct-checkbox')) return '.rct-checkbox';
        if (attrs.class.includes('toggle')) return `.${tag}.toggle`;
    }

    // 5. Fallback Generic
    if (tag === 'input' && attrs.type) return `input[type="${attrs.type}"]`;

    // AVOID super generic selectors that often lead to "zombie" clicks
    if (tag === 'a' || tag === 'button') {
        if (!text || text.length < 2) {
            if (!attrs.id && !attrs.name && !attrs.ariaLabel && !attrs.dataTestId) return '';
        }
    }

    return tag; 
  }

  // NEW: Generate test scenarios as separate, independent blocks
  async generateTestScenarios(projectId: string): Promise<any> {
    const elements = await (this.prisma as any).$queryRawUnsafe(
      `SELECT * FROM "GlobalElementMap" WHERE "projectId" = $1 ORDER BY "confidenceScore" DESC, "createdAt" ASC`,
      projectId
    ) as any[];

    if (elements.length === 0) return { scenarios: [] };

    const seenSelectors = new Set<string>();
    const scenarios: any[] = [];

    // Group elements by source URL
    const urlGroups: Record<string, any[]> = {};
    for (const el of elements) {
        let attrs: any = {};
        try {
            attrs = typeof el.interactionHistory === 'string' ? JSON.parse(el.interactionHistory) : el.interactionHistory || {};
        } catch (e) { /* ignore */ }
        
        const url = attrs.sourceUrl;
        if (!url) continue;

        if (!urlGroups[url]) urlGroups[url] = [];
        urlGroups[url].push({ ...el, attrs });
    }

    // Process each URL group
    for (const [url, groupElements] of Object.entries(urlGroups)) {
        // Separate form inputs from table actions
        const formInputRoles = [
            'FIRST_NAME_INPUT', 'LAST_NAME_INPUT', 'FULL_NAME_INPUT',
            'EMAIL_INPUT', 'PHONE_INPUT', 'SECURITY_INPUT',
            'AGE_INPUT', 'SALARY_INPUT', 'DEPARTMENT_INPUT',
            'ADDRESS_INPUT', 'CITY_INPUT', 'ZIP_CODE_INPUT', 'COUNTRY_INPUT',
            'SUBJECT_INPUT', 'MESSAGE_INPUT',
            'DATE_INPUT', 'TIME_INPUT', 'DATETIME_INPUT',
            'COLOR_PICKER', 'RANGE_SLIDER', 'FILE_UPLOAD', 'URL_INPUT',
            'RICH_TEXT_EDITOR'
        ];
        
        const modalElements = groupElements.filter(el => {
            const role = el.semanticRole || '';
            return formInputRoles.includes(role) || role.includes('SUBMISSION');
        });
        
        const nonModalElements = groupElements.filter(el => {
            const role = el.semanticRole || '';
            return !formInputRoles.includes(role) && !role.includes('SUBMISSION');
        });

        // Helper to create steps from elements (Frame-Aware)
        const createSteps = (elements: any[], currentPath: string[] = []) => {
            const steps: any[] = [];
            let activePath = [...currentPath];

            for (const el of elements) {
                const selector = this.generateSelector(el);
                if (!selector || seenSelectors.has(selector)) continue;
                seenSelectors.add(selector);

                const elFramePath = el.framePath || [];
                
                // Switch frame if needed
                if (JSON.stringify(elFramePath) !== JSON.stringify(activePath)) {
                    if (elFramePath.length === 0) {
                        steps.push({ type: 'SWITCH_FRAME', selector: 'main', metadata: { generated: true } });
                    } else {
                        // For simplicity, always go to main then to the specific frame
                        steps.push({ type: 'SWITCH_FRAME', selector: 'main', metadata: { generated: true } });
                        for (const frame of elFramePath) {
                            steps.push({ type: 'SWITCH_FRAME', selector: frame, metadata: { generated: true } });
                        }
                    }
                    activePath = elFramePath;
                }

                const text = (el.text || '').toUpperCase();
                const isSubmission = text.includes('SUBMIT') || text.includes('ENVIAR') || text.includes('REGISTER') || text.includes('SAVE') || (el.semanticRole || '').includes('SUBMISSION');
                const role = el.semanticRole || '';
                const isInputLike = (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || role.includes('INPUT')) && !role.includes('CHECKBOX') && !role.includes('RADIO') && !role.includes('ACTION');
                const isClickOnly = ['BUTTON', 'A'].includes(el.tagName) || el.attrs.type === 'radio' || el.attrs.type === 'checkbox' || role.includes('TREE') || role.includes('CHECKBOX') || role.includes('RADIO') || role.includes('ACTION') || role.includes('TABLE');
                const isFeedback = role === 'FEEDBACK_MESSAGE';

                if (isSubmission) {
                    steps.push({ type: 'CLICK', selector, metadata: { role, isSubmission: true } });
                } else if (isInputLike) {
                    steps.push({ type: 'FILL', selector, value: this.inferValueForRole(role), metadata: { role } });
                } else if (isClickOnly) {
                    let clickType = 'CLICK';
                    if (text.includes('RIGHT') || text.includes('CONTEXT')) clickType = 'RIGHT_CLICK';
                    else if (text.includes('DOUBLE') || text.includes('DBL')) clickType = 'DOUBLE_CLICK';
                    steps.push({ type: clickType, selector, metadata: { role } });
                } else if (isFeedback) {
                    steps.push({ type: 'ASSERT_VISIBLE', selector, metadata: { role } });
                }
            }

            return steps;
        };

        const allSteps = createSteps(groupElements);
        const inputs = allSteps.filter(s => s.type === 'FILL');
        const clicks = allSteps.filter(s => s.type === 'CLICK' || s.type === 'RIGHT_CLICK' || s.type === 'DOUBLE_CLICK' || s.type === 'HOVER');
        const submissions = allSteps.filter(s => s.metadata?.isSubmission);

        const modalSteps = allSteps.filter(s => s.metadata?.isSubmission || s.type === 'FILL');

        const addAction = allSteps.find(s => s.metadata?.role === 'TABLE_ADD_ACTION');
        const editAction = allSteps.find(s => s.metadata?.role === 'TABLE_EDIT_ACTION');
        const deleteAction = allSteps.find(s => s.metadata?.role === 'TABLE_DELETE_ACTION');
        const searchInput = allSteps.find(s => s.metadata?.role === 'SEARCH_INPUT');
        const paginationInput = allSteps.find(s => s.metadata?.role === 'TABLE_PAGINATION_ACTION' || s.metadata?.role === 'NUMBER_INPUT');

        // --- CREATE SEPARATE SCENARIOS ---

        // Scenario 1: CREATE
        if (addAction && inputs.length > 0) {
            scenarios.push({
                name: 'Create New Record',
                description: 'Test creating a new record with all required fields',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    addAction,
                    ...inputs.slice(0, 10),
                    ...(submissions.length > 0 ? [submissions[0]] : [])
                ]
            });
        }

        // Scenario 2: SEARCH
        if (searchInput) {
            scenarios.push({
                name: 'Search Records',
                description: 'Test search functionality to find specific records',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    { ...searchInput, value: 'test' } // Generic search value
                ]
            });
        }

        // Scenario 3: UPDATE (uses existing record)
        if (editAction && inputs.length > 0) {
            const salaryInput = inputs.find(s => s.metadata.role === 'SALARY_INPUT');
            scenarios.push({
                name: 'Edit Existing Record',
                description: 'Test editing an existing record (uses first record in table)',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    editAction,
                    ...(salaryInput ? [{ ...salaryInput, value: this.inferValueForRole('SALARY_INPUT') }] : inputs.slice(0, 3)),
                    ...(submissions.length > 0 ? [submissions[0]] : [])
                ]
            });
        }

        // Scenario 4: DELETE (uses existing record)
        if (deleteAction) {
            scenarios.push({
                name: 'Delete Record',
                description: 'Test deleting an existing record (uses first record in table)',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    deleteAction
                ]
            });
        }

        // Scenario 5: PAGINATION
        if (paginationInput) {
            scenarios.push({
                name: 'Navigate Pages',
                description: 'Test table pagination by jumping to a specific page',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    { ...paginationInput, value: '2' }
                ]
            });
        }

        // Scenario 6: FALLBACK - Button Interactions (for pages without CRUD)
        // If no scenarios were created for this URL, create a generic button click scenario
        const scenariosForThisUrl = scenarios.filter(s => s.steps.some((st: any) => st.value === url));
        
        console.log(`[Oracle Debug] URL: ${url}`);
        // Scenario 16: DRAG AND DROP (Interactions)
        const draggable = groupElements.find(el => (el.text || '').toLowerCase().includes('drag'));
        const droppable = groupElements.find(el => (el.text || '').toLowerCase().includes('drop'));
        if (draggable && droppable) {
            scenarios.push({
                name: 'Drag and Drop Interaction',
                description: 'Test dragging an element to a target zone',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    { 
                        type: 'DRAG_AND_DROP', 
                        selector: this.generateSelector(draggable), 
                        value: this.generateSelector(droppable),
                        metadata: { role: 'DRAG_SOURCE' } 
                    }
                ]
            });
        }

        // Scenario 17: HOVER (Tooltips, Menus)
        const hoverable = groupElements.find(el => 
            (el.text || '').toLowerCase().includes('hover') || 
            (el.text || '').toLowerCase().includes('tooltip') ||
            (el.role === 'menuitem')
        );
        if (hoverable) {
            scenarios.push({
                name: 'Hover Interaction',
                description: 'Test elements that show content on mouse hover',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    { type: 'HOVER', selector: this.generateSelector(hoverable), metadata: { role: 'HOVER_TARGET' } },
                    { type: 'WAIT', value: '1000', metadata: { generated: true } }
                ]
            });
        }

        console.log(`[Oracle] Generated ${scenarios.length} scenarios for ${url}`);
        console.log(`[Oracle Debug] Scenarios for this URL: ${scenariosForThisUrl.length}`);
        console.log(`[Oracle Debug] Actions available: ${clicks.length}`);
        
        if (scenariosForThisUrl.length === 0 && clicks.length > 0) {
            // Get all clickable elements (buttons, links, etc.)
            const clickableElements = clicks.filter(s => {
                const role = s.metadata?.role || '';
                // Exclude table-specific actions
                return !role.includes('TABLE_') && !role.includes('PAGINATION');
            });

            console.log(`[Oracle Debug] Clickable elements after filtering: ${clickableElements.length}`);
            
            if (clickableElements.length > 0) {
                console.log(`[Oracle Debug] Creating Button Interactions scenario with ${clickableElements.length} buttons`);
                scenarios.push({
                    name: 'Button Interactions',
                    description: 'Test clicking all interactive buttons on the page',
                    steps: [
                        { type: 'GOTO', value: url, metadata: { generated: true } },
                        ...clickableElements.slice(0, 10) // Limit to 10 buttons
                    ]
                });
            } else {
                console.log(`[Oracle Debug] No clickable elements found after filtering`);
            }
        } else {
            console.log(`[Oracle Debug] Skipping fallback - scenarios exist or no clicks available`);
        }

        // Scenario 7: SELECTION - Checkboxes and Radio Buttons
        const checkboxes = clicks.filter(s => {
            const role = s.metadata?.role || '';
            return role.includes('CHECKBOX') || role.includes('TREE');
        });
        
        const radios = clicks.filter(s => {
            const role = s.metadata?.role || '';
            return role.includes('RADIO');
        });

        if (checkboxes.length > 0) {
            scenarios.push({
                name: 'Select Checkboxes',
                description: 'Test selecting multiple checkbox options',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    ...checkboxes.slice(0, 5) // Select up to 5 checkboxes
                ]
            });
        }

        if (radios.length > 0) {
            scenarios.push({
                name: 'Select Radio Options',
                description: 'Test selecting different radio button options',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    ...radios.slice(0, 3) // Select up to 3 radio options
                ]
            });
        }

        // Scenario 8: FORM - Complex Forms (non-CRUD)
        // Detect forms that are NOT part of CRUD tables
        const hasTableActions = addAction || editAction || deleteAction;
        if (!hasTableActions && inputs.length > 3 && submissions.length > 0) {
            // This looks like a standalone form (e.g., practice form)
            scenarios.push({
                name: 'Fill and Submit Form',
                description: 'Test filling out all form fields and submitting',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    ...inputs.slice(0, 15), // Up to 15 form fields
                    ...checkboxes.slice(0, 3), // Include checkboxes if any
                    ...radios.slice(0, 2), // Include radios if any
                    submissions[0] // Submit button
                ]
            });
        }

        // Scenario 9: FILE_UPLOAD - File Upload Elements
        const fileUploads = inputs.filter(s => {
            const role = s.metadata?.role || '';
            return role.includes('FILE_UPLOAD') || s.selector?.includes('[type="file"]');
        });

        if (fileUploads.length > 0) {
            scenarios.push({
                name: 'Upload Files',
                description: 'Test file upload functionality',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    ...fileUploads.map(upload => ({
                        ...upload,
                        value: 'test-file.pdf' // Placeholder file path
                    }))
                ]
            });
        }

        // Scenario 10: LINKS - Link Navigation
        const linksScen = clicks.filter(s => {
            const role = s.metadata?.role || '';
            const selector = s.selector || '';
            return role.includes('LINK') || selector.includes('a[href]');
        });

        // Only create link scenario if there are many links and no other scenarios
        const scenariosForThisUrl2 = scenarios.filter(s => s.steps.some((st: any) => st.value === url));
        if (linksScen.length > 3 && scenariosForThisUrl2.length === 0) {
            scenarios.push({
                name: 'Navigate Links',
                description: 'Test clicking different links on the page',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    ...linksScen.slice(0, 5) // Test up to 5 links
                ]
            });
        }

        // Scenario 11: DATE_PICKER - Date Selection
        const datePickers = inputs.filter(s => {
            const role = s.metadata?.role || '';
            const selector = s.selector || '';
            return role.includes('DATE') || selector.includes('[type="date"]') || 
                   selector.includes('datepicker') || selector.includes('calendar');
        });

        if (datePickers.length > 0) {
            scenarios.push({
                name: 'Select Dates',
                description: 'Test date picker functionality with different dates',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    ...datePickers.map(picker => ({
                        ...picker,
                        value: '2024-12-31' // Future date
                    }))
                ]
            });
        }

        // Scenario 12: SLIDER - Range Slider
        const sliders = clicks.filter(s => {
            const role = s.metadata?.role || '';
            const selector = s.selector || '';
            return role.includes('SLIDER') || selector.includes('[type="range"]') ||
                   selector.includes('slider');
        });

        if (sliders.length > 0) {
            scenarios.push({
                name: 'Adjust Sliders',
                description: 'Test slider controls by setting different values',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    ...sliders.slice(0, 3) // Interact with up to 3 sliders
                ]
            });
        }

        // Scenario 13: TABS - Tab Navigation
        const tabs = clicks.filter(s => {
            const role = s.metadata?.role || '';
            const selector = s.selector || '';
            return role.includes('TAB') || selector.includes('[role="tab"]') ||
                   selector.includes('.nav-tab') || selector.includes('.tab-');
        });

        if (tabs.length > 1) {
            scenarios.push({
                name: 'Navigate Tabs',
                description: 'Test switching between different tabs',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    ...tabs.slice(0, 5) // Click up to 5 tabs
                ]
            });
        }

        // Scenario 14: ACCORDION - Expandable Sections
        const accordions = clicks.filter(s => {
            const role = s.metadata?.role || '';
            const selector = s.selector || '';
            return selector.includes('accordion') || selector.includes('collapse') ||
                   selector.includes('expand');
        });

        if (accordions.length > 0) {
            scenarios.push({
                name: 'Expand Sections',
                description: 'Test expanding and collapsing accordion sections',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    ...accordions.slice(0, 4) // Interact with up to 4 sections
                ]
            });
        }

        // Scenario 15: ALERTS - Alert Buttons
        const alertButtons = clicks.filter(s => {
            const selector = s.selector || '';
            const text = (groupElements.find(el => this.generateSelector(el) === selector)?.text || '').toUpperCase();
            return selector.includes('alert') || text.includes('ALERT') || 
                   text.includes('CONFIRM') || text.includes('PROMPT');
        });

        if (alertButtons.length > 0) {
            scenarios.push({
                name: 'Trigger Alerts',
                description: 'Test alert, confirm, and prompt dialogs',
                steps: [
                    { type: 'GOTO', value: url, metadata: { generated: true } },
                    ...alertButtons.slice(0, 3) // Trigger up to 3 alerts
                ]
            });
        }
    }

    console.log(`[Oracle Debug] Total scenarios generated: ${scenarios.length}`);
    return { scenarios };
  }
}
