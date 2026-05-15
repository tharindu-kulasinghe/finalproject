import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Table from '../../../components/common/Table';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import SearchBar from '../../../components/common/SearchBar';
import SelectDropdown from '../../../components/common/SelectDropdown';
import getStatusColor from '../../../utils/getStatusColor';
import officerApi from '../../../services/officerApi';

const POSITIONS = [
'OIC',
'INSPECTOR',
'ASSISTANT_EXCISE_SUPERINTENDENT',
'EXCISE_SUPERINTENDENT',
'ASSISTANT_COMMISSIONER',
'DEPUTY_COMMISSIONER',
'COMMISSIONER',
'INVESTIGATION_OFFICER',
'FIELD_OFFICER',
'DATA_ENTRY_OFFICER',
'CLERK',
'OTHER'];


const STATUS_OPTIONS = [
{ value: 'ACTIVE', label: 'Active' },
{ value: 'INACTIVE', label: 'Inactive' },
{ value: 'SUSPENDED', label: 'Suspended' },
{ value: 'PENDING', label: 'Pending' }];


export default function Officers() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const navigate = useNavigate();

  const fetchOfficers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (positionFilter) params.position = positionFilter;

      const response = await officerApi.getOfficers(params);
      setOfficers(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching officers:', error);
      setOfficers([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, positionFilter]);

  useEffect(() => {
    fetchOfficers();
  }, [fetchOfficers]);

  const handleStatusChange = async (newStatus) => {
    const officerId = selectedOfficer?.id;
    try {
      await officerApi.updateOfficerStatus(officerId, newStatus);
      setShowStatusModal(false);
      setSelectedOfficer(null);
      fetchOfficers();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Error updating status');
    }
  };

  const handlePasswordReset = async (newPassword) => {
    const officerId = selectedOfficer?.id;
    try {
      await officerApi.resetOfficerPassword(officerId, newPassword);
      setShowPasswordModal(false);
      setSelectedOfficer(null);
      toast.success('Password reset successfully');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.message || 'Error resetting password');
    }
  };

  const formatPosition = (pos) => {
    if (!pos) return '-';
    return pos.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const columns = [
  { key: 'fullName', header: 'Officer', render: (row) =>
    <div className="flex items-center gap-3">
        <div className="w-10 h-10 !rounded-full overflow-hidden border border-primary-200 bg-primary-50 flex items-center justify-center">
          {row.profileImage ?
        <img src={row.profileImage} alt="" className="h-full w-full !rounded-full object-cover" /> :

        <span className="text-sm font-semibold text-primary-700">
              {row.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
        }
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{row.fullName}</p>
          <p className="text-xs text-gray-500">{row.email}</p>
        </div>
      </div>
  },
  { key: 'employeeNo', header: 'Emp No' },
  { key: 'position', header: 'Position', render: (row) => formatPosition(row.position) },
  { key: 'officeName', header: 'Office' },
  { key: 'district', header: 'District' },
  { key: 'status', header: 'Status', render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status || 'PENDING'}</Badge> },
  { key: 'actions', header: 'Actions', render: (row) =>
    <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => navigate(`/admin/officers/${row.id}`)}>View</Button>
        <Button size="sm" variant="outline" onClick={() => navigate(`/admin/officers/${row.id}/edit`)}>Edit</Button>
        <Button size="sm" variant={row.status === 'ACTIVE' ? 'danger' : 'success'} onClick={() => {setShowStatusModal(true);setSelectedOfficer(row);}}>
          {row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => {setShowPasswordModal(true);setSelectedOfficer(row);}}>Reset</Button>
      </div>
  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Excise Officers"
        description="Manage excise department officers and employees"
        actions={
        <Link to="/admin/officers/add">
            <Button>Add Officer</Button>
          </Link>
        } />
      
      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search officers..."
            className="sm:w-72" />
          
          <SelectDropdown
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: '', label: 'All Status' }, ...STATUS_OPTIONS]}
            className="sm:w-40" />
          
          <SelectDropdown
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            options={[{ value: '', label: 'All Positions' }, ...POSITIONS.map((position) => ({ value: position, label: formatPosition(position) }))]}
            className="sm:w-44" />
          
        </div>
        <Table columns={columns} data={officers} loading={loading} emptyMessage="No officers found" />
      </div>

      <Modal isOpen={showStatusModal && !!selectedOfficer} onClose={() => {setShowStatusModal(false);setSelectedOfficer(null);}} title="Change Status" size="md">
        <p className="text-sm text-gray-600 mb-4">Select new status for {selectedOfficer?.fullName}</p>
        <div className="space-y-2">
          {STATUS_OPTIONS.map((status) =>
          <Button key={status.value} variant={selectedOfficer?.status === status.value ? 'primary' : 'outline'} onClick={() => handleStatusChange(status.value)} className="w-full justify-center">{status.label}</Button>
          )}
        </div>
      </Modal>

      <Modal isOpen={showPasswordModal && !!selectedOfficer} onClose={() => {setShowPasswordModal(false);setSelectedOfficer(null);}} title="Reset Password" size="md">
        <form onSubmit={(e) => {e.preventDefault();handlePasswordReset(e.target.newPassword.value);}} className="space-y-4">
          <Input label="New Password" name="newPassword" type="password" required minLength={6} />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => {setShowPasswordModal(false);setSelectedOfficer(null);}} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Reset Password</Button>
          </div>
        </form>
      </Modal>
    </div>);

}