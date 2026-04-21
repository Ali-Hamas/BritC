/**
 * Memory Service — The "Strategic Brain" of Britsee.
 *
 * Storage model after the team refactor:
 * - Owner's blocks live in the Supabase `team_memory` table.
 * - Members can READ their team's blocks (RLS enforced).
 * - A synchronous localStorage snapshot is kept so AI prompt assembly
 *   (which runs inline, not async) always has something to inject.
 * - If the user has no team yet, we fall back to local-only memory
 *   so the app keeps working before a team is created.
 */

import { supabase } from './supabase';
import { TeamService } from './team';

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

// ── Default (baked-in) blocks. Kept as a safety net so the AI always
//    has the AWSP privacy constraint even before team sync completes.
const DEFAULT_MEMORY: MemoryBlock[] = [
  {
    id: 'default_strategic',
    type: 'strategic',
    title: 'Core Values',
    content: { vision: 'Enable growth for UK entrepreneurs via ultra-fast AI tools.' },
    status: 'active',
    priority: 1,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'default_constraint',
    type: 'constraint',
    title: 'Privacy (AWSP)',
    content:
      'Do not report private team chat metrics back to owner to maintain trust.',
    status: 'active',
    priority: 10,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
];

function rowToBlock(r: any): MemoryBlock {
  return {
    id: r.id,
    type: r.type as MemoryType,
    title: r.title || 'Untitled',
    content: r.content,
    status: (r.status as MemoryBlock['status']) || 'active',
    priority: r.priority ?? 0,
    createdAt: r.created_at || r.updated_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
    tags: r.tags || [],
  };
}

function blockToRow(team_id: string, b: Partial<MemoryBlock>) {
  return {
    id: b.id, // undefined => server generates
    team_id,
    type: b.type || 'strategic',
    title: b.title || 'Untitled',
    content: typeof b.content === 'string' ? b.content : JSON.stringify(b.content ?? ''),
    status: b.status || 'active',
    priority: b.priority ?? 0,
    tags: b.tags || [],
    updated_at: new Date().toISOString(),
  };
}

function writeLocalCache(blocks: MemoryBlock[]) {
  try {
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(blocks));
  } catch {}
}

function readLocalCache(): MemoryBlock[] {
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!raw) return DEFAULT_MEMORY;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MEMORY;
  } catch {
    return DEFAULT_MEMORY;
  }
}

export const MemoryService = {
  /**
   * Sync pull: fetch the team's memory from Supabase and refresh the local cache.
   * Safe to call repeatedly. Both owners and members may call this; RLS
   * decides what each sees.
   */
  async syncFromTeam(teamId: string | null | undefined): Promise<MemoryBlock[]> {
    if (!teamId) {
      // No team yet — keep local cache (includes AWSP default).
      return this.getMemory();
    }
    const { data, error } = await supabase
      .from('team_memory')
      .select('*')
      .eq('team_id', teamId)
      .order('priority', { ascending: false });

    if (error) {
      console.warn('[MemoryService] syncFromTeam failed:', error.message);
      return this.getMemory();
    }
    const remote = (data || []).map(rowToBlock);
    // Always preserve the AWSP default + merge remote on top
    const awsp = DEFAULT_MEMORY.find(b => b.id === 'default_constraint')!;
    const merged = [awsp, ...remote.filter(b => b.id !== awsp.id)];
    writeLocalCache(merged);
    return merged;
  },

  /** Synchronous read for AI prompt assembly. Hits the local cache only. */
  getMemory(): MemoryBlock[] {
    return readLocalCache();
  },

  /**
   * Owner-only save. Writes to Supabase team_memory and refreshes local cache.
   * If there is no team yet, falls back to pure-local memory (good for onboarding).
   */
  async saveMemory(teamId: string | null, block: Partial<MemoryBlock>): Promise<MemoryBlock> {
    const now = new Date().toISOString();

    if (!teamId) {
      // Local-only path (pre-team or offline)
      const memory = this.getMemory();
      const existingIndex = memory.findIndex(m => m.id === block.id);
      const newBlock: MemoryBlock = {
        id: block.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: block.type || 'strategic',
        title: block.title || 'Untitled Directive',
        content: block.content ?? '',
        status: block.status || 'active',
        priority: block.priority ?? 1,
        createdAt: block.createdAt || now,
        updatedAt: now,
        tags: block.tags || [],
      };
      if (existingIndex >= 0) memory[existingIndex] = newBlock;
      else memory.unshift(newBlock);
      writeLocalCache(memory);
      return newBlock;
    }

    const row = blockToRow(teamId, block);
    const { data, error } = await supabase
      .from('team_memory')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    await this.syncFromTeam(teamId);
    return rowToBlock(data);
  },

  /** Owner-only delete. If no team, mutates local cache. */
  async deleteMemory(teamId: string | null, id: string): Promise<void> {
    if (!teamId) {
      const memory = this.getMemory().filter(m => m.id !== id);
      writeLocalCache(memory);
      return;
    }
    const { error } = await supabase.from('team_memory').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await this.syncFromTeam(teamId);
  },

  /** Simple conflict detection. Runs on the local cache. */
  detectConflicts(newContent: string, type: MemoryType): string[] {
    const memory = this.getMemory().filter(m => m.type === type && m.status === 'active');
    const conflicts: string[] = [];
    if (
      newContent.toLowerCase().includes('fast') &&
      memory.some(m => JSON.stringify(m.content).toLowerCase().includes('premium'))
    ) {
      conflicts.push("Potential conflict: high-speed expansion may compromise 'Premium' positioning.");
    }
    return conflicts;
  },

  /** Formatted context injected into the AI system prompt. Synchronous. */
  getFormattedContext(): string {
    const memory = this.getMemory().filter(m => m.status === 'active');
    if (memory.length === 0) return 'No active strategic memory found.';

    let context = '### ACTIVE STRATEGIC MEMORY\n\n';
    const categories: Record<MemoryType, MemoryBlock[]> = {
      strategic: [],
      operational: [],
      instructional: [],
      constraint: [],
      interpretation: [],
    };
    memory.forEach(m => categories[m.type].push(m));

    (Object.entries(categories) as [MemoryType, MemoryBlock[]][]).forEach(([type, blocks]) => {
      if (blocks.length > 0) {
        context += `[${type.toUpperCase()}]\n`;
        blocks.forEach(b => {
          context += `- ${b.title}: ${typeof b.content === 'string' ? b.content : JSON.stringify(b.content)}\n`;
        });
        context += '\n';
      }
    });
    return context;
  },

  getDefaultMemory(): MemoryBlock[] {
    return DEFAULT_MEMORY;
  },

  /**
   * Best-effort auto-refresh when the AI chat pipeline starts.
   * Uses the cached team context — non-blocking.
   */
  async autoRefresh(): Promise<void> {
    const ctx = TeamService.getCachedContext();
    if (ctx?.team?.id) {
      await this.syncFromTeam(ctx.team.id);
    }
  },
};
