import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import SelectDropdown from '../../components/common/SelectDropdown';
import Textarea from '../../components/common/Textarea';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import distributionApi from '../../services/distributionApi';

const createEmptyForm = () => ({
  receiverId: '',
  productId: '',
  quantity: '',
  notes: ''
});

const DistributorCreateDistribution = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [retailers, setRetailers] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [formData, setFormData] = useState(createEmptyForm());

  useEffect(() => {
    const fetchOptions = async () => {
      setLoading(true);
      try {
        const [retailersRes, stockRes] = await Promise.all([
        distributionApi.getAvailableRetailers(),
        distributionApi.getMyStock()]
        );

        setRetailers(retailersRes.data?.data || []);
        setStockItems(stockRes.data?.data || []);
      } catch (error) {
        console.error('Failed to fetch distribution options', error);
        setRetailers([]);
        setStockItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, []);

  const selectedRetailer = useMemo(
    () => retailers.find((item) => item.id === formData.receiverId) || null,
    [retailers, formData.receiverId]
  );

  const selectedStock = useMemo(
    () => stockItems.find((item) => item.productId === formData.productId) || null,
    [stockItems, formData.productId]
  );

  const availableQuantity = Number(selectedStock?.availableQuantity || 0);

  const retailerOptions = retailers.map((retailer) => ({
    value: retailer.id,
    label: `${retailer.companyName || retailer.fullName} (${retailer.license?.licenseNumber || 'No license'})`
  }));

  const productOptions = stockItems.
  filter((item) => Number(item.availableQuantity || 0) > 0).
  map((item) => ({
    value: item.productId,
    label: `${item.product?.name || 'Unknown'} (${item.product?.code || '-'})`
  }));

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.receiverId) {
      nextErrors.receiverId = 'Retailer is required';
    }

    if (!selectedRetailer?.license?.id) {
      nextErrors.receiverId = 'Selected retailer does not have an active license';
    }

    if (!formData.productId) {
      nextErrors.productId = 'Product is required';
    }

    if (!formData.quantity) {
      nextErrors.quantity = 'Quantity is required';
    }

    const numericQuantity = Number(formData.quantity);
    if (formData.quantity && (!Number.isFinite(numericQuantity) || numericQuantity <= 0)) {
      nextErrors.quantity = 'Quantity must be a positive number';
    }

    if (numericQuantity > availableQuantity) {
      nextErrors.quantity = `Quantity exceeds available stock (${availableQuantity})`;
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
        receiverLicenseId: selectedRetailer.license.id,
        productId: formData.productId,
        quantity: Number(formData.quantity),
        unit: 'UNITS',
        notes: formData.notes.trim() || null
      });

      toast.success('Distribution order created successfully');
      navigate('/distributor/distribution-history');
    } catch (error) {
      console.error('Failed to create distribution order', error);
      const message = error.response?.data?.message || 'Failed to create distribution order';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(createEmptyForm());
    setErrors({});
    setSubmitError('');
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
        title="Create Distribution Order"
        description="Distribute available stock to licensed retailers"
        actions={
        <Button variant="outline" onClick={() => navigate('/distributor/distribution-history')}>
            Back to History
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
              <h3 className="text-lg font-medium text-gray-900 mb-4">Distribution Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectDropdown
                  label="Retailer *"
                  value={formData.receiverId}
                  onChange={(event) => setFormData((prev) => ({ ...prev, receiverId: event.target.value }))}
                  options={[{ value: '', label: 'Select retailer' }, ...retailerOptions]}
                  error={errors.receiverId}
                  required />
                

                <Input
                  label="Retailer License"
                  value={selectedRetailer?.license?.licenseNumber || '-'}
                  disabled />
                

                <SelectDropdown
                  label="Product *"
                  value={formData.productId}
                  onChange={(event) => setFormData((prev) => ({ ...prev, productId: event.target.value }))}
                  options={[{ value: '', label: 'Select product' }, ...productOptions]}
                  error={errors.productId}
                  required />
                

                <Input
                  label="Available Stock"
                  value={selectedStock ? `${availableQuantity.toLocaleString()} units` : '-'}
                  disabled />
                

                <Input
                  label="Quantity *"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(event) => setFormData((prev) => ({ ...prev, quantity: event.target.value }))}
                  error={errors.quantity}
                  required />
                
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
              <Textarea
                label="Order Notes"
                value={formData.notes}
                onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                rows={3}
                placeholder="Optional note for this distribution" />
              
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                <span className="font-medium">Required fields are marked with *</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={handleReset}>
                  Reset Form
                </Button>
                <Button type="submit" loading={submitting} className="flex-1 sm:flex-none">
                  Create Order
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
                <span className="text-gray-500">Retailers</span>
                <span className="font-medium text-gray-900">{retailers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Products In Stock</span>
                <span className="font-medium text-gray-900">{productOptions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Selected Availability</span>
                <span className="font-medium text-gray-900">{selectedStock ? availableQuantity.toLocaleString() : '-'}</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Distribution Rules</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>Only active retailers with valid licenses can receive orders.</li>
              <li>Quantity must not exceed your available distributor stock.</li>
              <li>Every order is tracked for dispatch and receipt status.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>);

};

export default DistributorCreateDistribution;