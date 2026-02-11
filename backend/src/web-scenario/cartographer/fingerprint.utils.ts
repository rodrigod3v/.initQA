export interface ElementFingerprint {
  tagName: string;
  textContent?: string;
  visualBoundingBox: { x: number; y: number; width: number; height: number };
  accessibilityPath?: string;
  neighbors?: { tag: string; text?: string }[];
}

export class FingerprintMatcher {
  /**
   * Calculates a match score between two elements.
   * A score of 1.0 is a perfect match.
   */
  static calculateScore(a: ElementFingerprint, b: ElementFingerprint): number {
    let score = 0;
    let weights = 0;

    // 1. Tag Name (Critical)
    if (a.tagName === b.tagName) {
      score += 1.0 * 2;
      weights += 2;
    } else {
      return 0; // Different tags usually mean a different element
    }

    // 2. Text Content
    if (a.textContent && b.textContent) {
      const textSimilarity = this.stringSimilarity(a.textContent, b.textContent);
      score += textSimilarity * 3;
      weights += 3;
    }

    // 3. Proximidade Espacial (Visual Bounding Box)
    const posSimilarity = this.spatialSimilarity(a.visualBoundingBox, b.visualBoundingBox);
    score += posSimilarity * 4;
    weights += 4;

    // 4. Neighborhood Analysis (Context)
    if (a.neighbors && b.neighbors) {
      const neighborSimilarity = this.calculateNeighborSimilarity(a.neighbors, b.neighbors);
      score += neighborSimilarity * 2;
      weights += 2;
    }

    return score / weights;
  }

  private static calculateNeighborSimilarity(n1: any[], n2: any[]): number {
    let matches = 0;
    const max = Math.max(n1.length, n2.length);
    if (max === 0) return 1.0;

    for (let i = 0; i < Math.min(n1.length, n2.length); i++) {
      if (n1[i].tag === n2[i].tag) matches++;
      if (n1[i].text === n2[i].text) matches++;
    }

    return (matches / (max * 2));
  }

  private static stringSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    const len = Math.max(s1.length, s2.length);
    if (len === 0) return 1.0;
    
    // Simple edit distance or inclusion check
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    return 0; // For now
  }

  private static spatialSimilarity(r1: any, r2: any): number {
    const dx = Math.abs(r1.x - r2.x);
    const dy = Math.abs(r1.y - r2.y);
    const dw = Math.abs(r1.width - r2.width);
    const dh = Math.abs(r1.height - r2.height);

    // If perfectly aligned
    if (dx < 5 && dy < 5 && dw < 5 && dh < 5) return 1.0;
    
    // If nearby (within 50px)
    if (dx < 50 && dy < 50) return 0.6;

    return 0;
  }
}
