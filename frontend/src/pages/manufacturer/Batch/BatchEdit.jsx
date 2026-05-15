import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Textarea from '../../../components/common/Textarea';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import getStatusColor from '../../../utils/getStatusColor';
import { formatDate } from '../../../utils/formatDate';
import batchApi from '../../../services/batchApi';

const isEditableStatus = (status) => status === 'DRAFT' || status === 'FLAGGED';

const toNumberOrUndefined = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const BatchEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    productionDate: '',
    rawSpiritInputLiters: '',
    outputLiters: '',
    unitsProduced: '',
    wastageLiters: '',
    notes: ''
  });

  const fetchBatch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await batchApi.getBatchById(id);
      const data = res.data?.data || null;
      setBatch(data);
      if (data) {
        setFormData({
          productionDate: data.productionDate ? new Date(data.productionDate).toISOString().slice(0, 10) : '',
          rawSpiritInputLiters: data.rawSpiritInputLiters ?? '',
          outputLiters: data.outputLiters ?? '',
          unitsProduced: data.unitsProduced ?? '',
          wastageLiters: data.wastageLiters ?? '',
          notes: data.notes || ''
        });
      }
    } catch (err) {
      console.error('Failed to load batch:', err);
      toast.error(err.response?.data?.message || 'Failed to load batch');
      setBatch(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!batch) return;
    if (!isEditableStatus(batch.status)) {
      toast.error('Only draft or flagged batches can be edited');
      return;
    }

    setSaving(true);
    try {
      await batchApi.updateBatch(batch.id, {
        productionDate: formData.productionDate,
        rawSpiritInputLiters: toNumberOrUndefined(formData.rawSpiritInputLiters),
        outputLiters: toNumberOrUndefined(formData.outputLiters),
        unitsProduced: toNumberOrUndefined(formData.unitsProduced),
        wastageLiters: toNumberOrUndefined(formData.wastageLiters),
        notes: formData.notes
      });
      toast.success('Batch updated successfully');
      navigate(`/manufacturer/batches/${batch.id}`);
    } catch (err) {
      console.error('Failed to update batch:', err);
      toast.error(err.response?.data?.message || 'Failed to update batch');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner />
      </div>);

  }

  if (!batch) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <p className="text-gray-500">Batch not found</p>
        <Link to="/manufacturer/batches">
          <Button variant="outline">Back to Batches</Button>
        </Link>
      </div>);

  }

  const editable = isEditableStatus(batch.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Batch ${batch.batchNo}`}
        description="Update daily production details for this batch"
        actions={
        <div className="flex flex-wrap gap-2">
            <Link to={`/manufacturer/batches/${batch.id}`}>
              <Button variant="outline">Back to Details</Button>
            </Link>
          </div>
        } />
      

      <div className="text-sm text-gray-500">
        <Link to="/manufacturer/batches" className="hover:text-gray-700">Batches</Link>
        <span className="mx-2">/</span>
        <Link to={`/manufacturer/batches/${batch.id}`} className="hover:text-gray-700">Details</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">Edit</span>
      </div>

      <div className="border border-gray-200 bg-white p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Batch Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Batch Number</p>
            <p className="font-medium text-gray-900 font-mono">{batch.batchNo}</p>
          </div>
          <div>
            <p className="text-gray-500">Status</p>
            <Badge variant={getStatusColor(batch.status)}>{batch.status}</Badge>
          </div>
          <div>
            <p className="text-gray-500">Product</p>
            <p className="font-medium text-gray-900">{batch.product?.name || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Category</p>
            <p className="font-medium text-gray-900">{batch.product?.category || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">License</p>
            <p className="font-medium text-gray-900">{batch.license?.licenseNumber || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Existing Production Date</p>
            <p className="font-medium text-gray-900">{formatDate(batch.productionDate)}</p>
          </div>
        </div>
      </div>

      {!editable &&
      <div className="border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            This batch cannot be edited because it is currently {batch.status}.
          </p>
        </div>
      }

      <div className="border border-gray-200 bg-white p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Edit Production Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Production Date"
              type="date"
              value={formData.productionDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, productionDate: e.target.value }))}
              required
              disabled={!editable} />
            
            <Input
              label="Raw Spirit Input (L)"
              type="number"
              step="0.01"
              value={formData.rawSpiritInputLiters}
              onChange={(e) => setFormData((prev) => ({ ...prev, rawSpiritInputLiters: e.target.value }))}
              disabled={!editable} />
            
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Output (L)"
              type="number"
              step="0.01"
              value={formData.outputLiters}
              onChange={(e) => setFormData((prev) => ({ ...prev, outputLiters: e.target.value }))}
              disabled={!editable} />
            
            <Input
              label="Units Produced"
              type="number"
              value={formData.unitsProduced}
              onChange={(e) => setFormData((prev) => ({ ...prev, unitsProduced: e.target.value }))}
              disabled={!editable} />
            
            <Input
              label="Wastage (L)"
              type="number"
              step="0.01"
              value={formData.wastageLiters}
              onChange={(e) => setFormData((prev) => ({ ...prev, wastageLiters: e.target.value }))}
              disabled={!editable} />
            
          </div>

          <Textarea
            label="Notes"
            rows={4}
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            disabled={!editable} />
          

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              <span className="font-medium">Only DRAFT and FLAGGED batches can be updated</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => navigate(`/manufacturer/batches/${batch.id}`)}>
                
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 sm:flex-none"
                loading={saving}
                disabled={!editable}>
                
                Update Batch
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>);

};

export default BatchEdit;