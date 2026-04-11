/**
 * Activity Service — Track team actions in Britsee Assistant
 * Logs "What Ali is doing" and other team member actions.
 */

export interface TeamActivity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  type: 'search' | 'email' | 'finance' | 'report' | 'browser';
}

const STORAGE_KEY = 'britsee_team_activity';

export const ActivityService = {
  logActivity(userName: string, action: string, details: string, type: TeamActivity['type']): void {
    const activities = this.getActivities();
    const newActivity: TeamActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: 'current_user', // In a real app, this would be the actual auth ID
      userName,
      action,
      details,
      timestamp: new Date().toISOString(),
      type
    };

    activities.unshift(newActivity);
    // Keep only last 50 activities to save space
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities.slice(0, 50)));
  },

  getActivities(): TeamActivity[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  clearActivities(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
  getRecentActivityByMember(name: string): TeamActivity[] {
    const activities = this.getActivities();
    const query = name.toLowerCase();
    return activities.filter(a => 
      a.userName.toLowerCase().includes(query) || 
      a.action.toLowerCase().includes(query)
    ).slice(0, 5);
  },
  getActiveMembers(): { name: string; lastAction: string; type: string }[] {
    const activities = this.getActivities();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    // Get unique members who were active in the last 10 minutes
    const seen = new Set();
    const active: any[] = [];
    
    for (const act of activities) {
      if (act.timestamp > tenMinutesAgo && !seen.has(act.userName)) {
        seen.add(act.userName);
        active.push({
          name: act.userName,
          lastAction: act.action,
          type: act.type
        });
      }
    }
    return active;
  }
};
