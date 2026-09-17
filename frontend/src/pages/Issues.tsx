import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../store/AuthContext';
import { format, differenceInHours, isPast } from 'date-fns';
import { Plus, Search, AlertTriangle, Clock, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface Issue {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  reporter_id: number;
  assignee_id: number | null;
  department_id: number | null;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  resolved_at: string | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border border-red-200',
  high:     'bg-orange-100 text-orange-800 border border-orange-200',
  medium:   'bg-blue-100 text-blue-800 border border-blue-200',
  low:      'bg-gray-100 text-gray-700 border border-gray-200',
};

const STATUS_COLORS: Record<string, string> = {
  open:        'bg-yellow-50 text-yellow-800 border border-yellow-200',
  in_progress: 'bg-blue-50 text-blue-800 border border-blue-200',
  pending:     'bg-purple-50 text-purple-800 border border-purple-200',
  resolved:    'bg-emerald-50 text-emerald-800 border border-emerald-200',
  closed:      'bg-gray-100 text-gray-700 border border-gray-200',
};

const PAGE_SIZE = 15;

const SLABadge = ({ dueDate, status }: { dueDate: string | null; status: string }) => {
  if (!dueDate || ['resolved', 'closed'].includes(status)) return null;
  const hoursLeft = differenceInHours(new Date(dueDate), new Date());
  const overdue = isPast(new Date(dueDate));
  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
        <AlertTriangle className="h-3 w-3" /> SLA Breached
      </span>
    );
  }
  if (hoursLeft <= 4) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">
        <Clock className="h-3 w-3" /> {hoursLeft}h left
      </span>
    );
  }
  return null;
};

