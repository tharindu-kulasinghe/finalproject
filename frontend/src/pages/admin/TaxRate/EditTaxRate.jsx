import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import SelectDropdown from '../../../components/common/SelectDropdown';
import Textarea from '../../../components/common/Textarea';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import taxRateApi from '../../../services/taxRateApi';
import { getCategoryOptionsWithCurrent } from './taxRateUtils';

const createEmptyForm = () => ({
  category: 'SPIRITS',
  ratePerLiter: '',
  ratePerUnit: '',
  legalReference: '',
  effectiveFrom: '',
  effectiveTo: '',
  isActive: true
});

const toDateInputValue = (dateValue) => {
  if (!dateValue) return '';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
};

const AdminEditTaxRate = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState(createEmptyForm());

  const categoryOptions = useMemo(
    () => getCategoryOptionsWithCurrent(formData.category),
    [formData.category]
  );

  const fetchTaxRate = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await taxRateApi.getTaxRateById(id);
      const data = response.data?.data;

      if (!data) {
        setError('Tax rate not found');
        return;
      }

      setFormData({
        category: data.category || 'SPIRITS',
        ratePerLiter: data.ratePerLiter ?? '',
        ratePerUnit: data.ratePerUnit ?? '',
        legalReference: data.legalReference || '',
        effectiveFrom: toDateInputValue(data.effectiveFrom),
        effectiveTo: toDateInputValue(data.effectiveTo),
        isActive: Boolean(data.isActive)
      });
    } catch (fetchError) {
      console.error('Failed to load tax rate for editing', fetchError);
      setError(fetchError.response?.data?.message || 'Failed to load tax rate details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTaxRate();
  }, [fetchTaxRate]);

  const validateForm = () => {
    if (!formData.category) {
      return 'Category is required';
    }

    if (!formData.effectiveFrom) {
      return 'Effective from date is required';
    }

    const hasPerLiter = formData.ratePerLiter !== '' && !Number.isNaN(Number(formData.ratePerLiter));
    const hasPerUnit = formData.ratePerUnit !== '' && !Number.isNaN(Number(formData.ratePerUnit));

    if (!hasPerLiter && !hasPerUnit) {
      return 'Provide at least one rate: per liter or per unit';
    }

    if (formData.effectiveTo && formData.effectiveTo < formData.effectiveFrom) {
      return 'Effective to date cannot be earlier than effective from date';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    const validationError = validateForm();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSaving(true);

    try {
      await taxRateApi.updateTaxRate(id, {
        category: formData.category,
        ratePerLiter: formData.ratePerLiter === '' ? null : Number(formData.ratePerLiter),
        ratePerUnit: formData.ratePerUnit === '' ? null : Number(formData.ratePerUnit),
        legalReference: formData.legalReference.trim() || null,
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo || null,
        isActive: formData.isActive
      });

      navigate(`/admin/tax-rates/${id}`);
    } catch (submitErr) {
      console.error('Failed to update tax rate', submitErr);
      setSubmitError(submitErr.response?.data?.message || 'Failed to update tax rate');
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

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Edit Tax Rate"
          description="Unable to load selected tax rate"
          actions={
          <Link to="/admin/tax-rates">
              <Button variant="outline">Back to Tax Rates</Button>
            </Link>
          } />
        
        <div className="border border-red-200 bg-red-50 p-4 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      </div>);

  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Tax Rate"
        description="Update tax rate values, legal reference, and validity period"
        actions={
        <Link to={`/admin/tax-rates/${id}`}>
            <Button variant="outline">Back to Details</Button>
          </Link>
        } />
      

      {submitError &&
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {submitError}
        </div>
      }

      <div className="border border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tax Rate Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectDropdown
                label="Category *"
                value={formData.category}
                onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
                options={categoryOptions}
                required />
              
              <Input
                label="Rate Per Liter"
                type="number"
                step="0.01"
                min="0"
                value={formData.ratePerLiter}
                onChange={(event) => setFormData((prev) => ({ ...prev, ratePerLiter: event.target.value }))}
                placeholder="0.00" />
              
              <Input
                label="Rate Per Unit"
                type="number"
                step="0.01"
                min="0"
                value={formData.ratePerUnit}
                onChange={(event) => setFormData((prev) => ({ ...prev, ratePerUnit: event.target.value }))}
                placeholder="0.00" />
              
              <Input
                label="Effective From *"
                type="date"
                value={formData.effectiveFrom}
                onChange={(event) => setFormData((prev) => ({ ...prev, effectiveFrom: event.target.value }))}
                required />
              
              <Input
                label="Effective To"
                type="date"
                value={formData.effectiveTo}
                onChange={(event) => setFormData((prev) => ({ ...prev, effectiveTo: event.target.value }))} />
              
              <SelectDropdown
                label="Status"
                value={formData.isActive ? 'ACTIVE' : 'INACTIVE'}
                onChange={(event) => setFormData((prev) => ({ ...prev, isActive: event.target.value === 'ACTIVE' }))}
                options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' }]
                } />
              
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Legal Reference</h3>
            <Textarea
              label="Reference Details"
              value={formData.legalReference}
              onChange={(event) => setFormData((prev) => ({ ...prev, legalReference: event.target.value }))}
              rows={4}
              placeholder="Optional legal act, circular, or gazette details" />
            
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              <span className="font-medium">Required fields are marked with *</span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => navigate(`/admin/tax-rates/${id}`)}>
                
                Cancel
              </Button>
              <Button type="submit" loading={saving} className="flex-1 sm:flex-none">
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>);

};

export default AdminEditTaxRate;