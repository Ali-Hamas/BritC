import { useState, useEffect, useRef } from 'react';
import {
  Users, Key, Trash2, Copy, CheckCircle,
  Loader2, Plus, Brain, Save, Zap, AlertTriangle, TrendingUp, BarChart3, ChevronDown, Paperclip
} from 'lucide-react';
import { motion } from 'framer-motion';
import { TeamService, type Team, type TeamMember } from '../../lib/team';
import { FileHandlingService } from '../../lib/fileHandling';
import { MemoryService, type MemoryBlock, type MemoryType } from '../../lib/memory';
import { GrowthService, type GrowthInsight } from '../../lib/growth';
import type { BusinessProfile } from '../../lib/profiles';

export const TeamPanel = ({ profile, userId }: { profile: BusinessProfile | null; userId?: string | null }) => {
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<{ team: Team | null; role: 'owner' | 'member' | null; displayName: string | null } | null>(null);
  const [allTeams, setAllTeams] = useState<Array<{ team: Team; role: 'owner' | 'member'; displayName: string | null }>>([]);
  const [showTeamSwitcher, setShowTeamSwitcher] = useState(false);
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [memoryBlocks, setMemoryBlocks] = useState<MemoryBlock[]>([]);
  const [insights, setInsights] = useState<GrowthInsight[]>([]);
  const [pulseText, setPulseText] = useState('');
  const [isModerator, setIsModerator] = useState(false);

  const [editingBlockId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [isAttachingFile, setIsAttachingFile] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const memoryFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const uid = userId || TeamService._uid();
      if (!uid) {
        setLoading(false);
        return;
      }
      setIsModerator(TeamService.isGlobalModerator());

      const teams = await TeamService.getMyTeams(uid);
      setAllTeams(teams);

      const currentCtx = await TeamService.getMyTeam(uid);
      setCtx(currentCtx);

      if (currentCtx.team) {
        if (currentCtx.role === 'owner') {
          const [mems, pulse, bns] = await Promise.all([
            TeamService.getTeamMembers(currentCtx.team.id),
            GrowthService.getBusinessPulse(profile, uid),
            GrowthService.detectBottlenecks(profile, uid)
          ]);
          setMembers(mems);
          setPulseText(pulse);
          setInsights(bns);
        }
        const blocks = await MemoryService.syncFromTeam(currentCtx.team.id);
        setMemoryBlocks(blocks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchTeam = (teamId: string) => {
    TeamService.setActiveTeamId(teamId);
    setShowTeamSwitcher(false);
    loadData();
  };

  const handleCreateTeam = async (customName?: string) => {
    setActionLoading(true);
    try {
      const uid = userId || TeamService._uid();
      if (!uid) { alert('You must be signed in.'); return; }
      const title = (customName && customName.trim()) || `${profile?.businessName || 'My'} Team ${allTeams.length + 1}`;
      await TeamService.createTeam(uid, title);
      setShowNewTeamModal(false);
      setNewTeamName('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create team');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRotatePin = async () => {
    if (!ctx?.team || !window.confirm('Are you sure? The old PIN will immediately stop working.')) return;
    setActionLoading(true);
    try {
      const newPin = await TeamService.rotatePin(ctx.team.id);
      setCtx({ ...ctx, team: { ...ctx.team, pin: newPin } });
      alert(`PIN rotated successfully. New PIN: ${newPin}`);
    } catch (err: any) {
      alert(err.message || 'Failed to rotate PIN');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!ctx?.team || !window.confirm('Remove this member?')) return;
    try {
      await TeamService.removeMember(ctx.team.id, userId);
      setMembers(members.filter(m => m.user_id !== userId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLeaveTeam = async () => {
    if (!ctx?.team || !window.confirm('Leave this team? You will lose access to the team strategy.')) return;
    setActionLoading(true);
    try {
      const uid = userId || TeamService._uid();
      if (!uid) { alert('You must be signed in.'); return; }
      await TeamService.leaveTeam(uid, ctx.team.id);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Memory CRUD ───

  const handleEditMemory = (block: MemoryBlock) => {
    setEditingId(block.id);
    setEditContent(typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2));
  };

  const handleSaveMemory = async () => {
    if (!editingBlockId || !ctx?.team) return;
    setIsSavingMemory(true);
    try {
      await MemoryService.saveMemory(ctx.team.id, { id: editingBlockId, content: editContent });
      const blocks = await MemoryService.syncFromTeam(ctx.team.id);
      setMemoryBlocks(blocks);
      setEditingId(null);
    } catch (err: any) {
      alert('Failed to save memory: ' + err.message);
    } finally {
      setIsSavingMemory(false);
    }
  };

  const handleCreateMemory = async (type: MemoryType) => {
    if (!ctx?.team) return;
    const defaultContent = `New ${type} directive...`;
    await MemoryService.saveMemory(ctx.team.id, { type, content: defaultContent, title: `New ${type} Block` });
    const blocks = await MemoryService.syncFromTeam(ctx.team.id);
    setMemoryBlocks(blocks);
    handleEditMemory(blocks[0]);
  };

  const handleDeleteMemory = async (id: string) => {
    if (!ctx?.team || !window.confirm('Delete this directive? It will affect team alignment.')) return;
    await MemoryService.deleteMemory(ctx.team.id, id);
    const blocks = await MemoryService.syncFromTeam(ctx.team.id);
    setMemoryBlocks(blocks);
  };

  const handleAttachFileToDirective = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsAttachingFile(true);
    try {
      const chunks: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const processed = await FileHandlingService.processFile(f);
        if (processed.content) {
          chunks.push(`\n\n--- Attached file: ${f.name} ---\n${processed.content}`);
        } else {
          chunks.push(`\n\n--- Attached file: ${f.name} (${FileHandlingService.formatSize(f.size)}) — binary, content not extracted ---`);
        }
      }
      setEditContent(prev => (prev || '') + chunks.join(''));
    } catch (err: any) {
      alert('Failed to read file: ' + (err.message || err));
    } finally {
      setIsAttachingFile(false);
      if (memoryFileInputRef.current) memoryFileInputRef.current.value = '';
    }
  };

  const renderNewTeamModal = () => {
    if (!showNewTeamModal) return null;
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={() => { if (!actionLoading) { setShowNewTeamModal(false); setNewTeamName(''); } }}
      >
        <div
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md bg-[#0b1020] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-5 md:p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <Users size={18} className="text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base md:text-lg font-bold text-white leading-tight">Create new team</h3>
                <p className="text-xs md:text-sm text-white/60 mt-1.5 leading-relaxed">
                  Each team gets its own PIN, members, and Strategic Memory. You can switch between teams anytime.
                </p>
              </div>
            </div>
            <input
              type="text"
              autoFocus
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              placeholder="e.g. Marketing Squad"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none"
              onKeyDown={e => { if (e.key === 'Enter' && !actionLoading) handleCreateTeam(newTeamName); }}
            />
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => { setShowNewTeamModal(false); setNewTeamName(''); }}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateTeam(newTeamName)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create team
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
  }

  // ─── No Team View ───
  if (!ctx?.team) {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-10">
        <div className="bg-[#151520] border border-white/5 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto">
            <Users size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">Create Your Team</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            Create a team to generate a secure PIN. You can share this PIN with your colleagues to link them to your workspace. Their chats will remain completely private, but the AI will be guided by your strategic memory.
          </p>
          <button
            onClick={() => setShowNewTeamModal(true)}
            disabled={actionLoading}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center mx-auto gap-2"
          >
            {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            Initialize Team Workspace
          </button>
        </div>
        {renderNewTeamModal()}
      </div>
    );
  }

  // ─── Member View ───
  if (ctx.role === 'member') {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-10">
        <div className="bg-[#151520] border border-white/5 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">Linked to Team</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            You are successfully linked to <strong>{ctx.team.title || 'the owner'}'s</strong> workspace. 
            <br/><br/>
            Your chats are completely private by design—the owner cannot read them. However, your AI responses are strategically aligned with the owner's team memory.
          </p>
          <button
            onClick={handleLeaveTeam}
            disabled={actionLoading}
            className="px-6 py-3 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 text-slate-300 hover:text-rose-400 font-bold rounded-xl transition-all flex items-center justify-center mx-auto gap-2 text-sm mt-8"
          >
            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Disconnect from Team
          </button>

          <div className="pt-6 border-t border-white/5">
            <p className="text-xs text-slate-500 mb-3">Want your own workspace too?</p>
            <button
              onClick={() => setShowNewTeamModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-xl text-sm font-semibold text-indigo-300 transition-colors"
            >
              <Plus size={14} />
              Create your own team
            </button>
          </div>
        </div>
        {renderNewTeamModal()}
      </div>
    );
  }

  // ─── Owner View ───
  const categories: MemoryType[] = ['strategic', 'operational', 'instructional', 'constraint', 'interpretation'];
  const ownedTeams = allTeams.filter(t => t.role === 'owner');

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-6 py-6 sm:py-8 pb-32 scrollbar-thin">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">

        {/* Team Switcher */}
        {(ownedTeams.length > 1 || allTeams.length > 1) && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <button
                onClick={() => setShowTeamSwitcher(v => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold text-white transition-colors"
              >
                <Users size={14} className="text-indigo-400" />
                <span className="truncate max-w-[200px]">{ctx.team.title || 'My Team'}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showTeamSwitcher ? 'rotate-180' : ''}`} />
              </button>
              {showTeamSwitcher && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#0b1020] border border-white/10 rounded-xl shadow-2xl z-30 overflow-hidden">
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-white/5">Your teams</div>
                  <div className="max-h-72 overflow-y-auto">
                    {allTeams.map(t => (
                      <button
                        key={t.team.id}
                        onClick={() => handleSwitchTeam(t.team.id)}
                        className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 text-xs transition-colors ${
                          t.team.id === ctx.team!.id ? 'bg-indigo-500/10 text-white' : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{t.team.title || 'My Team'}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{t.role}</p>
                        </div>
                        {t.team.id === ctx.team!.id && <CheckCircle size={14} className="text-indigo-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowNewTeamModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-xl text-sm font-semibold text-indigo-300 transition-colors"
            >
              <Plus size={14} />
              New Team
            </button>
          </div>
        )}
        {ownedTeams.length === 1 && allTeams.length === 1 && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowNewTeamModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-xl text-sm font-semibold text-indigo-300 transition-colors"
            >
              <Plus size={14} />
              New Team
            </button>
          </div>
        )}

        {/* Header & PIN */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:items-start justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-2 sm:gap-3">
                <Zap className="text-indigo-400 shrink-0" size={24} /> Growth Command Center
              </span>
              {isModerator && (
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-md">
                  Global Moderator
                </span>
              )}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              {isModerator
                ? 'Your memory directives guide every team member\'s private chat. Members cannot see each other — they only feel your strategy through the AI.'
                : 'Control your team\'s access and the AI\'s strategic alignment. Data-driven growth insights are powered by live finance and operations pulses.'}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full md:w-auto md:min-w-[240px] shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Key size={12} className="text-indigo-400" /> Team Join PIN
              </span>
              <button 
                onClick={handleRotatePin}
                disabled={actionLoading}
                className="text-[10px] bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 px-2 py-1 rounded transition-colors"
              >
                Rotate PIN
              </button>
            </div>
            <div className="flex items-center justify-between relative z-10 gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-[0.15em] sm:tracking-[0.2em] font-mono truncate">{ctx.team.pin}</span>
              <button 
                onClick={() => { navigator.clipboard.writeText(ctx.team!.pin); setCopiedPin(true); setTimeout(() => setCopiedPin(false), 2000); }}
                className="p-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg transition-colors"
              >
                {copiedPin ? <CheckCircle size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Live Business Pulse & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
           <div className="bg-[#151520] border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all">
                <TrendingUp size={80} />
              </div>
              <div className="flex items-center gap-3 mb-6">
                 <BarChart3 className="text-emerald-400" size={20} />
                 <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Live Business Pulse</h2>
              </div>
              <div className="space-y-4">
                 <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                    <pre className="text-xs text-emerald-400/90 font-mono whitespace-pre-wrap leading-relaxed">
                      {pulseText || 'Calibrating neural pulse...'}
                    </pre>
                 </div>
                 <p className="text-[10px] text-slate-500 italic">
                   This data is automatically injected into all team AI interactions to ground responses in financial reality.
                 </p>
              </div>
           </div>

           <div className="bg-[#151520] border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                 <AlertTriangle className="text-amber-400" size={20} />
                 <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Growth Bottlenecks</h2>
              </div>
              <div className="space-y-3">
                 {insights.length > 0 ? insights.map((insight, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`p-4 rounded-2xl border ${
                        insight.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-indigo-500/5 border-indigo-500/20'
                      }`}
                    >
                       <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                            insight.type === 'warning' ? 'bg-amber-500/20 text-amber-500' : 'bg-indigo-500/20 text-indigo-400'
                          }`}>
                            {insight.impact} IMPACT
                          </span>
                          <h4 className="text-sm font-bold text-white">{insight.title}</h4>
                       </div>
                       <p className="text-xs text-slate-400 leading-relaxed">{insight.description}</p>
                    </motion.div>
                 )) : (
                    <div className="p-8 text-center border-2 border-dashed border-white/5 rounded-2xl">
                       <CheckCircle size={24} className="text-emerald-500 mx-auto mb-2 opacity-50" />
                       <p className="text-xs text-slate-500 font-medium">No immediate bottlenecks detected. System stable.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>

        {/* Member List */}
        <div className="bg-[#151520] border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4">Linked Members ({members.length})</h2>
          <div className="divide-y divide-white/5">
            {members.map(member => (
              <div key={member.user_id} className="py-3 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xs font-bold text-indigo-300 uppercase">
                    {member.display_name?.substring(0, 2) || 'M'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-200 text-sm">{member.display_name || 'Anonymous'}</p>
                    <p className="text-[10px] text-slate-500">Joined {new Date(member.joined_at!).toLocaleDateString()}</p>
                  </div>
                  {member.role === 'owner' && (
                    <span className="ml-2 px-1.5 py-0.5 bg-amber-500/20 text-amber-500 text-[9px] font-bold rounded uppercase tracking-wider">Owner</span>
                  )}
                </div>
                {member.role !== 'owner' && (
                  <button 
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Strategic Memory (Adapted from MemoryCenter) */}
        <div className="pt-6 sm:pt-8 border-t border-white/10">
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="p-3 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-500/20 shrink-0">
                <Brain size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white">Team Strategic Memory</h2>
                <p className="text-slate-400 text-xs sm:text-sm">Govern the shared context injected into your members' private chats.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 3).map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCreateMemory(cat)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-slate-300 transition-all flex items-center gap-1.5 capitalize"
                >
                  <Plus size={14} />
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {categories.map(type => {
              const typeBlocks = memoryBlocks.filter(b => b.type === type);
              if (typeBlocks.length === 0 && type !== 'strategic') return null;

              return (
                <div key={type} className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">{type} Directives</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {typeBlocks.map(block => (
                      <motion.div 
                        key={block.id}
                        layout
                        className={`group bg-slate-900/40 border rounded-2xl p-5 transition-all ${
                          editingBlockId === block.id ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-white/5 hover:border-white/10'
                        }`}
                      >
                        {editingBlockId === block.id ? (
                          <div className="space-y-4">
                            <textarea
                              autoFocus
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              placeholder="Type your directive… or attach a file to import its contents."
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-slate-200 text-sm focus:border-indigo-500/50 outline-none h-40 resize-none placeholder:text-slate-600"
                            />
                            <div className="flex justify-between items-center flex-wrap gap-2">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDeleteMemory(block.id)}
                                  className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                                  title="Delete directive"
                                >
                                  <Trash2 size={18} />
                                </button>
                                <button
                                  onClick={() => memoryFileInputRef.current?.click()}
                                  disabled={isAttachingFile}
                                  className="p-2 text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                                  title="Attach a file (text from .txt, .csv, .md, .json, etc. will be added to this directive)"
                                >
                                  {isAttachingFile ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                                  <span className="hidden sm:inline">Attach file</span>
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSaveMemory}
                                  disabled={isSavingMemory}
                                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                                >
                                  <Save size={14} />
                                  {isSavingMemory ? 'Saving...' : 'Save Block'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col">
                            <div className="flex justify-between items-start mb-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                block.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {block.status}
                              </span>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed mb-4 flex-1 whitespace-pre-wrap">
                              {typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)}
                            </p>
                            <button 
                              onClick={() => handleEditMemory(block)}
                              className="w-full py-2 bg-white/5 border border-white/5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
                            >
                              Modify Logic
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                    
                    {typeBlocks.length === 0 && (
                      <button 
                        onClick={() => handleCreateMemory(type)}
                        className="border-2 border-dashed border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-slate-300 hover:border-white/10 transition-all"
                      >
                        <Plus size={24} />
                        <span className="text-xs font-bold uppercase tracking-wider">Add {type}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
      {renderNewTeamModal()}
      <input
        ref={memoryFileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,.xlsx,image/*"
        onChange={handleAttachFileToDirective}
      />
    </div>
  );
};
