import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/SearchBar';
import SelectDropdown from '../../components/common/SelectDropdown';
import getStatusColor from '../../utils/getStatusColor';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import dutyApi from '../../services/dutyApi';

const isOverdueDuty = (duty) => {
  if (!duty?.dueDate) return false;
  if (['PAID', 'WAIVED', 'CANCELLED'].includes(duty.status)) return false;

  const dueDate = new Date(duty.dueDate);
  if (Number.isNaN(dueDate.getTime())) return false;

  return dueDate < new Date();
};

const getDisplayStatus = (duty) => isOverdueDuty(duty) ? 'OVERDUE' : duty.status;

const OfficerDuties = () => {
  const navigate = useNavigate();
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const fetchDuties = useCallback(async () => {
    setLoading(true);
    try {
      const allDuties = [];
      const limit = 200;
      let page = 1;
      let totalPages = 1;

      do {
        const res = await dutyApi.getDuties({ page, limit });
        const data = res.data?.data || {};
        allDuties.push(...(data.assessments || data.duties || []));
        totalPages = Number(data.pagination?.pages || 1);
        page += 1;
      } while (page <= totalPages);

      setDuties(allDuties);
    } catch (err) {
      console.error('Failed to fetch duties:', err);
      setDuties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {fetchDuties();}, [fetchDuties]);

  const filtered = useMemo(() => {
    return duties.filter((duty) => {
      const matchesSearch = !search ||
      duty.assessmentNo?.toLowerCase().includes(search.toLowerCase()) ||
      duty.batch?.batchNo?.toLowerCase().includes(search.toLowerCase()) ||
      duty.batch?.product?.name?.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;
      if (!filter) return true;

      return getDisplayStatus(duty) === filter;
    });
  }, [duties, search, filter]);

  const summary = useMemo(() => {
    const total = duties.length;
    const pending = duties.filter((item) => ['CALCULATED', 'PART_PAID', 'OVERDUE'].includes(getDisplayStatus(item))).length;
    const paid = duties.filter((item) => getDisplayStatus(item) === 'PAID').length;
    const waived = duties.filter((item) => getDisplayStatus(item) === 'WAIVED').length;

    return { total, pending, paid, waived };
  }, [duties]);

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
    render: (row) => <span className="font-semibold text-gray-900">{formatCurrency(row.assessedAmount)}</span>
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
    render: (row) => {
      const displayStatus = getDisplayStatus(row);
      return <Badge variant={getStatusColor(displayStatus)}>{displayStatus}</Badge>;
    }
  },
  {
    key: 'dueDate',
    header: 'Due Date',
    render: (row) => {
      const isOverdue = isOverdueDuty(row);
      return (
        <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-gray-700'}>
            {formatDate(row.dueDate)}
          </span>);

    }
  },
  {
    key: 'actions',
    header: '',
    render: (row) =>
    <Button
      size="sm"
      variant="outline"
      onClick={() => navigate(`/officer/duties/${row.id}`)}>
      
          View
        </Button>

  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Duty Assessments"
        description="Track and manage excise duty calculations" />
      

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Assessments</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{summary.total}</p>
        </div>
        <div className="border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Pending Collection</p>
          <p className="text-2xl font-semibold text-amber-700 mt-1">{summary.pending}</p>
        </div>
        <div className="border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-2xl font-semibold text-emerald-700 mt-1">{summary.paid}</p>
        </div>
        <div className="border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Waived</p>
          <p className="text-2xl font-semibold text-gray-700 mt-1">{summary.waived}</p>
        </div>
      </div>

      <div className="border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">
          Duty assessments are created from verified batches. Officer review here should focus on status progression and due-date risk before payment verification.
        </p>
      </div>

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
           <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by assessment or batch..."
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

        <Table columns={columns} data={filtered} loading={loading} emptyMessage="No duty assessments" />
      </div>
    </div>);

};

export default OfficerDuties;