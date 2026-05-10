import { useState, useEffect, useRef } from 'react';
import {
  Users, Key, Trash2, Copy, CheckCircle,
  Loader2, Plus, Brain, Save, Zap, ChevronDown, Paperclip,
  AlertTriangle, TrendingUp, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { TeamService, type Team, type TeamMember } from '../../lib/team';
import { FileHandlingService } from '../../lib/fileHandling';
import { MemoryService, type MemoryBlock, type MemoryType } from '../../lib/memory';
import { GrowthService, type GrowthInsight } from '../../lib/growth';
import type { BusinessProfile } from '../../lib/profiles';
import { PlanSelectionModal } from '../Common/PlanSelectionModal';

function parsePulseSections(text: string): Array<{ title: string; items: string[] }> {
  const sections: Array<{ title: string; items: string[] }> = [];
  let current: { title: string; items: string[] } | null = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('###')) continue;
    const header = line.match(/^\[([^\]]+)\]$/);
    if (header) {
      if (current) sections.push(current);
      current = { title: header[1], items: [] };
      continue;
    }
    if (line.startsWith('-') && current) {
      current.items.push(line.replace(/^-\s*/, ''));
    }
  }
  if (current) sections.push(current);
  return sections;
}

export const TeamPanel = ({
  profile,
  userId,
  plan,
}: {
  profile: BusinessProfile | null;
  userId?: string | null;
  plan?: 'free' | 'enterprise' | null;
}) => {
  const isFreePlan = plan === 'free';
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<{ team: Team | null; role: 'owner' | 'member' | null; displayName: string | null } | null>(null);
  const [allTeams, setAllTeams] = useState<Array<{ team: Team; role: 'owner' | 'member'; displayName: string | null }>>([]);
  const [showTeamSwitcher, setShowTeamSwitcher] = useState(false);
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [memoryBlocks, setMemoryBlocks] = useState<MemoryBlock[]>([]);
  const [isModerator, setIsModerator] = useState(false);

  const [editingBlockId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [isAttachingFile, setIsAttachingFile] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [pulseText, setPulseText] = useState('');
  const [insights, setInsights] = useState<GrowthInsight[]>([]);
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
          const mems = await TeamService.getTeamMembers(currentCtx.team.id);
          setMembers(mems);
          try {
            const [pulse, bns] = await Promise.all([
              GrowthService.getBusinessPulse(profile, uid),
              GrowthService.detectBottlenecks(profile, uid),
            ]);
            setPulseText(pulse);
            setInsights(bns);
          } catch { /* non-fatal */ }
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

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleCreateTeam = async (customName?: string) => {
    if (isFreePlan) {
      setShowUpgradeModal(true);
      return;
    }
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
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => { if (!actionLoading) { setShowNewTeamModal(false); setNewTeamName(''); } }}
      >
        <div
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-5 md:p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                <Users size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base md:text-lg font-black text-slate-900 leading-tight">Create new team</h3>
                <p className="text-xs md:text-sm text-slate-500 font-medium mt-1.5 leading-relaxed">
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
              onKeyDown={e => { if (e.key === 'Enter' && !actionLoading) handleCreateTeam(newTeamName); }}
            />
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => { setShowNewTeamModal(false); setNewTeamName(''); }}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateTeam(newTeamName)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60 shadow-md shadow-blue-500/20"
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
    return <div className="flex h-full items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  }

  // ─── No Team View ───
  if (!ctx?.team) {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-10 bg-slate-50 min-h-screen">
        <div className="bg-white border border-slate-200 rounded-[24px] p-8 text-center space-y-6 shadow-sm hover:shadow-md transition-all">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto border border-blue-100 shadow-sm">
            <Users size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Create Your Team</h2>
          <p className="text-slate-500 font-medium text-sm max-w-md mx-auto leading-relaxed">
            Create a team to generate a secure PIN. You can share this PIN with your colleagues to link them to your workspace. Their chats will remain completely private, but the AI will be guided by your strategic memory.
          </p>
          {isFreePlan ? (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 max-w-sm mx-auto shadow-sm">
                <p className="text-xs font-bold text-orange-700 mb-3">
                  Free plan includes <span className="font-black">1 team chat</span>. Upgrade to Enterprise (£449/mo) to create additional teams.
                </p>
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center mx-auto gap-2 active:scale-95"
              >
                <Zap size={20} />
                Upgrade to Enterprise
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewTeamModal(true)}
              disabled={actionLoading}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center mx-auto gap-2 active:scale-95"
            >
              {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
              Initialize Team Workspace
            </button>
          )}
        </div>
        {!isFreePlan && renderNewTeamModal()}
      </div>
    );
  }

  // ─── Member View ───
  if (ctx.role === 'member') {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-10 bg-slate-50 min-h-screen font-sans">
        <div className="bg-white border border-slate-200 rounded-[24px] p-8 text-center space-y-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
          
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto border border-emerald-100 shadow-sm">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Linked to Team</h2>
          <p className="text-slate-600 font-medium text-sm max-w-md mx-auto leading-relaxed">
            You are successfully linked to <strong className="text-slate-900">{ctx.team.title || 'the owner'}'s</strong> workspace. 
            <br/><br/>
            Your chats are completely private by design—the owner cannot read them. However, your AI responses are strategically aligned with the owner's team memory.
          </p>
          <button
            onClick={handleLeaveTeam}
            disabled={actionLoading}
            className="px-6 py-3.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center mx-auto gap-2 text-xs mt-8 shadow-sm active:scale-95"
          >
            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Disconnect from Team
          </button>

          <div className="pt-6 border-t border-slate-100">
            {isFreePlan ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500">Want your own workspace?</p>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs uppercase tracking-wider font-black text-emerald-600 transition-colors shadow-sm active:scale-95"
                >
                  <Zap size={14} />
                  Upgrade to Enterprise
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs font-bold text-slate-500 mb-3">Want your own workspace too?</p>
                <button
                  onClick={() => setShowNewTeamModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs uppercase tracking-wider font-black text-blue-600 transition-colors shadow-sm active:scale-95"
                >
                  <Plus size={14} />
                  Create your own team
                </button>
              </>
            )}
          </div>
        </div>
        {renderNewTeamModal()}
      </div>
    );
  }

  // ─── Owner View ───
  const categories: MemoryType[] = ['strategic', 'operational', 'instructional', 'constraint', 'interpretation', 'financial'];
  const ownedTeams = allTeams.filter(t => t.role === 'owner');

  return (
    <div className="h-full overflow-y-auto px-3 sm:px-6 py-4 sm:py-8 pb-32 scrollbar-thin bg-slate-50 font-sans text-slate-900 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">

        {/* Team Switcher */}
        {(ownedTeams.length > 1 || allTeams.length > 1) && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <button
                onClick={() => setShowTeamSwitcher(v => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 transition-colors shadow-sm"
              >
                <Users size={14} className="text-blue-500" />
                <span className="truncate max-w-[200px]">{ctx.team.title || 'My Team'}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showTeamSwitcher ? 'rotate-180' : ''}`} />
              </button>
              {showTeamSwitcher && (
                <div className="absolute top-full left-0 mt-2 w-[calc(100vw-2rem)] sm:w-72 max-w-xs bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden">
                  <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border-b border-slate-100">Your teams</div>
                  <div className="max-h-72 overflow-y-auto">
                    {allTeams.map(t => (
                      <button
                        key={t.team.id}
                        onClick={() => handleSwitchTeam(t.team.id)}
                        className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 text-xs transition-colors ${
                          t.team.id === ctx.team!.id ? 'bg-blue-50 text-blue-900 border-l-2 border-blue-500' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate">{t.team.title || 'My Team'}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">{t.role}</p>
                        </div>
                        {t.team.id === ctx.team!.id && <CheckCircle size={14} className="text-blue-500 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {!isFreePlan && (
              <button
                onClick={() => setShowNewTeamModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-sm font-bold text-blue-700 transition-colors shadow-sm"
              >
                <Plus size={14} />
                New Team
              </button>
            )}
          </div>
        )}
        {ownedTeams.length === 1 && allTeams.length === 1 && (
          <div className="flex justify-end">
            {!isFreePlan ? (
              <button
                onClick={() => setShowNewTeamModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-sm font-bold text-blue-700 transition-colors shadow-sm"
              >
                <Plus size={14} />
                New Team
              </button>
            ) : (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-700 transition-colors shadow-sm"
              >
                <Zap size={14} />
                Upgrade to Enterprise
              </button>
            )}
          </div>
        )}

        {/* Header & PIN */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:items-start justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-2 sm:gap-3">
                <Zap className="text-orange-500 shrink-0" size={24} /> Growth Command Center
              </span>
              {isModerator && (
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-orange-100 text-orange-600 border border-orange-200 rounded-md shadow-sm">
                  Global Moderator
                </span>
              )}
            </h1>
            <p className="text-slate-500 font-medium text-xs sm:text-sm leading-relaxed max-w-2xl">
              {isModerator
                ? 'Your memory directives guide every team member\'s private chat. Members cannot see each other — they only feel your strategy through the AI.'
                : 'Control your team\'s access and the AI\'s strategic alignment. Manage members, share the join PIN, and curate the shared memory directives.'}
            </p>
          </div>

          {isFreePlan && ctx.role === 'owner' ? (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 w-full md:w-auto md:min-w-[260px] relative overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Key size={14} className="text-orange-500" />
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">
                  Free plan · solo workspace
                </span>
              </div>
               <p className="text-xs text-slate-600 font-medium leading-relaxed mb-3">
                Inviting team members and creating additional team chats is an Enterprise feature (£449/mo). Upgrade to unlock.
              </p>
              <a
                href="mailto:info@britsyncai.com?subject=Britsee Enterprise Upgrade"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                Upgrade
              </a>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[24px] p-5 w-full md:w-auto md:min-w-[260px] shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
              <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Key size={14} className="text-blue-500" /> Team Join PIN
                </span>
                <button
                  onClick={handleRotatePin}
                  disabled={actionLoading}
                  className="text-[10px] font-bold bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 px-2 py-1 rounded-lg transition-colors shadow-sm"
                >
                  Rotate PIN
                </button>
              </div>
              <div className="flex items-center justify-between relative z-10 gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-[0.15em] font-mono truncate bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">{ctx.team.pin}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(ctx.team!.pin); setCopiedPin(true); setTimeout(() => setCopiedPin(false), 2000); }}
                  className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl transition-colors shadow-sm active:scale-95"
                  title="Copy PIN"
                >
                  {copiedPin ? <CheckCircle size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Owner-only Finance Intelligence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-4 sm:p-6 hover:shadow-md transition-all hover:border-emerald-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-500 shrink-0 shadow-sm">
                <BarChart3 size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-slate-900">Live Business Pulse</h3>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Owner-only · finance signal</p>
              </div>
            </div>
            {pulseText ? (
              <div className="space-y-4">
                {parsePulseSections(pulseText).map(sec => (
                  <div key={sec.title} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{sec.title}</p>
                    <ul className="space-y-2">
                      {sec.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-sm" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                <p className="text-slate-500 font-medium text-xs sm:text-sm">Add finance entries to see your live business pulse here.</p>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-4 sm:p-6 hover:shadow-md transition-all hover:border-orange-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-orange-50 border border-orange-100 rounded-xl text-orange-500 shrink-0 shadow-sm">
                <AlertTriangle size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-slate-900">Growth Bottlenecks</h3>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Owner-only · detected blockers</p>
              </div>
            </div>
            {insights.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-center gap-2">
                <TrendingUp size={16} className="text-emerald-500 shrink-0" />
                <p className="text-emerald-700 font-bold text-xs sm:text-sm">No bottlenecks detected.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {insights.slice(0, 4).map((ins, i) => (
                  <li key={i} className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="mt-1 w-2 h-2 rounded-full bg-orange-500 shrink-0 shadow-sm" />
                    <span className="leading-relaxed text-xs sm:text-sm font-medium">
                      <strong className="text-slate-900 block mb-0.5">{ins.title}</strong>
                      <span className="text-slate-600">{ins.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>

        {/* Member List */}
        <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-4 sm:p-6 overflow-hidden">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Linked Members ({members.length})</h2>
          <div className="divide-y divide-slate-100">
            {members.map(member => (
              <div key={member.user_id} className="py-3.5 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-sm font-black text-blue-600 uppercase shadow-sm">
                    {member.display_name?.substring(0, 2) || 'M'}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm">{member.display_name || 'Anonymous'}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Joined {new Date(member.joined_at!).toLocaleDateString()}</p>
                  </div>
                  {member.role === 'owner' && (
                    <span className="ml-2 px-2 py-0.5 bg-orange-100 border border-orange-200 text-orange-600 text-[10px] font-black rounded-md uppercase tracking-wider shadow-sm">Owner</span>
                  )}
                </div>
                {member.role !== 'owner' && (
                  <button 
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-xl transition-all shadow-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Strategic Memory (Adapted from MemoryCenter) */}
        <div className="pt-6 sm:pt-8 border-t border-slate-200">
          <div className="bg-white border border-slate-200 shadow-sm rounded-[24px] p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8 hover:shadow-md hover:border-blue-200 transition-all">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600 shadow-sm shrink-0">
                <Brain size={24} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-black text-slate-900">Team Strategic Memory</h2>
                <p className="text-slate-500 font-medium text-xs sm:text-sm mt-0.5">Govern the shared context injected into your members' private chats.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 4).map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCreateMemory(cat)}
                  className="px-3 py-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl text-xs font-black text-slate-600 hover:text-blue-600 transition-all flex items-center gap-1.5 capitalize shadow-sm active:scale-95"
                >
                  <Plus size={14} />
                  {cat}
                </button>
              ))}
              {/* Financial Shortcut */}
              <button
                onClick={() => handleCreateMemory('financial')}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-black text-emerald-700 transition-all flex items-center gap-1.5 capitalize shadow-sm active:scale-95"
              >
                <Plus size={14} />
                Financial
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {categories.map(type => {
              const typeBlocks = memoryBlocks.filter(b => b.type === type);
              if (typeBlocks.length === 0 && type !== 'strategic') return null;

              return (
                <div key={type} className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest px-2">{type} Directives</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {typeBlocks.map(block => (
                      <motion.div 
                        key={block.id}
                        layout
                        className={`group bg-white border rounded-[24px] shadow-sm p-4 sm:p-6 transition-all ${
                          editingBlockId === block.id ? 'border-blue-400 ring-4 ring-blue-500/10 shadow-md' : 'border-slate-200 hover:border-blue-200 hover:shadow-md'
                        }`}
                      >
                        {editingBlockId === block.id ? (
                          <div className="space-y-4">
                            <textarea
                              autoFocus
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              placeholder="Type your directive… or attach a file to import its contents."
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-medium text-slate-900 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none h-32 sm:h-48 resize-none placeholder:text-slate-400 shadow-inner"
                            />
                            <div className="flex justify-between items-center flex-wrap gap-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDeleteMemory(block.id)}
                                  className="p-2.5 bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 hover:border-red-200 rounded-xl transition-colors shadow-sm"
                                  title="Delete directive"
                                >
                                  <Trash2 size={16} />
                                </button>
                                <button
                                  onClick={() => memoryFileInputRef.current?.click()}
                                  disabled={isAttachingFile}
                                  className="px-3 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shadow-sm"
                                  title="Attach a file (text from .txt, .csv, .md, .json, etc. will be added to this directive)"
                                >
                                  {isAttachingFile ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                                  <span className="hidden sm:inline">Attach file</span>
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSaveMemory}
                                  disabled={isSavingMemory}
                                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
                                >
                                  <Save size={16} />
                                  {isSavingMemory ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                              <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm border ${
                                block.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-orange-50 text-orange-600 border-orange-200'
                              }`}>
                                {block.status}
                              </span>
                            </div>
                            <p className="text-slate-700 font-medium text-sm leading-relaxed mb-5 flex-1 whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              {typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)}
                            </p>
                            <button 
                              onClick={() => handleEditMemory(block)}
                              className="w-full py-3 bg-white border-2 border-slate-100 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100 shadow-sm active:scale-95"
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
                        className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-[24px] p-4 sm:p-8 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm"
                      >
                        <Plus size={28} />
                        <span className="text-xs font-black uppercase tracking-widest">Add {type}</span>
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
      <PlanSelectionModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
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
