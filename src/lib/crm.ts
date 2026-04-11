export interface CRMStats {
  connected: boolean;
  platform: 'hubspot' | 'salesforce' | null;
  lastSync: string | null;
  syncedLeads: number;
  verified: boolean;
}

export const CRMService = {
  getStats: (): CRMStats => {
    const saved = localStorage.getItem('britsee_crm_stats');
    if (saved) return JSON.parse(saved);
    return {
      connected: false,
      platform: null,
      lastSync: null,
      syncedLeads: 0,
      verified: false
    };
  },

  connect: async (platform: 'hubspot' | 'salesforce') => {
    // Simulated API validation delay
    const stats: CRMStats = {
      connected: true,
      platform,
      lastSync: new Date().toISOString(),
      syncedLeads: 124,
      verified: true
    };
    localStorage.setItem('britsee_crm_stats', JSON.stringify(stats));
    return new Promise(resolve => setTimeout(resolve, 1500));
  },

  disconnect: () => {
    localStorage.removeItem('britsee_crm_stats');
  },

  syncLead: async (lead: any) => {
    console.log(`Syncing lead to verified Britsee Bridge (${CRMService.getStats().platform}):`, lead);
    const stats = CRMService.getStats();
    if (stats.connected && stats.verified) {
      stats.syncedLeads += 1;
      stats.lastSync = new Date().toISOString();
      localStorage.setItem('britsee_crm_stats', JSON.stringify(stats));
    }
    return new Promise(resolve => setTimeout(resolve, 800));
  }
};
