import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FileText, Package, User } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Badge from '../../../components/common/Badge';
import Input from '../../../components/common/Input';
import SelectDropdown from '../../../components/common/SelectDropdown';
import Textarea from '../../../components/common/Textarea';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { formatNumber } from '../../../utils/formatCurrency';
import api from '../../../services/api';
import distributionApi from '../../../services/distributionApi';

const emptyForm = {
  receiverId: '',
  productId: '',
  batchId: '',
  quantity: '',
  unit: 'UNITS',
  notes: ''
};

const getAutoQuantityFromBatch = (batch, unit) => {
  if (!batch) return '';

  const unitsProduced = Number(batch.unitsProduced);
  const outputLiters = Number(batch.outputLiters);

  if (unit === 'LITERS' && Number.isFinite(outputLiters) && outputLiters > 0) {
    return String(outputLiters);
  }

  if (Number.isFinite(unitsProduced) && unitsProduced > 0) {
    return String(unitsProduced);
  }

  if (Number.isFinite(outputLiters) && outputLiters > 0) {
    return String(outputLiters);
  }

  return '';
};

const getBatchCapacity = (batch, unit) => {
  if (!batch) return 0;

  const normalizedUnit = String(unit || 'UNITS').toUpperCase();
  const unitsProduced = Number(batch.unitsProduced || 0);
  const outputLiters = Number(batch.outputLiters || 0);

  if (normalizedUnit === 'LITERS') {
    if (Number.isFinite(outputLiters) && outputLiters > 0) return outputLiters;
    if (Number.isFinite(unitsProduced) && unitsProduced > 0) return unitsProduced;
    return 0;
  }

  if (Number.isFinite(unitsProduced) && unitsProduced > 0) return unitsProduced;
  if (Number.isFinite(outputLiters) && outputLiters > 0) return outputLiters;
  return 0;
};

