import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { LayoutDashboard, ListTodo, LogOut, Settings, Users, Building2 } from 'lucide-react';
import { cn } from '../utils/cn';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['manager'] },
    { name: 'Issues', href: '/issues', icon: ListTodo, roles: ['manager', 'agent', 'employee'] },
    { name: 'Users', href: '/users', icon: Users, roles: ['manager'] },
    { name: 'Departments', href: '/departments', icon: Building2, roles: ['manager'] },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col md:flex-row">
      <div className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="text-lg font-bold text-gray-900">Tracker<span className="text-primary">Pro</span></span>
        </div>
        <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            if (user && !item.roles.includes(user.role)) return null;
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md group transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("mr-3 shrink-0 h-5 w-5", isActive ? "text-primary" : "text-gray-400 group-hover:text-gray-500")} aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </div>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
              {user?.name.charAt(0)}
            </div>
            <div className="ml-3 truncate">
              <p className="text-sm font-medium text-gray-700 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-4 flex w-full items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header placeholder */}
        <div className="md:hidden h-16 border-b border-gray-200 bg-white flex items-center px-4 justify-between shrink-0">
          <span className="text-lg font-bold text-gray-900">Tracker<span className="text-primary">Pro</span></span>
          <button onClick={logout} className="text-gray-500"><LogOut className="h-5 w-5" /></button>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
