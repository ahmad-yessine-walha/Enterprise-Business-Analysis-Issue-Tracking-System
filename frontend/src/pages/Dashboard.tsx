import { useEffect, useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { AlertCircle, CheckCircle2, Clock, ListTodo, TrendingUp, Activity } from 'lucide-react';

interface KPIs {
  total_issues: number;
  open_issues: number;
  resolved_issues: number;
  critical_issues: number;
  avg_resolution_time_hours: number;
  resolution_rate: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#3b82f6',
  low:      '#94a3b8',
};

const KPICard = ({
  title, value, sub, icon: Icon, accent, trend
}: {
  title: string; value: string | number; sub: string;
  icon: React.ElementType; accent: string; trend?: string;
}) => (
  <Card className="relative overflow-hidden">
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 opacity-10 ${accent}`} />
    <CardContent className="pt-5 pb-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${accent} bg-opacity-15`}>
          <Icon className={`h-5 w-5`} style={{ color: 'inherit' }} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600 font-medium">
          <TrendingUp className="h-3 w-3" />
          {trend}
        </div>
      )}
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [priorityData, setPriorityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/kpis'),
      api.get('/dashboard/trends'),
      api.get('/dashboard/departments'),
      api.get('/dashboard/priority-breakdown'),
    ]).then(([kpiRes, trendsRes, deptRes, priorRes]) => {
      setKpis(kpiRes.data);
      // Limit trend to last 30 days for readability
      const t = trendsRes.data.slice(-30);
      setTrends(t.map((d: any) => ({ ...d, date: d.date.slice(5) }))); // "MM-DD"
      setDeptData(deptRes.data);
      setPriorityData(priorRes.data.map((d: any) => ({
        name: d.priority.charAt(0).toUpperCase() + d.priority.slice(1),
        value: d.count,
        fill: PRIORITY_COLORS[d.priority] ?? '#94a3b8',
      })));
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!kpis) return <div className="py-10 text-center text-sm text-muted-foreground">Failed to load dashboard data.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Operations Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Real-time overview of enterprise operational health.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Issues"
          value={kpis.total_issues}
          sub="All time in system"
          icon={ListTodo}
          accent="bg-blue-500"
        />
        <KPICard
          title="Resolution Rate"
          value={`${kpis.resolution_rate}%`}
          sub={`${kpis.resolved_issues} resolved`}
          icon={CheckCircle2}
          accent="bg-emerald-500"
          trend={kpis.resolution_rate > 50 ? "Above 50% target" : undefined}
        />
        <KPICard
          title="Avg Resolution Time"
          value={`${kpis.avg_resolution_time_hours}h`}
          sub="Across all priorities"
          icon={Clock}
          accent="bg-violet-500"
        />
        <KPICard
          title="Critical Open"
          value={kpis.critical_issues}
          sub="Require immediate action"
          icon={AlertCircle}
          accent="bg-red-500"
        />
      </div>

      {/* Open vs Resolved summary bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Issue Backlog Health</span>
            </div>
            <span className="text-sm text-muted-foreground">{kpis.open_issues} open · {kpis.resolved_issues} resolved</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${kpis.resolution_rate}%` }}
            />
            <div
              className="h-full bg-yellow-400 transition-all"
              style={{ width: `${kpis.total_issues > 0 ? (kpis.open_issues / kpis.total_issues * 100) : 0}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Resolved {kpis.resolution_rate}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Open {kpis.total_issues > 0 ? Math.round(kpis.open_issues / kpis.total_issues * 100) : 0}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Trend line */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Issue Volume Trend <span className="text-sm font-normal text-muted-foreground">(last 30 days)</span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }}
                    cursor={{ stroke: '#e2e8f0' }}
                  />
                  <Line
                    type="monotone" dataKey="count" name="Issues"
                    stroke="#3b82f6" strokeWidth={2.5}
                    dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Priority pie */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Priority Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ fontSize: 12, color: '#64748b' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Issues by Department</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="count" name="Issues" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
