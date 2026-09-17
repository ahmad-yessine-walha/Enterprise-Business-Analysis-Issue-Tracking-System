import { useEffect, useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Building2 } from 'lucide-react';

interface Department {
  id: number;
  name: string;
}

interface DeptStats {
  name: string;
  count: number;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const Departments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptStats, setDeptStats] = useState<DeptStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/users/departments'),
      api.get('/dashboard/departments'),
    ]).then(([depts, stats]) => {
      setDepartments(depts.data);
      setDeptStats(stats.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Merge counts into department list
  const merged = departments.map(dept => ({
    ...dept,
    count: deptStats.find(s => s.name === dept.name)?.count ?? 0,
  })).sort((a, b) => b.count - a.count);

  const total = merged.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Departments</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Issue distribution across departments.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Issue Volume by Department</CardTitle>
            <CardDescription>Total of {total} issues across all departments</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading…</div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={merged} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="count" name="Issues" radius={[4, 4, 0, 0]}>
                      {merged.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department cards */}
        {merged.map((dept, i) => (
          <Card key={dept.id} className="flex flex-col">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${COLORS[i % COLORS.length]}20` }}>
                    <Building2 className="h-5 w-5" style={{ color: COLORS[i % COLORS.length] }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{dept.name}</p>
                    <p className="text-xs text-gray-500">Department #{dept.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{dept.count}</p>
                  <p className="text-xs text-gray-500">issues</p>
                </div>
              </div>
              {total > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Share of total</span>
                    <span>{Math.round((dept.count / total) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(dept.count / total) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Departments;
