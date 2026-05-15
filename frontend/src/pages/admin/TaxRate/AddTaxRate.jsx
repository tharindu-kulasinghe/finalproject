import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import SelectDropdown from '../../../components/common/SelectDropdown';
import Textarea from '../../../components/common/Textarea';
import taxRateApi from '../../../services/taxRateApi';
import { TAX_RATE_CATEGORY_OPTIONS } from './taxRateUtils';

const createEmptyForm = () => ({
  category: 'SPIRITS',
  ratePerLiter: '',
  ratePerUnit: '',
  legalReference: '',
  effectiveFrom: '',
  effectiveTo: ''
});

const AdminAddTaxRate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState(createEmptyForm());

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.category) {
      nextErrors.category = 'Category is required';
    }

    if (!formData.effectiveFrom) {
      nextErrors.effectiveFrom = 'Effective from date is required';
    }

    const hasPerLiter = formData.ratePerLiter !== '' && !Number.isNaN(Number(formData.ratePerLiter));
    const hasPerUnit = formData.ratePerUnit !== '' && !Number.isNaN(Number(formData.ratePerUnit));

    if (!hasPerLiter && !hasPerUnit) {
      nextErrors.rate = 'Provide at least one rate: per liter or per unit';
    }

    if (formData.ratePerLiter !== '' && Number(formData.ratePerLiter) < 0) {
      nextErrors.ratePerLiter = 'Rate per liter cannot be negative';
    }

    if (formData.ratePerUnit !== '' && Number(formData.ratePerUnit) < 0) {
      nextErrors.ratePerUnit = 'Rate per unit cannot be negative';
    }

    if (formData.effectiveTo && formData.effectiveFrom && formData.effectiveTo < formData.effectiveFrom) {
      nextErrors.effectiveTo = 'Effective to date cannot be earlier than effective from date';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      await taxRateApi.createTaxRate({
        category: formData.category,
        ratePerLiter: formData.ratePerLiter === '' ? null : Number(formData.ratePerLiter),
        ratePerUnit: formData.ratePerUnit === '' ? null : Number(formData.ratePerUnit),
        legalReference: formData.legalReference.trim() || null,
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo || null
      });

      toast.success('Tax rate created successfully');
      navigate('/admin/tax-rates');
    } catch (error) {
      console.error('Failed to create tax rate', error);
      const message = error.response?.data?.message || 'Failed to create tax rate. Please try again.';
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(createEmptyForm());
    setErrors({});
    setSubmitError('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Tax Rate"
        description="Create a new duty and excise tax rate rule"
        actions={
        <Link to="/admin/tax-rates">
            <Button variant="outline">Back to Tax Rates</Button>
          </Link>
        } />
      

      {submitError &&
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-700">
            <p className="font-medium">{submitError}</p>
          </div>
        </div>
      }

      <div className="border border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tax Rate Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectDropdown
                label="Category *"
                value={formData.category}
                onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
                options={TAX_RATE_CATEGORY_OPTIONS}
                error={errors.category}
                required />
              
              <Input
                label="Rate Per Liter"
                type="number"
                step="0.01"
                min="0"
                value={formData.ratePerLiter}
                onChange={(event) => setFormData((prev) => ({ ...prev, ratePerLiter: event.target.value }))}
                placeholder="0.00"
                error={errors.ratePerLiter} />
              
              <Input
                label="Rate Per Unit"
                type="number"
                step="0.01"
                min="0"
                value={formData.ratePerUnit}
                onChange={(event) => setFormData((prev) => ({ ...prev, ratePerUnit: event.target.value }))}
                placeholder="0.00"
                error={errors.ratePerUnit} />
              
            </div>

            {errors.rate && <p className="text-sm text-red-600 mt-2">{errors.rate}</p>}
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Validity & Legal Reference</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Effective From *"
                type="date"
                value={formData.effectiveFrom}
                onChange={(event) => setFormData((prev) => ({ ...prev, effectiveFrom: event.target.value }))}
                error={errors.effectiveFrom}
                required />
              
              <Input
                label="Effective To"
                type="date"
                value={formData.effectiveTo}
                onChange={(event) => setFormData((prev) => ({ ...prev, effectiveTo: event.target.value }))}
                error={errors.effectiveTo} />
              
            </div>

            <div className="mt-4">
              <Textarea
                label="Legal Reference"
                value={formData.legalReference}
                onChange={(event) => setFormData((prev) => ({ ...prev, legalReference: event.target.value }))}
                placeholder="Optional legal act, circular, or gazette details"
                rows={3} />
              
            </div>
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
                loading={loading}
                className="flex-1 sm:flex-none">
                
                Save Tax Rate
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>);

};

export default AdminAddTaxRate;