const Issues = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [page, setPage] = useState(1);

  // Report modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportForm, setReportForm] = useState({ title: '', description: '', category: 'IT', priority: 'medium' });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  // Edit/View modal
  const [viewIssue, setViewIssue] = useState<Issue | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const { user } = useAuth();

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/issues/', { params: { skip: 0, limit: 500 } });
      setIssues(response.data);
    } catch (error) {
      console.error("Failed to fetch issues", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  // Filter & paginate
  const filtered = issues.filter(issue => {
    const matchSearch = !search ||
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      issue.category.toLowerCase().includes(search.toLowerCase()) ||
      String(issue.id).includes(search);
    const matchStatus = !filterStatus || issue.status === filterStatus;
    const matchPriority = !filterPriority || issue.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, filterStatus, filterPriority]);

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportError('');
    setReportLoading(true);
    try {
      await api.post('/issues/', reportForm);
      setReportOpen(false);
      setReportForm({ title: '', description: '', category: 'IT', priority: 'medium' });
      await fetchIssues();
    } catch (err: any) {
      setReportError(err.response?.data?.detail || 'Failed to submit issue.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewIssue) return;
    setEditError('');
    setEditLoading(true);
    try {
      const payload: any = {};
      if (editStatus && editStatus !== viewIssue.status) payload.status = editStatus;
      if (editPriority && editPriority !== viewIssue.priority) payload.priority = editPriority;
      if (Object.keys(payload).length > 0) {
        await api.put(`/issues/${viewIssue.id}`, payload);
      }
      if (editComment.trim()) {
        await api.post(`/issues/${viewIssue.id}/comments`, { content: editComment.trim() });
      }
      setViewIssue(null);
      setEditComment('');
      await fetchIssues();
    } catch (err: any) {
      setEditError(err.response?.data?.detail || 'Failed to update issue.');
    } finally {
      setEditLoading(false);
    }
  };

  const openView = (issue: Issue) => {
    setViewIssue(issue);
    setEditStatus(issue.status);
    setEditPriority(issue.priority);
    setEditComment('');
    setEditError('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Issues</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filtered.length} issue{filtered.length !== 1 ? 's' : ''} {filterStatus || filterPriority || search ? 'matching filters' : 'total'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchIssues} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {(user?.role === 'employee' || user?.role === 'manager') && (
            <Button size="sm" onClick={() => setReportOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Report Issue
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Search by title, ID, or category…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="h-4 w-4 text-gray-400 hidden sm:block" />
              <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-36">
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </Select>
              <Select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="w-36">
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Issue Registry</CardTitle>
          <CardDescription>Click any issue to view details or update status.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-sm text-gray-400">Loading issues…</div>
          ) : paginated.length === 0 ? (
            <div className="py-20 text-center text-sm text-gray-400">No issues found matching your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Category</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium hidden lg:table-cell">SLA</th>
                    <th className="px-4 py-3 font-medium hidden lg:table-cell">Created</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(issue => (
                    <tr
                      key={issue.id}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                      onClick={() => openView(issue)}
                    >
                      <td className="px-4 py-3 font-mono text-gray-400 text-xs">#{issue.id}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                          {issue.title}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{issue.category}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PRIORITY_COLORS[issue.priority] ?? ''}`}>
                          {issue.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[issue.status] ?? ''}`}>
                          {issue.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <SLABadge dueDate={issue.due_date} status={issue.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                        {format(new Date(issue.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => openView(issue)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages} · {filtered.length} results
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Issue Modal */}
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report New Issue">
        <form onSubmit={handleReport} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title *</label>
            <Input
              placeholder="Brief description of the issue"
              value={reportForm.title}
              onChange={e => setReportForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description *</label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              placeholder="Detailed description of what happened, steps to reproduce, impact…"
              value={reportForm.description}
              onChange={e => setReportForm(f => ({ ...f, description: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <Select value={reportForm.category} onChange={e => setReportForm(f => ({ ...f, category: e.target.value }))}>
                <option>IT</option>
                <option>HR</option>
                <option>Finance</option>
                <option>Operations</option>
                <option>Software</option>
                <option>Hardware</option>
                <option>Access</option>
                <option>Reporting</option>
                <option>Process</option>
                <option>Other</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Priority</label>
              <Select value={reportForm.priority} onChange={e => setReportForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </div>
          </div>
          {reportError && <p className="text-sm text-red-500">{reportError}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={reportLoading}>
              {reportLoading ? 'Submitting…' : 'Submit Issue'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View / Edit Issue Modal */}
      <Modal
        open={!!viewIssue}
        onClose={() => setViewIssue(null)}
        title={viewIssue ? `Issue #${viewIssue.id}` : ''}
        className="max-w-xl"
      >
        {viewIssue && (
          <form onSubmit={handleUpdate} className="space-y-5">
            {/* Issue info */}
            <div className="space-y-1">
              <h3 className="font-semibold text-gray-900">{viewIssue.title}</h3>
              <p className="text-sm text-gray-500">{viewIssue.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border rounded-lg p-4 bg-gray-50/50">
              <div><span className="text-gray-500">Category:</span> <span className="font-medium">{viewIssue.category}</span></div>
              <div><span className="text-gray-500">Reporter:</span> <span className="font-medium">#{viewIssue.reporter_id}</span></div>
              <div><span className="text-gray-500">Created:</span> <span className="font-medium">{format(new Date(viewIssue.created_at), 'MMM d, yyyy HH:mm')}</span></div>
              {viewIssue.due_date && (
                <div>
                  <span className="text-gray-500">SLA Due:</span>{' '}
                  <span className={`font-medium ${isPast(new Date(viewIssue.due_date)) && !['resolved','closed'].includes(viewIssue.status) ? 'text-red-600' : ''}`}>
                    {format(new Date(viewIssue.due_date), 'MMM d, HH:mm')}
                  </span>
                </div>
              )}
              {viewIssue.resolved_at && (
                <div><span className="text-gray-500">Resolved:</span> <span className="font-medium text-emerald-600">{format(new Date(viewIssue.resolved_at), 'MMM d, yyyy HH:mm')}</span></div>
              )}
            </div>

            {/* Editable fields — agents and managers only */}
            {(user?.role === 'agent' || user?.role === 'manager') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={editPriority} onChange={e => setEditPriority(e.target.value)}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Add Comment</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    placeholder="Provide an update, ask for more info, or note resolution steps…"
                    value={editComment}
                    onChange={e => setEditComment(e.target.value)}
                  />
                </div>
              </>
            )}

            {editError && <p className="text-sm text-red-500">{editError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setViewIssue(null)}>Close</Button>
              {(user?.role === 'agent' || user?.role === 'manager') && (
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? 'Saving…' : 'Save Changes'}
                </Button>
              )}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Issues;
