import { useEffect, useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Search, Users as UsersIcon, Shield, Briefcase, User } from 'lucide-react';

interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: 'employee' | 'agent' | 'manager';
  department_id: number | null;
  created_at: string;
}

const ROLE_CONFIG = {
  manager: { label: 'Manager', icon: Shield, color: 'bg-purple-100 text-purple-800 border border-purple-200' },
  agent:   { label: 'Agent',   icon: Briefcase, color: 'bg-blue-100 text-blue-800 border border-blue-200' },
  employee:{ label: 'Employee', icon: User, color: 'bg-gray-100 text-gray-700 border border-gray-200' },
};

const Users = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/users/')
      .then(r => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.includes(search.toLowerCase())
  );

  const counts = {
    total: users.length,
    managers: users.filter(u => u.role === 'manager').length,
    agents: users.filter(u => u.role === 'agent').length,
    employees: users.filter(u => u.role === 'employee').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Users</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Manage team members and their roles.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: counts.total, icon: UsersIcon, color: 'text-gray-600' },
          { label: 'Managers', value: counts.managers, icon: Shield, color: 'text-purple-600' },
          { label: 'Agents', value: counts.agents, icon: Briefcase, color: 'text-blue-600' },
          { label: 'Employees', value: counts.employees, icon: User, color: 'text-gray-500' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Directory</CardTitle>
              <CardDescription>All registered users in the system.</CardDescription>
            </div>
            <div className="relative w-60">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Search users…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading users…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Department</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(user => {
                    const roleConf = ROLE_CONFIG[user.role];
                    return (
                      <tr key={user.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {user.name.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-900">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${roleConf.color}`}>
                            <roleConf.icon className="h-3 w-3" />
                            {roleConf.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                          {user.department_id ? `Dept #${user.department_id}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
