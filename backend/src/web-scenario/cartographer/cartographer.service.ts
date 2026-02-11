import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { chromium, Page } from 'playwright';
import { FingerprintMatcher } from './fingerprint.utils';
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

        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        
        // Wait for potential dynamic content (SPAs)
        await page.waitForTimeout(2000);

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
        const { elements, links } = await page.evaluate(() => {
          const interactive = Array.from(document.querySelectorAll('button, a, input, [role="button"], select, textarea'));
          
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

              return {
                tagName: htmlEl.tagName,
                text: (htmlEl.innerText || htmlEl.textContent || htmlEl.getAttribute('placeholder') || '').trim().substring(0, 100),
                role: htmlEl.getAttribute('role') || htmlEl.tagName.toLowerCase(),
                attributes: {
                    id: htmlEl.id,
                    name: htmlEl.getAttribute('name'),
                    placeholder: htmlEl.getAttribute('placeholder'),
                    ariaLabel: htmlEl.getAttribute('aria-label'),
                    type: htmlEl.getAttribute('type'),
                    sourceUrl: window.location.href
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

          const anchors = Array.from(document.querySelectorAll('a'))
            .map(a => a.href)
            .filter(href => href && href.startsWith('http'));

          return { elements: els, links: Array.from(new Set(anchors)) };
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
            // Proactive Self-Healing: Check if this element matches an existing one
            const results = await (this.prisma as any).$queryRawUnsafe(
              `SELECT * FROM "GlobalElementMap" WHERE "projectId" = $1 AND "tagName" = $2 AND "semanticRole" = $3 LIMIT 1`,
              projectId, el.tagName, this.inferSemanticRole(el)
            );
            
            const existing = (results as any[])?.[0];

            if (existing) {
              const score = FingerprintMatcher.calculateScore(
                { ...el, visualBoundingBox: el.boundingBox } as any,
                { ...existing, visualBoundingBox: existing.visualBoundingBox as any } as any
              );

              if (score > 0.8) {
                // Update existing record
                await (this.prisma as any).$executeRawUnsafe(
                  `UPDATE "GlobalElementMap" SET "visualBoundingBox" = $1::jsonb, "confidenceScore" = $2, "interactionHistory" = $3::jsonb, "updatedAt" = NOW() WHERE "id" = $4`,
                  JSON.stringify(el.boundingBox), Math.min(existing.confidenceScore + 0.1, 1.0), JSON.stringify(el.attributes), existing.id
                );
                continue;
              }
            }

            await (this.prisma as any).$executeRawUnsafe(
              `INSERT INTO "GlobalElementMap" ("id", "projectId", "tagName", "textContent", "semanticRole", "visualBoundingBox", "confidenceScore", "interactionHistory", "createdAt", "updatedAt") 
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, NOW(), NOW())`,
              projectId, el.tagName, el.text, this.inferSemanticRole(el), JSON.stringify(el.boundingBox), 1.0, JSON.stringify(el.attributes)
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
    
    // .initQA Specific Roles (Self-Sustaining)
    if (text.includes('START_MAP') || text.includes('MAPPING')) return 'CARTOGRAPHER_ACTION';
    if (text.includes('GENERATE_GOLDEN') || text.includes('THE ORACLE')) return 'ORACLE_ACTION';
    if (text.includes('RUN SCENARIO') || text.includes('EXECUTION')) return 'EXECUTION_TRIGGER';
    if (text.includes('REGISTER_NEW') || text.includes('CREATE_SCENARIO')) return 'SCENARIO_CREATION';
    
    // General Roles
    if (text.includes('LOGIN') || text.includes('ENTRAR') || text.includes('SIGN IN')) return 'LOGIN_ACTION';
    if (text.includes('SEARCH') || text.includes('BUSCAR') || text.includes('QUERY')) return 'SEARCH_ACTION';
    if (el.tagName === 'INPUT' && (text.includes('EMAIL') || el.role === 'textbox' || text.includes('USER'))) return 'IDENTITY_INPUT';
    if (el.tagName === 'INPUT' && (text.includes('PASS') || el.role === 'password')) return 'SECURITY_INPUT';
    
    return `GENERIC_${el.tagName}`;
  }
}