const AddDistribution = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const [distributors, setDistributors] = useState([]);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [distributorsRes, productsRes] = await Promise.all([
        api.get('/manufacturers/available/distributors'),
        api.get('/products')]
        );

        setDistributors(distributorsRes.data?.data || []);
        setProducts(productsRes.data?.data?.products || productsRes.data?.products || []);
      } catch (error) {
        console.error('Failed to load distribution form options:', error);
        setDistributors([]);
        setProducts([]);
        setSubmitError('Failed to load linked distributors or products. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!formData.productId) {
      setBatches([]);
      setFormData((prev) => ({ ...prev, batchId: '' }));
      return;
    }

    const loadProductBatches = async () => {
      setBatchLoading(true);
      try {
        const [batchesResponse, ordersResponse] = await Promise.all([
        api.get(`/batches?productId=${formData.productId}&status=VERIFIED&limit=100`),
        distributionApi.getOrders({ productId: formData.productId })]
        );

        const productBatches = batchesResponse.data?.data?.batches || batchesResponse.data?.batches || [];
        const existingOrders = ordersResponse.data?.data || [];
        const distributedByBatch = existingOrders.reduce((acc, order) => {
          if (!order?.batchId) return acc;
          if (['CANCELLED', 'REJECTED'].includes(order.status)) return acc;

          const qty = Number(order.quantity || 0);
          if (!Number.isFinite(qty) || qty <= 0) return acc;

          acc[order.batchId] = (acc[order.batchId] || 0) + qty;
          return acc;
        }, {});

        const availableBatches = productBatches.
        map((batch) => {
          const capacity = getBatchCapacity(batch, formData.unit);
          const distributed = distributedByBatch[batch.id] || 0;
          const availableQuantity = Math.max(capacity - distributed, 0);
          return {
            ...batch,
            availableQuantity
          };
        }).
        filter((batch) => batch.availableQuantity > 0);

        setBatches(availableBatches);

        setFormData((prev) => {
          if (!prev.batchId) return prev;
          const stillAvailable = availableBatches.some((batch) => batch.id === prev.batchId);
          if (stillAvailable) return prev;
          return { ...prev, batchId: '', quantity: '' };
        });
      } catch (error) {
        console.error('Failed to load product batches:', error);
        setBatches([]);
      } finally {
        setBatchLoading(false);
      }
    };

    loadProductBatches();
  }, [formData.productId, formData.unit]);

  const receivers = useMemo(() => {
    return distributors.map((item) => ({ ...item, receiverType: 'DISTRIBUTOR' }));
  }, [distributors]);

  const selectedReceiver = useMemo(
    () => receivers.find((item) => item.id === formData.receiverId) || null,
    [receivers, formData.receiverId]
  );

  useEffect(() => {
    const receiverIdFromQuery = searchParams.get('receiverId');
    if (!receiverIdFromQuery || !receivers.length) return;

    const exists = receivers.some((item) => item.id === receiverIdFromQuery);
    if (!exists) return;

    setFormData((prev) => ({
      ...prev,
      receiverId: prev.receiverId || receiverIdFromQuery
    }));
  }, [searchParams, receivers]);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === formData.productId) || null,
    [products, formData.productId]
  );

  const selectedBatch = useMemo(
    () => batches.find((item) => item.id === formData.batchId) || null,
    [batches, formData.batchId]
  );

  const selectedBatchAvailableQuantity = Number(selectedBatch?.availableQuantity || 0);

  useEffect(() => {
    if (!selectedBatch) return;

    const autoQuantity = getAutoQuantityFromBatch(selectedBatch, formData.unit);
    const nextQuantity = selectedBatchAvailableQuantity > 0 ?
    String(Math.min(Number(autoQuantity || 0), selectedBatchAvailableQuantity) || selectedBatchAvailableQuantity) :
    autoQuantity;

    if (!nextQuantity) return;

    setFormData((prev) => {
      if (prev.quantity === nextQuantity) return prev;
      return { ...prev, quantity: nextQuantity };
    });
  }, [selectedBatch, selectedBatchAvailableQuantity, formData.unit]);

  const receiverOptions = receivers.map((receiver) => ({
    value: receiver.id,
    label: `${receiver.companyName || receiver.fullName} (${receiver.receiverType})`
  }));

  const productOptions = products.map((product) => ({
    value: product.id,
    label: `${product.name || '-'} (${product.code || '-'})`
  }));

  const batchOptions = batches.map((batch) => ({
    value: batch.id,
    label: `${batch.batchNo || '-'} (${new Date(batch.productionDate).toLocaleDateString()}) - Available: ${formatNumber(batch.availableQuantity || 0)}`
  }));

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.receiverId) {
      nextErrors.receiverId = 'Receiver is required';
    }

    if (!selectedReceiver?.license?.id) {
      nextErrors.receiverId = 'Selected receiver does not have an active license';
    }

    if (!formData.productId) {
      nextErrors.productId = 'Product is required';
    }

    if (!formData.batchId) {
      nextErrors.batchId = 'Batch is required';
    }

    if (!formData.quantity) {
      nextErrors.quantity = 'Quantity is required';
    }

    const numericQuantity = Number(formData.quantity);
    if (formData.quantity && (!Number.isFinite(numericQuantity) || numericQuantity <= 0)) {
      nextErrors.quantity = 'Quantity must be a positive number';
    }

    if (selectedBatch && numericQuantity > selectedBatchAvailableQuantity) {
      nextErrors.quantity = `Quantity exceeds selected batch availability (${formatNumber(selectedBatchAvailableQuantity)})`;
    }

    if (!formData.unit) {
      nextErrors.unit = 'Unit is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await distributionApi.createDistribution({
        receiverId: formData.receiverId,
        receiverLicenseId: selectedReceiver.license.id,
        productId: formData.productId,
        batchId: formData.batchId || null,
        quantity: Number(formData.quantity),
        unit: formData.unit,
        notes: formData.notes.trim() || null
      });

      toast.success('Distribution order created successfully');
      navigate('/manufacturer/distributions');
    } catch (error) {
      console.error('Failed to create distribution order:', error);
      const message = error.response?.data?.message || 'Failed to create distribution order';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(emptyForm);
    setErrors({});
    setSubmitError('');
    setBatches([]);
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
        title="Add Distribution Order"
        description="Create a new order for your linked distributors with valid active licenses"
        actions={
        <Button variant="outline" onClick={() => navigate('/manufacturer/distributions')}>
            Back to Distributions
          </Button>
        } />
      

      {submitError &&
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-medium">{submitError}</p>
        </div>
      }

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 border border-gray-200 bg-white">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <User className="text-info-600" size={20} />
                <h3 className="text-lg font-medium text-gray-900">Receiver Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectDropdown
                  label="Linked Distributor *"
                  value={formData.receiverId}
                  onChange={(event) => setFormData((prev) => ({ ...prev, receiverId: event.target.value }))}
                  options={[{ value: '', label: 'Select linked distributor' }, ...receiverOptions]}
                  error={errors.receiverId}
                  required />
                

                <Input
                  label="Receiver License"
                  value={selectedReceiver?.license?.licenseNumber || '-'}
                  disabled />
                
              </div>

              {selectedReceiver &&
              <div className="mt-4 p-4 border border-info-200 bg-info-50 rounded-lg text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <p><span className="text-info-900 font-medium">Name:</span> {selectedReceiver.fullName || '-'}</p>
                    <p><span className="text-info-900 font-medium">Company:</span> {selectedReceiver.companyName || '-'}</p>
                    <p><span className="text-info-900 font-medium">Type:</span> {selectedReceiver.receiverType}</p>
                    <p><span className="text-info-900 font-medium">Email:</span> {selectedReceiver.email || '-'}</p>
                  </div>
                </div>
              }
            </div>

            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="text-success-600" size={20} />
                <h3 className="text-lg font-medium text-gray-900">Product Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectDropdown
                  label="Product *"
                  value={formData.productId}
                  onChange={(event) => setFormData((prev) => ({ ...prev, productId: event.target.value }))}
                  options={[{ value: '', label: 'Select product' }, ...productOptions]}
                  error={errors.productId}
                  required />
                

                <SelectDropdown
                  label="Batch *"
                  value={formData.batchId}
                  onChange={(event) => setFormData((prev) => ({ ...prev, batchId: event.target.value }))}
                  options={[{ value: '', label: 'Select batch' }, ...batchOptions]}
                  error={errors.batchId}
                  disabled={!formData.productId || batchLoading}
                  loading={batchLoading}
                  required />
                

                {formData.productId && !batchLoading &&
                <p className="md:col-span-2 -mt-2 text-xs text-gray-500">
                    Batches with zero available quantity are hidden from this list.
                  </p>
                }

                {selectedBatch &&
                <Input
                  label="Batch Available Quantity"
                  value={formatNumber(selectedBatchAvailableQuantity)}
                  disabled />

                }

                <Input
                  label="Quantity *"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(event) => setFormData((prev) => ({ ...prev, quantity: event.target.value }))}
                  error={errors.quantity}
                  required />
                

                {selectedBatch &&
                <p className="md:col-span-2 -mt-2 text-xs text-gray-500">
                    Quantity is auto-filled based on selected batch remaining quantity and can be adjusted.
                  </p>
                }

              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="text-primary-600" size={20} />
                <h3 className="text-lg font-medium text-gray-900">Additional Notes</h3>
              </div>
              <Textarea
                label="Notes"
                value={formData.notes}
                onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                rows={4}
                placeholder="Optional instructions for this distribution" />
              
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                <span className="font-medium">Required fields are marked with *</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1 sm:flex-none">
                  
                  Reset Form
                </Button>
                <Button
                  type="submit"
                  loading={submitting}
                  className="flex-1 sm:flex-none">
                  
                  Save Distribution
                </Button>
              </div>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Linked Distributors</span>
                <span className="font-medium text-gray-900">{receivers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Products</span>
                <span className="font-medium text-gray-900">{products.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Selected Product</span>
                <span className="font-medium text-gray-900">{selectedProduct?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Selected Batch</span>
                <span className="font-medium text-gray-900">{selectedBatch?.batchNo || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Quantity</span>
                <span className="font-medium text-gray-900">{formData.quantity ? formatNumber(formData.quantity) : '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Order Status</span>
                <Badge variant="warning">PENDING</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);

};

export default AddDistribution;