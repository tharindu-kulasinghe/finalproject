import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import SelectDropdown from '../../../components/common/SelectDropdown';
import Textarea from '../../../components/common/Textarea';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import batchApi from '../../../services/batchApi';
import productApi from '../../../services/productApi';

const EMPTY_FORM = {
  productId: '',
  licenseId: '',
  productionDate: '',
  rawSpiritInputLiters: '',
  outputLiters: '',
  unitsProduced: '',
  wastageLiters: '',
  notes: ''
};

const toNumberOrUndefined = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const AddBatch = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productApi.getProducts({ isActive: 'true', limit: 200 });
      setProducts(res.data?.data?.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
      toast.error(err.response?.data?.message || 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const productOptions = useMemo(
    () => [
    { value: '', label: 'Select Product' },
    ...products.map((item) => ({
      value: item.id,
      label: `${item.code} - ${item.name} (${item.category})`
    }))],

    [products]
  );

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === formData.productId) || null,
    [products, formData.productId]
  );

  useEffect(() => {
    if (!selectedProduct) return;
    setFormData((prev) => {
      if (prev.licenseId === selectedProduct.licenseId) return prev;
      return { ...prev, licenseId: selectedProduct.licenseId };
    });
  }, [selectedProduct]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.productId) {
      toast.error('Please select a product');
      return;
    }

    if (!formData.productionDate) {
      toast.error('Please select a production date');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        productId: formData.productId,
        licenseId: formData.licenseId,
        productionDate: formData.productionDate,
        rawSpiritInputLiters: toNumberOrUndefined(formData.rawSpiritInputLiters),
        outputLiters: toNumberOrUndefined(formData.outputLiters),
        unitsProduced: toNumberOrUndefined(formData.unitsProduced),
        wastageLiters: toNumberOrUndefined(formData.wastageLiters),
        notes: formData.notes || undefined
      };

      const res = await batchApi.createBatch(payload);
      const createdBatch = res.data?.data;

      toast.success('Batch created successfully');
      if (createdBatch?.id) {
        navigate(`/manufacturer/batches/${createdBatch.id}`);
      } else {
        navigate('/manufacturer/batches');
      }
    } catch (err) {
      console.error('Failed to create batch:', err);
      toast.error(err.response?.data?.message || 'Failed to create batch');
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
        title="Add Daily Batch"
        description="Create a new daily production batch entry"
        actions={
        <Link to="/manufacturer/batches">
            <Button variant="outline">Back to Batches</Button>
          </Link>
        } />
      

      <div className="text-sm text-gray-500">
        <Link to="/manufacturer/batches" className="hover:text-gray-700">Batches</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">Add</span>
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectDropdown
            label="Product"
            value={formData.productId}
            onChange={(e) => setFormData((prev) => ({ ...prev, productId: e.target.value }))}
            options={productOptions}
            required />
          

          {!!selectedProduct &&
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 border border-gray-200 bg-gray-50 p-3 text-sm">
              <p><span className="text-gray-500">Category:</span> <span className="font-medium text-gray-900">{selectedProduct.category || '-'}</span></p>
              <p><span className="text-gray-500">License:</span> <span className="font-medium text-gray-900">{selectedProduct.license?.licenseNumber || '-'}</span></p>
            </div>
          }

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Production Date"
              type="date"
              value={formData.productionDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, productionDate: e.target.value }))}
              required />
            
            <Input
              label="Raw Spirit Input (L)"
              type="number"
              step="0.01"
              value={formData.rawSpiritInputLiters}
              onChange={(e) => setFormData((prev) => ({ ...prev, rawSpiritInputLiters: e.target.value }))}
              placeholder="Optional" />
            
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Output (L)"
              type="number"
              step="0.01"
              value={formData.outputLiters}
              onChange={(e) => setFormData((prev) => ({ ...prev, outputLiters: e.target.value }))}
              required />
            
            <Input
              label="Units Produced"
              type="number"
              value={formData.unitsProduced}
              onChange={(e) => setFormData((prev) => ({ ...prev, unitsProduced: e.target.value }))}
              required />
            
            <Input
              label="Wastage (L)"
              type="number"
              step="0.01"
              value={formData.wastageLiters}
              onChange={(e) => setFormData((prev) => ({ ...prev, wastageLiters: e.target.value }))}
              placeholder="Optional" />
            
          </div>

          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            rows={4}
            placeholder="Add batch notes, process details, or correction remarks" />
          

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/manufacturer/batches')}>
              
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={saving}>
              Create Batch
            </Button>
          </div>
        </form>
      </div>
    </div>);

};

export default AddBatch;