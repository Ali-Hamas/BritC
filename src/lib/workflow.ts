export interface AutomationTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  tags?: string[];
  assignee?: string;
  createdAt: string;
  linkedTo?: string; // e.g. a lead ID or document ID
}

export interface WorkflowRule {
  id: string;
  name: string;
  trigger: 'lead_found' | 'campaign_sent' | 'campaign_reply' | 'document_created' | 'manual';
  action: 'create_task' | 'send_email' | 'generate_proposal' | 'notify_owner' | 'update_status';
  actionConfig?: Record<string, any>;
  enabled: boolean;
  runCount: number;
  lastRun?: string;
}

const DEFAULT_TASKS: AutomationTask[] = [
  { id: 't1', title: 'Review new leads from scraper', description: 'Filter and qualify the latest batch from LeadHunter', status: 'todo', priority: 'high', createdAt: new Date().toISOString(), tags: ['leads'] },
  { id: 't2', title: 'Draft Q1 partnership proposal', description: 'Prepare a 3-month partnership proposal for Horizon Digital', status: 'in-progress', priority: 'medium', createdAt: new Date().toISOString(), tags: ['proposals'] },
  { id: 't3', title: 'Send follow-up emails', description: 'Follow up on the last email campaign batch', status: 'todo', priority: 'medium', createdAt: new Date().toISOString(), tags: ['outreach'] },
  { id: 't4', title: 'Reconcile monthly invoices', description: 'Cross-check sent invoices vs. payments received', status: 'done', priority: 'low', createdAt: new Date().toISOString(), tags: ['finance'] },
  { id: 't5', title: 'Update business profile goals', description: 'Reset growth targets for the new quarter', status: 'done', priority: 'low', createdAt: new Date().toISOString(), tags: ['planning'] },
];

const DEFAULT_RULES: WorkflowRule[] = [
  { id: 'r1', name: 'Lead → Task', trigger: 'lead_found', action: 'create_task', enabled: true, runCount: 12, lastRun: new Date(Date.now() - 3600000).toISOString() },
  { id: 'r2', name: 'Reply → Proposal', trigger: 'campaign_reply', action: 'generate_proposal', enabled: true, runCount: 3, lastRun: new Date(Date.now() - 86400000).toISOString() },
  { id: 'r3', name: 'New Doc → Notify', trigger: 'document_created', action: 'notify_owner', enabled: false, runCount: 7, lastRun: new Date(Date.now() - 172800000).toISOString() },
  { id: 'r4', name: 'Campaign → Status Update', trigger: 'campaign_sent', action: 'update_status', enabled: true, runCount: 25, lastRun: new Date(Date.now() - 7200000).toISOString() },
];

export const WorkflowService = {
  getTasks(): AutomationTask[] {
    const data = localStorage.getItem('britsync_tasks');
    return data ? JSON.parse(data) : DEFAULT_TASKS;
  },

  saveTask(task: AutomationTask): void {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    if (index > -1) {
      tasks[index] = task;
    } else {
      tasks.unshift(task);
    }
    localStorage.setItem('britsync_tasks', JSON.stringify(tasks));
  },

  addTask(taskData: Omit<AutomationTask, 'id' | 'createdAt'>): AutomationTask {
    const newTask: AutomationTask = {
      ...taskData,
      id: `task_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const tasks = this.getTasks();
    tasks.unshift(newTask);
    localStorage.setItem('britsync_tasks', JSON.stringify(tasks));
    return newTask;
  },

  moveTask(taskId: string, newStatus: AutomationTask['status']): void {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.status = newStatus;
      localStorage.setItem('britsync_tasks', JSON.stringify(tasks));
    }
  },

  deleteTask(taskId: string): void {
    const tasks = this.getTasks().filter(t => t.id !== taskId);
    localStorage.setItem('britsync_tasks', JSON.stringify(tasks));
  },

  getRules(): WorkflowRule[] {
    const data = localStorage.getItem('britsync_rules');
    return data ? JSON.parse(data) : DEFAULT_RULES;
  },

  toggleRule(ruleId: string): WorkflowRule | null {
    const rules = this.getRules();
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return null;
    rule.enabled = !rule.enabled;
    localStorage.setItem('britsync_rules', JSON.stringify(rules));
    return rule;
  },

  // Simulate firing a rule trigger
  fireEvent(trigger: WorkflowRule['trigger'], context?: any): string[] {
    const rules = this.getRules().filter(r => r.enabled && r.trigger === trigger);
    const results: string[] = [];
    
    for (const rule of rules) {
      rule.runCount++;
      rule.lastRun = new Date().toISOString();
      
      if (rule.action === 'create_task') {
        this.addTask({
          title: `Auto: ${context?.title || 'New automated task'}`,
          description: `Triggered by: ${trigger}`,
          status: 'todo',
          priority: 'medium',
          tags: ['automated'],
        });
        results.push(`✅ Task created via "${rule.name}" rule`);
      } else if (rule.action === 'notify_owner') {
        results.push(`🔔 Notification sent via "${rule.name}" rule`);
      } else {
        results.push(`⚡ Action "${rule.action}" triggered via "${rule.name}" rule`);
      }
    }
    
    localStorage.setItem('britsync_rules', JSON.stringify(this.getRules().map(r => {
      const updated = rules.find(u => u.id === r.id);
      return updated || r;
    })));
    
    return results;
  },

  getStats() {
    const tasks = this.getTasks();
    const rules = this.getRules();
    return {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      activeRules: rules.filter(r => r.enabled).length,
      totalRuleRuns: rules.reduce((sum, r) => sum + r.runCount, 0),
    };
  }
};
