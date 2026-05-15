import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Table from '../../../components/common/Table';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import SearchBar from '../../../components/common/SearchBar';
import SelectDropdown from '../../../components/common/SelectDropdown';
import getStatusColor from '../../../utils/getStatusColor';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import dutyApi from '../../../services/dutyApi';

const AdminDuties = () => {
  const navigate = useNavigate();
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const fetchDuties = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      const res = await dutyApi.getDuties(params);
      setDuties(res.data?.data?.assessments || res.data?.data?.duties || []);
    } catch (err) {
      console.error('Failed to fetch duties:', err);
      toast.error(err.response?.data?.message || 'Failed to load duty assessments');
      setDuties([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {fetchDuties();}, [fetchDuties]);

  const filtered = duties.filter((d) =>
  !search ||
  d.assessmentNo?.toLowerCase().includes(search.toLowerCase()) ||
  d.batch?.batchNo?.toLowerCase().includes(search.toLowerCase()) ||
  d.batch?.product?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
  {
    key: 'assessmentNo',
    header: 'Assessment No',
    render: (row) => <span className="font-mono text-xs font-medium text-gray-900">{row.assessmentNo || '-'}</span>
  },
  {
    key: 'batch',
    header: 'Batch / Product',
    render: (row) =>
    <div>
          <p className="font-medium text-gray-900">{row.batch?.batchNo || '-'}</p>
          <p className="text-xs text-gray-500">{row.batch?.product?.name || ''}</p>
        </div>

  },
  {
    key: 'assessedAmount',
    header: 'Amount',
    render: (row) =>
    <span className="font-semibold text-gray-900">{formatCurrency(row.assessedAmount)}</span>

  },
  {
    key: 'balance',
    header: 'Balance',
    render: (row) => {
      const balance = row.balanceAmount ?? row.assessedAmount - (row.paidAmount || 0);
      return (
        <span className={balance > 0 ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium'}>
            {formatCurrency(balance)}
          </span>);

    }
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
  },
  {
    key: 'dueDate',
    header: 'Due Date',
    render: (row) => {
      const isOverdue = row.dueDate && new Date(row.dueDate) < new Date() && !['PAID', 'WAIVED'].includes(row.status);
      return (
        <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-700'}>
            {formatDate(row.dueDate)}
          </span>);

    }
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) =>
    <Button size="sm" variant="outline" onClick={() => navigate(`/admin/duties/${row.id}`)}>
          View
        </Button>

  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Duty Assessments"
        description="View all daily production duty assessments and prepare for payment verification" />
      

      <div className="border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">
          Duties are calculated for verified daily production batches. Payment allocation and gateway confirmation can be managed in the payments module.
        </p>
      </div>

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by assessment, batch..."
            className="sm:w-72" />
          
          <SelectDropdown
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
            { value: '', label: 'All Status' },
            { value: 'CALCULATED', label: 'Calculated' },
            { value: 'PART_PAID', label: 'Part Paid' },
            { value: 'PAID', label: 'Paid' },
            { value: 'OVERDUE', label: 'Overdue' },
            { value: 'WAIVED', label: 'Waived' }]
            }
            className="sm:w-40" />
          
        </div>

        <Table
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage="No duty assessments found" />
        
      </div>
    </div>);

};

export default AdminDuties;