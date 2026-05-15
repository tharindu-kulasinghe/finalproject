import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import SelectDropdown from '../../../components/common/SelectDropdown';
import Badge from '../../../components/common/Badge';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import stampApi from '../../../services/stampApi';
import productApi from '../../../services/productApi';
import batchApi from '../../../services/batchApi';
import licenseApi from '../../../services/licenseApi';
import { formatNumber } from '../../../utils/formatCurrency';

const CreateStampRequest = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [products, setProducts] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [batches, setBatches] = useState([]);

  const [stampCountLoading, setStampCountLoading] = useState(false);
  const [availableStampCount, setAvailableStampCount] = useState(0);

  const [formData, setFormData] = useState({
    productId: '',
    licenseId: '',
    batchId: '',
    quantityRequested: ''
  });

  const [formErrors, setFormErrors] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, licensesRes, batchesRes] = await Promise.all([
      productApi.getProducts(),
      licenseApi.getMyLicenses(),
      batchApi.getBatches()]
      );

      setProducts(productsRes.data?.data?.products || productsRes.data?.data?.items || []);
      setLicenses(licensesRes.data?.data?.licenses || []);
      setBatches(batchesRes.data?.data?.batches || batchesRes.data?.data?.items || []);
    } catch (loadError) {
      console.error('Failed to load form options:', loadError);
      setProducts([]);
      setLicenses([]);
      setBatches([]);
      setError('Failed to load products, licenses, or batches.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProductOptions = useMemo(() => {
    const source = formData.licenseId ?
    products.filter((product) => product.licenseId === formData.licenseId) :
    products;

    return [
    { value: '', label: 'Select Product' },
    ...source.map((product) => ({
      value: product.id,
      label: `${product.code || '-'} - ${product.name || '-'}`
    }))];

  }, [products, formData.licenseId]);

  const licenseOptions = [
  { value: '', label: 'Select License' },
  ...licenses.map((license) => ({
    value: license.id,
    label: `${license.licenseNumber} - ${license.companyName || '-'}`
  }))];


  const batchOptions = useMemo(() => {
    const validBatches = batches.filter((batch) =>
    batch.status === 'VERIFIED' && (
    !formData.productId || batch.productId === formData.productId) && (
    !formData.licenseId || batch.licenseId === formData.licenseId)
    );

    return [
    { value: '', label: 'Select Verified Batch' },
    ...validBatches.map((batch) => ({
      value: batch.id,
      label: `${batch.batchNo} - ${batch.product?.name || '-'}`
    }))];

  }, [batches, formData.productId, formData.licenseId]);

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === formData.batchId) || null,
    [batches, formData.batchId]
  );

  useEffect(() => {
    if (!selectedBatch?.unitsProduced) return;

    setFormData((prev) => {
      if (prev.quantityRequested) return prev;
      return { ...prev, quantityRequested: String(selectedBatch.unitsProduced) };
    });
  }, [selectedBatch]);

  const fetchAvailableStampCount = useCallback(async (productId, licenseId) => {
    if (!productId || !licenseId) {
      setAvailableStampCount(0);
      return;
    }

    setStampCountLoading(true);
    try {
      const response = await stampApi.getTaxStamps({ productId, limit: 1000 });
      const stamps = response.data?.data?.stamps || [];
      const count = stamps.filter((stamp) => {
        if (stamp.batchId) return false;
        if (!['GENERATED', 'ACTIVE'].includes(stamp.status)) return false;
        if (stamp.stampRequest?.status !== 'ISSUED') return false;
        return stamp.stampRequest?.licenseId === licenseId;
      }).length;

      setAvailableStampCount(count);
    } catch (countError) {
      console.error('Failed to fetch available stamp count:', countError);
      setAvailableStampCount(0);
    } finally {
      setStampCountLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableStampCount(formData.productId, formData.licenseId);
  }, [formData.productId, formData.licenseId, fetchAvailableStampCount]);

  const validate = () => {
    const nextErrors = {};

    if (!formData.licenseId) nextErrors.licenseId = 'License is required';
    if (!formData.productId) nextErrors.productId = 'Product is required';
    if (!formData.batchId) nextErrors.batchId = 'Batch is required';

    const quantity = Number(formData.quantityRequested);
    if (!formData.quantityRequested) {
      nextErrors.quantityRequested = 'Quantity is required';
    } else if (!Number.isInteger(quantity) || quantity <= 0) {
      nextErrors.quantityRequested = 'Quantity must be a positive integer';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        productId: formData.productId,
        licenseId: formData.licenseId,
        batchId: formData.batchId,
        quantityRequested: Number(formData.quantityRequested)
      };

      const response = await stampApi.createStampRequest(payload);
      const created = response.data?.data;

      toast.success('Stamp request created successfully');
      navigate(created?.id ? `/manufacturer/stamp-requests/${created.id}` : '/manufacturer/stamp-requests');
    } catch (submitError) {
      console.error('Failed to create stamp request:', submitError);
      const message = submitError.response?.data?.message || submitError.response?.data?.error || 'Failed to create stamp request';
      setError(message);
      toast.error(message);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Request Tax Stamps"
        description="Create a new stamp request using a verified batch"
        actions={
        <Link to="/manufacturer/stamp-requests">
            <Button variant="outline">Back to Stamp Requests</Button>
          </Link>
        } />
      

      <div className="text-sm text-gray-500">
        <Link to="/manufacturer/stamp-requests" className="hover:text-gray-700">Stamp Requests</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">New Request</span>
      </div>

      {error &&
      <div className="p-4 bg-red-50 border border-red-200 text-red-700">
          <p className="font-medium">{error}</p>
        </div>
      }

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-5">1. Request Details</h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectDropdown
                label="License *"
                value={formData.licenseId}
                onChange={(event) => setFormData((prev) => ({ ...prev, licenseId: event.target.value, productId: '', batchId: '' }))}
                options={licenseOptions}
                error={formErrors.licenseId}
                required />
              

              <SelectDropdown
                label="Product *"
                value={formData.productId}
                onChange={(event) => setFormData((prev) => ({ ...prev, productId: event.target.value, batchId: '' }))}
                options={filteredProductOptions}
                error={formErrors.productId}
                required />
              

              <SelectDropdown
                label="Verified Batch *"
                value={formData.batchId}
                onChange={(event) => setFormData((prev) => ({ ...prev, batchId: event.target.value }))}
                options={batchOptions}
                error={formErrors.batchId}
                required />
              

              <Input
                label="Quantity Requested *"
                type="number"
                min="1"
                step="1"
                value={formData.quantityRequested}
                onChange={(event) => setFormData((prev) => ({ ...prev, quantityRequested: event.target.value }))}
                error={formErrors.quantityRequested}
                placeholder="Enter quantity"
                required />
              
            </div>

            {formData.licenseId && formData.productId && batchOptions.length <= 1 &&
            <div className="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                No verified batches found for the selected license and product.
              </div>
            }

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Link to="/manufacturer/stamp-requests">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" loading={saving}>Submit Request</Button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Available Free Stamps</span>
                <span className="font-medium text-gray-900 inline-flex items-center justify-end gap-2 min-w-[4rem]">
                  {stampCountLoading ?
                  <LoadingSpinner inline size="sm" className="text-primary-600" /> :

                  formatNumber(availableStampCount)
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Selected Batch</span>
                <span className="font-medium text-gray-900">{selectedBatch?.batchNo || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Batch Units</span>
                <span className="font-medium text-gray-900">{selectedBatch ? formatNumber(selectedBatch.unitsProduced || 0) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Request Quantity</span>
                <span className="font-medium text-gray-900">{formData.quantityRequested ? formatNumber(formData.quantityRequested) : '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Initial Status</span>
                <Badge variant="warning">PENDING</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);

};

export default CreateStampRequest;