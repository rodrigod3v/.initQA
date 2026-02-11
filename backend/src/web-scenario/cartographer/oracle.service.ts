import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OracleService {
  constructor(private prisma: PrismaService) {}

  async generateTestScript(projectId: string): Promise<string> {
    const elements = await (this.prisma as any).$queryRawUnsafe(
      `SELECT * FROM "GlobalElementMap" WHERE "projectId" = $1 ORDER BY "createdAt" ASC`,
      projectId
    ) as any[];

    if (elements.length === 0) return '// No elements mapped for this project.';

    let script = `import { test, expect } from '@playwright/test';\n\n`;
    script += `test('auto-generated test for project ${projectId}', async ({ page }) => {\n`;
    script += `  await page.goto('https://demo.automationtesting.in/Register.html'); // Base URL\n\n`;

    for (const el of elements) {
      if (el.semanticRole === 'LOGIN_ACTION') {
        script += `  // Detected Login Action\n`;
        script += `  await page.click('${this.generateSelector(el)}');\n`;
      } else if (el.semanticRole === 'IDENTITY_INPUT') {
        script += `  // Detected Identity Input\n`;
        script += `  await page.fill('${this.generateSelector(el)}', 'test@example.com');\n`;
      } else if (el.tagName === 'INPUT') {
        script += `  await page.fill('${this.generateSelector(el)}', 'auto-fill');\n`;
      } else if (el.tagName === 'BUTTON') {
        script += `  await page.click('${this.generateSelector(el)}');\n`;
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

        const inputSteps: any[] = [];
        const interactionSteps: any[] = [];
        const submissionSteps: any[] = [];

        for (const el of groupElements) {
            const selector = this.generateSelector(el);
            if (!selector || seenSelectors.has(selector)) continue;
            seenSelectors.add(selector);

            const text = (el.textContent || '').toUpperCase();
            const isSubmission = text.includes('SUBMIT') || text.includes('ENVIAR') || text.includes('REGISTER') || text.includes('SAVE');
            const isClickOnly = el.tagName === 'BUTTON' || el.tagName === 'A' || el.attrs.type === 'radio' || el.attrs.type === 'checkbox';

            if (isSubmission) {
                submissionSteps.push({
                    type: 'CLICK',
                    selector,
                    metadata: { role: el.semanticRole }
                });
            } else if (isClickOnly) {
                interactionSteps.push({
                    type: 'CLICK',
                    selector,
                    metadata: { role: el.semanticRole }
                });
            } else if (el.tagName === 'INPUT' || el.semanticRole.includes('INPUT')) {
                inputSteps.push({
                    type: 'TYPE',
                    selector,
                    value: this.inferValueForRole(el.semanticRole),
                    metadata: { role: el.semanticRole }
                });
            }
        }

        steps.push(...inputSteps.slice(0, 8), ...interactionSteps.slice(0, 4), ...submissionSteps.slice(0, 2));
    }

    return steps;
  }

  private inferValueForRole(role: string): string {
    if (role === 'IDENTITY_INPUT') return 'test@initqa.com';
    if (role === 'SECURITY_INPUT') return 'Password@123';
    return 'initqa-fill';
  }

  private generateSelector(el: any): string {
    const text = el.textContent?.trim() || '';
    const tag = el.tagName.toLowerCase();
    
    const attrs = el.attrs || {};

    // 1. Technical Anchors (Most Stable)
    if (attrs.id) return `#${attrs.id}`;
    if (attrs.name) return `${tag}[name="${attrs.name}"]`;
    if (attrs.ariaLabel) return `${tag}[aria-label="${attrs.ariaLabel}"]`;

    // 2. Semantic Heuristics
    if (el.semanticRole === 'IDENTITY_INPUT') return 'input[type="email"]';
    if (el.semanticRole === 'SECURITY_INPUT') return 'input[type="password"]';
    
    // 3. Textual Heuristics (only if meaningful)
    if (text.length > 1 && text.length < 40) {
      if (tag === 'button' || tag === 'a') {
        return `${tag}:has-text("${text}")`;
      }
      if (tag === 'input' && attrs.placeholder) {
        return `input[placeholder*="${attrs.placeholder.substring(0, 20)}"]`;
      }
    }

    // 4. Fallback for generic inputs if they have a type
    if (tag === 'input' && attrs.type) {
        return `input[type="${attrs.type}"]`;
    }

    return ''; 
  }
}
