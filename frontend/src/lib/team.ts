export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending';
  avatar?: string;
}

import { ActivityService } from './activity';

const TEAM_STORAGE_KEY = 'britsee_team_members';

const DEFAULT_MEMBERS: TeamMember[] = [
  {
    id: 'owner_1',
    name: 'Sir (Admin)',
    email: 'admin@britsee.ai',
    role: 'owner',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=faces'
  },
  {
    id: 'member_2',
    name: 'Ali (Team)',
    email: 'ali@britsync.com',
    role: 'member',
    status: 'active',
  }
];

export const TeamService = {
  getMembers: (): TeamMember[] => {
    const stored = localStorage.getItem(TEAM_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(DEFAULT_MEMBERS));
      return DEFAULT_MEMBERS;
    }
    return JSON.parse(stored);
  },

  inviteMember: async (email: string, role: string) => {
    const members = TeamService.getMembers();
    const newMember: TeamMember = {
      id: `mem_${Date.now()}`,
      name: email.split('@')[0],
      email,
      role: role as any,
      status: 'pending'
    };
    members.push(newMember);
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(members));
    
    // Log invitation
    ActivityService.logActivity('Admin', `Invited ${email}`, `Added new team member as ${role}`, 'browser');
    
    return new Promise(resolve => setTimeout(resolve, 800));
  },

  getOwnerPlan: (): 'free' | 'pro' => {
    const profileData = localStorage.getItem('britsync_profile');
    if (profileData) {
      const profile = JSON.parse(profileData);
      return profile.plan || 'pro';
    }
    return 'pro';
  },

  getActivities() {
    return ActivityService.getActivities();
  },

  getCurrentMember: (): TeamMember => {
    // In this unified workspace, we use a mock current user.
    // 'Sir (Admin)' for owner, 'Ali (Team)' for member.
    const members = TeamService.getMembers();
    const mockId = localStorage.getItem('britsync_mock_id') || 'owner_1';
    return members.find(m => m.id === mockId) || members[0];
  },

  isOwner: (): boolean => {
    return TeamService.getCurrentMember().role === 'owner';
  },

  setMockUser: (id: string): void => {
    localStorage.setItem('britsync_mock_id', id);
  }
};
