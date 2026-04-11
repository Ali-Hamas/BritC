import React from 'react';
import {
    Zap,
    BarChart3,
    PieChart,
    Target,
    Loader2,
    Bell
} from 'lucide-react';
import { FinanceService } from '../../lib/finance';
import type { ForecastData, SimulationResult } from '../../lib/finance';
import { ReportingService } from '../../lib/reporting';
import type { FinancialAlert } from '../../lib/reporting';

export const FinanceDashboard = ({ profile }: { profile: any }) => {
    const [forecast, setForecast] = React.useState<ForecastData[]>([]);
    const [simulation, setSimulation] = React.useState<SimulationResult | null>(null);
    const [alerts, setAlerts] = React.useState<FinancialAlert[]>([]);
    const [isSimulating, setIsSimulating] = React.useState(false);
    const [scenario, setScenario] = React.useState('');

    React.useEffect(() => {
        const loadFinance = async () => {
            const data = await FinanceService.getForecast(profile);
            const alertData = await ReportingService.getRecentAlerts();
            setForecast(data);
            setAlerts(alertData);
        };
        loadFinance();
    }, [profile]);

    const handleSimulate = async () => {
        if (!scenario) return;
        setIsSimulating(true);
        const result = await FinanceService.runWhatIfSimulation(profile, scenario);
        setSimulation(result);
        setIsSimulating(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <header>
                <h1 className="text-3xl font-bold text-white">Financial Cockpit</h1>
                <p className="text-slate-400 mt-2">Predictive analytics and strategic scenario planning for {profile?.business_name}.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Forecast Chart Placeholder / Summary */}
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            12-Month Cash Flow Forecast
                        </h3>
                        <div className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                            +18% PROJECTED GROWTH
                        </div>
                    </div>

                    <div className="h-64 flex items-end gap-2 px-4">
                        {forecast.map((d, i) => (
                            <div key={i} className="flex-1 group relative">
                                <div
                                    className="w-full bg-primary/20 hover:bg-primary/40 transition-all rounded-t-lg relative"
                                    style={{ height: `${(d.revenue / 100000) * 100}%` }}
                                >
                                    <div
                                        className="absolute bottom-0 w-full bg-primary rounded-t-lg opacity-40"
                                        style={{ height: `${(d.profit / d.revenue) * 100}%` }}
                                    />
                                </div>
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-[10px] p-2 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                                    Rev: ${d.revenue.toLocaleString()}<br />
                                    Profit: ${d.profit.toLocaleString()}
                                </div>
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 font-bold uppercase">{d.month}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Efficiency Score */}
                <div className="glass-card p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-accent" />
                            Efficiency Score
                        </h3>
                        <div className="relative w-32 h-32 mx-auto mb-6">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                <circle className="text-white/5" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                                <circle className="text-primary" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset="62.8" strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-white">75</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Optimal</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Resource Utilization</p>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-primary w-[82%]" />
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Cost Optimization</p>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-accent w-[64%]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Simulation Lab */}
            <div className="glass-card p-8 border-primary/20 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Zap className="w-24 h-24 text-primary" />
                </div>

                <div className="max-w-2xl">
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        AI Simulation Lab
                    </h2>
                    <p className="text-slate-400 text-sm mb-6">Run advanced "What-If" scenarios to see projected impacts on your bottom line.</p>

                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={scenario}
                            onChange={(e) => setScenario(e.target.value)}
                            placeholder="e.g. What if I hire 2 senior developers next month?"
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 text-white"
                        />
                        <button
                            onClick={handleSimulate}
                            disabled={isSimulating || !scenario}
                            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                            Simulate
                        </button>
                    </div>

                    {simulation && (
                        <div className="mt-8 p-6 rounded-2xl bg-primary/5 border border-primary/20 animate-in slide-in-from-top-4 duration-500">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h4 className="text-white font-bold mb-1">Scenario Analysis Result</h4>
                                    <p className="text-slate-300 text-sm italic">"{simulation.scenario}"</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${simulation.projectedChange.startsWith('+') ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
                                    {simulation.projectedChange} IMPACT
                                </div>
                            </div>
                            <p className="text-slate-300 mb-6 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">{simulation.impact}</p>
                            <div>
                                <h5 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Strategic Action Items</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {simulation.actionItems.map((item, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Financial Alerts */}
            {alerts.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Bell className="w-5 h-5 text-amber-400" />
                        AI Financial Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {alerts.map(alert => (
                            <div key={alert.id} className="p-4 rounded-xl bg-slate-900/40 border border-white/5 flex gap-4">
                                <div className={`w-1 h-full rounded-full ${alert.type === 'warning' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                <div>
                                    <h4 className="text-white font-bold text-sm">{alert.title}</h4>
                                    <p className="text-xs text-slate-400 mt-1">{alert.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
