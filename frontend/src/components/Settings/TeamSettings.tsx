import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Mail, Clock, CheckCircle, Activity, UserCheck, Lock, Copy, Zap, Crown, Search, Send, FileText, BarChart3, Globe, MoreVertical } from 'lucide-react';
import { TeamService } from '../../lib/team';
import { ActivityService } from '../../lib/activity';
import type { TeamActivity } from '../../lib/activity';
import { SettingsService } from '../../lib/settings';

const TeamSettings: React.FC = () => {
  const [members, setMembers] = useState<any[]>(TeamService.getMembers() as any);
  const [activities, setActivities] = useState<TeamActivity[]>(ActivityService.getActivities());
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [invited, setInvited] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'activity' | 'join'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('invite') === 'true' ? 'members' : 'members';
  });
  
  // State
  const [joinName, setJoinName] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Boss Directives States
  const [directives, setDirectives] = useState(SettingsService.getBossDirectives());
  const [isUpdatingDirectives, setIsUpdatingDirectives] = useState(false);
  const [directiveSuccess, setDirectiveSuccess] = useState(false);
  
  // Role Persistence
  const [currentUser, setCurrentUser] = useState<any>(TeamService.getCurrentMember());

  const plan = TeamService.getOwnerPlan();

  useEffect(() => {
    const interval = setInterval(() => {
      setActivities(ActivityService.getActivities());
      setMembers(TeamService.getMembers() as any);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsInviting(true);
    await TeamService.inviteMember(inviteEmail, inviteRole);
    
    setMembers(TeamService.getMembers());
    setInviteEmail('');
    setIsInviting(false);
    setInvited(true);
    setTimeout(() => setInvited(false), 3000);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    setIsJoining(true);

    // Mock join success for now as we transition away from PINs
    await new Promise(r => setTimeout(r, 1000));
    
    setJoinSuccess(true);
    setMembers(TeamService.getMembers());
    setTimeout(() => {
      setJoinSuccess(false);
      setActiveTab('members');
    }, 2000);
    
    setIsJoining(false);
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}?invite=true`;
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleUpdateDirectives = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingDirectives(true);
    SettingsService.setBossDirectives(directives);
    
    // Log directive change
    ActivityService.logActivity(currentUser.name, 'Updated Boss Directives', 'Changed the behavioral rules for team proxy interactions.', 'browser');
    
    setTimeout(() => {
      setIsUpdatingDirectives(false);
      setDirectiveSuccess(true);
      setTimeout(() => setDirectiveSuccess(false), 3000);
    }, 800);
  };

  const switchUser = (id: string) => {
    TeamService.setMockUser(id);
    const user = TeamService.getCurrentMember();
    setCurrentUser(user);
    window.location.reload(); // Reload to ensure services refetch mock state
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'admin': return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'search': return <Search size={14} className="text-blue-400" />;
      case 'email': return <Send size={14} className="text-emerald-400" />;
      case 'report': return <FileText size={14} className="text-purple-400" />;
      case 'finance': return <BarChart3 size={14} className="text-amber-400" />;
      default: return <Globe size={14} className="text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      
      {/* Plan Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-3xl border border-indigo-500/20 p-8 shadow-2xl shadow-indigo-500/5">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-md shadow-lg shadow-indigo-500/20 flex items-center gap-1">
                <Crown size={10} /> {plan.toUpperCase()} TEAM
              </span>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Britsee Unified Workspace</h2>
            <p className="text-slate-400 text-sm max-w-lg leading-relaxed">
              Your team members automatically inherit your <strong>Pro Plan</strong> benefits. Collaborate on leads, reports, and AI research in real-time.
            </p>
          </div>
          
          <div className="flex flex-col gap-3 min-w-[240px]">
            {/* User Switcher (FOR DEMO) */}
            <div className="flex p-1 bg-black/40 rounded-xl border border-white/5 mb-1">
              <button 
                onClick={() => switchUser('owner_1')}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${currentUser.id === 'owner_1' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white'}`}
              >
                ADMIN VIEW
              </button>
              <button 
                onClick={() => switchUser('member_2')}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${currentUser.id === 'member_2' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
              >
                TEAM VIEW (ALI)
              </button>
            </div>

            <button 
              onClick={copyInviteLink}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold text-white transition-all backdrop-blur-md"
            >
              {copySuccess ? <CheckCircle size={16} className="text-emerald-400" /> : <Copy size={16} />}
              {copySuccess ? 'Link Copied!' : 'Copy Invitation Link'}
            </button>
              <div className="flex-1 p-3 bg-black/40 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Seats</p>
                <p className="text-lg font-bold text-white">{members.length}<span className="text-slate-600 text-xs">/10</span></p>
              </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full" />
      </section>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/5 pb-1">
        <button 
          onClick={() => setActiveTab('members')}
          className={`pb-3 px-2 text-sm font-bold transition-all relative ${activeTab === 'members' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <div className="flex items-center gap-2">
            <Users size={16} /> <span>Team Members</span>
          </div>
          {activeTab === 'members' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('activity')}
          className={`pb-3 px-2 text-sm font-bold transition-all relative ${activeTab === 'activity' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <div className="flex items-center gap-2">
            <Activity size={16} /> <span>Team Activity</span>
          </div>
          {activeTab === 'activity' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
        </button>

        {currentUser.role === 'owner' && (
          <button 
            onClick={() => setActiveTab('directives' as any)}
            className={`pb-3 px-2 text-sm font-bold transition-all relative ${activeTab === ('directives' as any) ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <div className="flex items-center gap-2">
              <Zap size={16} /> <span>Executive Directives</span>
            </div>
            {activeTab === ('directives' as any) && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />}
          </button>
        )}
      </div>

      {activeTab === 'members' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
          {/* Invite Section */}
          <section className="bg-slate-900/40 rounded-2xl border border-white/5 p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                <UserPlus size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-white">Direct Invitation</h3>
                <p className="text-xs text-slate-500">Send an email invite to a specific user.</p>
              </div>
            </div>

            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-slate-200 focus:border-indigo-500/50 outline-none transition-all text-sm"
                  required
                />
              </div>
              <select 
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-slate-300 outline-none focus:border-indigo-500/50 text-sm"
              >
                <option value="member">Role: Member</option>
                <option value="admin">Role: Admin</option>
              </select>
              <button 
                type="submit"
                disabled={isInviting}
                className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 min-w-[140px]"
              >
                {invited ? <CheckCircle size={18} /> : isInviting ? <Clock size={18} className="animate-spin" /> : <UserPlus size={18} />}
                {invited ? 'Invited' : isInviting ? 'Sending...' : 'Send Invite'}
              </button>
            </form>
          </section>

          {/* Members List */}
          <section className="bg-slate-900/40 rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-emerald-400" />
                <h3 className="font-semibold text-white">Active Team Members</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md border border-white/5">
                {members.length} Total
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {members.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/5" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 font-bold border border-white/5">
                        {member.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-200 text-sm">{member.name}</p>
                        {member.status === 'pending' && (
                          <span className="text-[9px] font-bold text-amber-500 uppercase tracking-tighter bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Pending</span>
                        )}
                        {plan === 'pro' && (
                          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">PRO ACTIVE</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${getRoleBadge(member.role)}`}>
                      {member.role}
                    </span>
                    <button className="p-2 text-slate-600 hover:text-white transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 bg-slate-900/40 rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity size={20} className="text-indigo-400" />
              <h3 className="font-semibold text-white">Live Activity Ledger</h3>
            </div>
            <button 
              onClick={() => {
                ActivityService.clearActivities();
                setActivities([]);
              }}
              className="text-[10px] font-bold text-slate-500 hover:text-pink-400 uppercase tracking-widest transition-colors"
            >
              Clear Log
            </button>
          </div>
          
          <div className="p-0 max-h-[600px] overflow-y-auto">
            {activities.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead className="bg-white/[0.02] sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">User</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {activities.map((act) => (
                    <tr key={act.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-white/5 group-hover:border-indigo-500/30 transition-colors">
                            {act.userName.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-200">{act.userName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            {getActivityIcon(act.type)}
                            <span className="text-sm text-white font-medium">{act.action}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate max-w-[300px] font-mono">{act.details}</p>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock size={12} />
                          <span className="text-[10px] font-medium">
                            {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-20 text-center space-y-3">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-600">
                  <Activity size={32} />
                </div>
                <div>
                  <p className="text-white font-semibold">No recent activity</p>
                  <p className="text-xs text-slate-500">Actions taken by your team will appear here in real-time.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === ('directives' as any) && currentUser.role === 'owner' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          <section className="bg-slate-900/40 rounded-2xl border border-white/5 p-8 max-w-3xl mx-auto space-y-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-amber-400/20 rounded-2xl text-amber-400 border border-amber-400/20">
                <Shield size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Boss Proxy Content & Tone</h3>
                <p className="text-sm text-slate-400">
                  Britsee will use these directives to represent you when your team member asks for your advice or attempts to contact you.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateDirectives} className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block ml-1">Behavioral Instructions</label>
                <textarea 
                  value={directives}
                  onChange={(e) => setDirectives(e.target.value)}
                  placeholder="e.g. Always emphasize quality over speed. Remind the team to check the CRM before emailing. If they ask about salary, tell them to wait for the monthly review."
                  className="w-full h-48 bg-black/40 border border-white/5 rounded-2xl p-5 text-slate-200 focus:border-amber-400/50 outline-none transition-all text-sm leading-relaxed"
                  required
                />
                <p className="text-[10px] text-slate-500 italic ml-1">
                  💡 Tip: Be as specific as possible. Britsee will analyze this text to mimic your decision-making patterns.
                </p>
              </div>

              {directiveSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm font-bold text-center animate-bounce">
                  ✅ Directives Updated Successfully!
                </div>
              )}

              <button 
                type="submit"
                disabled={isUpdatingDirectives || directiveSuccess}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                {isUpdatingDirectives ? <Clock size={20} className="animate-spin" /> : <Zap size={20} />}
                {isUpdatingDirectives ? 'Syncing with Britsee...' : 'Update Executive Proxy Rules'}
              </button>
            </form>

            <div className="p-5 bg-white/5 rounded-2xl border border-white/5 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">AI Training Preview</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed italic">
                "When a team member contacts me, Britsee will say: 'Based on the Head of Company's latest directives, [Your Instructions Here]...'"
              </p>
            </div>
          </section>
        </div>
      )}

          {activeTab === 'join' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          <section className="bg-slate-900/60 rounded-3xl border border-white/10 p-8 max-w-2xl mx-auto text-center space-y-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
            
            <div className="space-y-2">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 mb-4 border border-indigo-500/20 shadow-inner">
                <UserCheck size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">Join a Britsee Team</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Request access to your Admin's team to link your workspace and instantly unlock the **Pro Plan**.
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4 text-left max-w-sm mx-auto">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Your Full Name</label>
                  <input 
                    type="text" 
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder="e.g. Ali Hamas"
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500/50 outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" 
                    value={joinEmail}
                    onChange={(e) => setJoinEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500/50 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {joinError && (
                <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-400 text-xs font-medium text-center animate-shake">
                  ❌ {joinError}
                </div>
              )}

              {joinSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold text-center">
                  ✅ Access Requested!
                </div>
              )}

              <button 
                type="submit"
                disabled={isJoining || joinSuccess}
                className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                {isJoining ? <Clock size={20} className="animate-spin" /> : <Lock size={20} />}
                {isJoining ? 'Requesting...' : 'Request Access & Unlock Pro'}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* RBAC Info */}
      <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-5 flex gap-4 items-start">
        <Shield size={20} className="text-indigo-400 flex-shrink-0 mt-1" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-white">Enterprise Security & Compliance</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your Pro Team workspace is encrypted end-to-end. Activity logs are preserved for 30 days. Inherited Pro status allows all members to use advanced AI models, web scraping, and custom scheduling tools integrated into Britsee.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeamSettings;
