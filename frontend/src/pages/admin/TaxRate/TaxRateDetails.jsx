import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Badge from '../../../components/common/Badge';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import taxRateApi from '../../../services/taxRateApi';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import { formatCategoryLabel } from './taxRateUtils';

const AdminTaxRateDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [taxRate, setTaxRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchTaxRate = useCallback(async () => {
    setLoading(true);
    try {
      const response = await taxRateApi.getTaxRateById(id);
      setTaxRate(response.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch tax rate details', error);
      setTaxRate(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTaxRate();
  }, [fetchTaxRate]);

  const handleToggleStatus = async () => {
    if (!taxRate?.id) return;

    setToggling(true);
    try {
      await taxRateApi.toggleTaxRate(taxRate.id);
      fetchTaxRate();
    } catch (error) {
      console.error('Failed to toggle tax rate status', error);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner />
      </div>);

  }

  if (!taxRate) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Tax Rate Details"
          description="Tax rate record was not found"
          actions={
          <Link to="/admin/tax-rates">
              <Button variant="outline">Back to Tax Rates</Button>
            </Link>
          } />
        
        <div className="border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">The requested tax rate does not exist or is no longer accessible.</p>
        </div>
      </div>);

  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Tax Rate - ${formatCategoryLabel(taxRate.category)}`}
        description="Review duty rate details and lifecycle information"
        actions={
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(`/admin/tax-rates/${id}/edit`)}>
              Edit Tax Rate
            </Button>
            <Button variant="outline" loading={toggling} onClick={handleToggleStatus}>
              {taxRate.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Link to="/admin/tax-rates">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        } />
      

      <div className="text-sm text-gray-500">
        <Link to="/admin/tax-rates" className="hover:text-gray-700">Tax Rates</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">Details</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Category & Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Category</p>
                <p className="font-medium text-gray-900">{formatCategoryLabel(taxRate.category)}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <Badge variant={taxRate.isActive ? 'success' : 'default'}>
                  {taxRate.isActive ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
              </div>
              <div>
                <p className="text-gray-500">Created</p>
                <p className="font-medium text-gray-900">{formatDate(taxRate.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Rate Values</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Rate Per Liter</p>
                <p className="font-medium text-gray-900">
                  {taxRate.ratePerLiter != null ? formatCurrency(taxRate.ratePerLiter) : '-'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Rate Per Unit</p>
                <p className="font-medium text-gray-900">
                  {taxRate.ratePerUnit != null ? formatCurrency(taxRate.ratePerUnit) : '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">3. Validity & Legal Basis</h3>
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-gray-500">Effective From:</span>{' '}
                <span className="font-medium text-gray-900">{formatDate(taxRate.effectiveFrom)}</span>
              </p>
              <p>
                <span className="text-gray-500">Effective To:</span>{' '}
                <span className="font-medium text-gray-900">{taxRate.effectiveTo ? formatDate(taxRate.effectiveTo) : 'Open ended'}</span>
              </p>
              <p>
                <span className="text-gray-500">Legal Reference:</span>{' '}
                <span className="font-medium text-gray-900 whitespace-pre-wrap">{taxRate.legalReference || '-'}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Category</span>
                <span className="font-medium text-gray-900 text-right">{formatCategoryLabel(taxRate.category)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Effective</span>
                <span className="font-medium text-gray-900 text-right">{formatDate(taxRate.effectiveFrom)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Status</span>
                <span className="font-medium text-gray-900 text-right">{taxRate.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Per Liter</span>
                <span className="font-medium text-gray-900 text-right">
                  {taxRate.ratePerLiter != null ? formatCurrency(taxRate.ratePerLiter) : '-'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Per Unit</span>
                <span className="font-medium text-gray-900 text-right">
                  {taxRate.ratePerUnit != null ? formatCurrency(taxRate.ratePerUnit) : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);

};

export default AdminTaxRateDetails;