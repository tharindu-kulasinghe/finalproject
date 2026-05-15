import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import SearchBar from '../../components/common/SearchBar';
import SelectDropdown from '../../components/common/SelectDropdown';
import { formatDateTime } from '../../utils/formatDate';
import api from '../../services/api';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (entityFilter) params.entityType = entityFilter;
      if (actionFilter) params.action = actionFilter;
      const res = await api.get('/audit-logs', { params });
      setLogs(res.data?.data?.logs || []);
    } catch (err) {console.error(err);} finally
    {setLoading(false);}
  }, [entityFilter, actionFilter]);

  useEffect(() => {fetchLogs();}, [fetchLogs]);

  const filtered = logs.filter((l) =>
  !search ||
  l.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
  l.entityId?.toLowerCase().includes(search.toLowerCase()) ||
  l.description?.toLowerCase().includes(search.toLowerCase())
  );

  const getActionColor = (action) => {
    const map = {
      CREATE: 'success', UPDATE: 'info', DELETE: 'danger',
      POST: 'success', PUT: 'info', PATCH: 'info',
      LOGIN: 'primary', LOGOUT: 'default',
      APPROVE: 'success', REJECT: 'danger',
      VERIFY: 'success', SUSPEND: 'warning', REVOKE: 'danger', ISSUE: 'info'
    };
    return map[action?.toUpperCase()] || 'default';
  };

  const columns = [
  {
    key: 'timestamp',
    header: 'Time',
    render: (row) =>
    <span className="text-xs text-gray-600 whitespace-nowrap">{formatDateTime(row.occurredAt || row.createdAt)}</span>

  },
  {
    key: 'user',
    header: 'User',
    render: (row) =>
    <div>
          <p className="text-sm font-medium text-gray-900">{row.user?.fullName || 'System'}</p>
          <p className="text-xs text-gray-500">{row.user?.role || ''}</p>
        </div>

  },
  {
    key: 'action',
    header: 'Action',
    render: (row) => <Badge variant={getActionColor(row.action)} size="sm">{row.action}</Badge>
  },
  {
    key: 'entityType',
    header: 'Entity',
    render: (row) =>
    <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">{row.entityType}</span>

  },
  {
    key: 'description',
    header: 'Description',
    render: (row) => <p className="text-sm text-gray-600 max-w-xs truncate">{row.description || '-'}</p>
  },
  {
    key: 'ip',
    header: 'IP',
    render: (row) => <span className="text-xs text-gray-500 font-mono">{row.ipAddress || '-'}</span>
  }];


  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="System activity and change history" />

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search logs..." className="sm:w-64" />
          <SelectDropdown
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            options={[
            { value: '', label: 'All Entities' },
            { value: 'LICENSE', label: 'License' },
            { value: 'APPLICATION', label: 'Application' },
            { value: 'PRODUCT', label: 'Product' },
            { value: 'BATCH', label: 'Batch' },
            { value: 'PAYMENT', label: 'Payment' },
            { value: 'STAMP', label: 'Stamp' },
            { value: 'USER', label: 'User' }]
            }
            className="sm:w-40" />
          
          <SelectDropdown
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            options={[
            { value: '', label: 'All Actions' },
            { value: 'CREATE', label: 'Create' },
            { value: 'UPDATE', label: 'Update' },
            { value: 'DELETE', label: 'Delete' },
            { value: 'APPROVE', label: 'Approve' },
            { value: 'REJECT', label: 'Reject' },
            { value: 'VERIFY', label: 'Verify' },
            { value: 'LOGIN', label: 'Login' }]
            }
            placeholder="All Actions"
            className="sm:w-36" />
          
        </div>

        <Table columns={columns} data={filtered} loading={loading} emptyMessage="No audit logs found" />
      </div>
    </div>);

};

export default AdminAuditLogs;