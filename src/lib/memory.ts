/**
 * Memory Service — The "Strategic Brain" of BritSee
 * Handles structured JSON memory blocks for team alignment.
 */

export type MemoryType = 'strategic' | 'operational' | 'instructional' | 'constraint' | 'interpretation';

export interface MemoryBlock {
  id: string;
  type: MemoryType;
  title: string;
  content: any;
  status: 'active' | 'archived' | 'draft';
  priority: number;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  scope?: {
    team?: string;
    project?: string;
    role?: string;
  };
  riskFlags?: { type: string; description: string }[];
}

const MEMORY_STORAGE_KEY = 'britsee_strategic_memory';

export const MemoryService = {
  /**
   * Retrieves all active memory blocks
   */
  getMemory(): MemoryBlock[] {
    const data = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!data) return this.getDefaultMemory();
    try {
      return JSON.parse(data);
    } catch {
      return this.getDefaultMemory();
    }
  },

  /**
   * Saves a memory block (create or update)
   */
  saveMemory(block: Partial<MemoryBlock>): void {
    const memory = this.getMemory();
    const existingIndex = memory.findIndex(m => m.id === block.id);
    
    const now = new Date().toISOString();
    const newBlock: MemoryBlock = {
      id: block.id || `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: block.type || 'strategic',
      title: block.title || 'Untitled Directive',
      content: block.content || {},
      status: block.status || 'active',
      priority: block.priority ?? 1,
      createdAt: block.createdAt || now,
      updatedAt: now,
      tags: block.tags || [],
      scope: block.scope || { team: 'global' },
      riskFlags: block.riskFlags || []
    };

    if (existingIndex >= 0) {
      memory[existingIndex] = newBlock;
    } else {
      memory.unshift(newBlock);
    }

    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memory));
  },

  /**
   * Deletes a memory block
   */
  deleteMemory(id: string): void {
    const memory = this.getMemory().filter(m => m.id !== id);
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memory));
  },

  /**
   * Detects potential conflicts between a new proposal and existing memory
   */
  detectConflicts(newContent: string, type: MemoryType): string[] {
    const memory = this.getMemory().filter(m => m.type === type && m.status === 'active');
    const conflicts: string[] = [];
    
    // Simple keyword-based conflict detection (can be upgraded to LLM-based later)
    if (newContent.toLowerCase().includes('fast') && memory.some(m => JSON.stringify(m.content).toLowerCase().includes('premium'))) {
      conflicts.push("Potential conflict: High-speed expansion may compromise 'Premium' positioning.");
    }
    
    return conflicts;
  },

  /**
   * Get formatted context for AI prompt injection
   */
  getFormattedContext(): string {
    const memory = this.getMemory().filter(m => m.status === 'active');
    if (memory.length === 0) return "No active strategic memory found.";

    let context = "### ACTIVE STRATEGIC MEMORY\n\n";
    
    const categories: Record<MemoryType, MemoryBlock[]> = {
      strategic: [],
      operational: [],
      instructional: [],
      constraint: [],
      interpretation: []
    };

    memory.forEach(m => categories[m.type].push(m));

    Object.entries(categories).forEach(([type, blocks]) => {
      if (blocks.length > 0) {
        context += `[${type.toUpperCase()}]\n`;
        blocks.forEach(b => {
          context += `- ${b.title}: ${typeof b.content === 'string' ? b.content : JSON.stringify(b.content)}\n`;
        });
        context += "\n";
      }
    });

    return context;
  },

  /**
   * Default fallback memory (Boss Directives)
   */
  getDefaultMemory(): MemoryBlock[] {
    return [
      {
        id: 'default_strategic',
        type: 'strategic',
        title: 'Core Values',
        content: { vision: 'Enable growth for UK entrepreneurs via ultra-fast AI tools.' },
        status: 'active',
        priority: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'default_constraint',
        type: 'constraint',
        title: 'Privacy (AWSP)',
        content: 'Do not report private team chat metrics back to owner to maintain trust.',
        status: 'active',
        priority: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
};
