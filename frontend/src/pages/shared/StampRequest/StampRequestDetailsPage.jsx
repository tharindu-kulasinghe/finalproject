import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import stampApi from '../../../services/stampApi';
import getStatusColor from '../../../utils/getStatusColor';
import { formatDate } from '../../../utils/formatDate';
import { formatNumber } from '../../../utils/formatCurrency';
import { canReviewRequest, manufacturerLabel, reviewerLabel } from './stampRequestUtils';

const StampRequestDetailsPage = ({ basePath, title, canEdit = true }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRequest = useCallback(async () => {
    setLoading(true);
    try {
      const response = await stampApi.getStampRequestById(id);
      setRequest(response.data?.data || null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load stamp request details');
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner text="Loading stamp request details..." />
      </div>);

  }

  if (!request) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <p className="text-gray-500">Stamp request not found</p>
        <Link to={basePath}>
          <Button variant="outline">Back to Stamp Requests</Button>
        </Link>
      </div>);

  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${title} ${request.requestNo || ''}`}
        description="Review complete request lifecycle with manufacturer and verifier details"
        actions={
        <div className="flex flex-wrap gap-2">
            {canEdit &&
          <Button variant="outline" onClick={() => navigate(`${basePath}/${request.id}/edit`)}>Edit Request</Button>
          }
            <Button variant="outline" onClick={() => navigate(basePath)}>Back to Requests</Button>
          </div>
        } />
      

      <div className="text-sm text-gray-500">
        <Link to={basePath} className="hover:text-gray-700">Stamp Requests</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">Details</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Request Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Request No</p>
                <p className="font-medium font-mono text-gray-900">{request.requestNo || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <Badge variant={getStatusColor(request.status)}>{request.status}</Badge>
              </div>
              <div>
                <p className="text-gray-500">Manufacturer</p>
                <p className="font-medium text-gray-900">{manufacturerLabel(request)}</p>
              </div>
              <div>
                <p className="text-gray-500">Requested By</p>
                <p className="font-medium text-gray-900">{request.requestedBy?.fullName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Verified By</p>
                <p className="font-medium text-gray-900">{reviewerLabel(request)}</p>
              </div>
              <div>
                <p className="text-gray-500">Requested On</p>
                <p className="font-medium text-gray-900">{formatDate(request.requestedAt || request.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Product and License</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Product</p>
                <p className="font-medium text-gray-900">{request.product?.name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Product Code</p>
                <p className="font-medium font-mono text-gray-900">{request.product?.code || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Category</p>
                <p className="font-medium text-gray-900">{request.product?.category || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">License Number</p>
                <p className="font-medium font-mono text-gray-900">{request.license?.licenseNumber || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">License Type</p>
                <p className="font-medium text-gray-900">{request.license?.type || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Batch</p>
                <p className="font-medium font-mono text-gray-900">{request.batch?.batchNo || '-'}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">3. Quantity and Decision</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="border border-gray-200 p-3">
                <p className="text-gray-500">Requested</p>
                <p className="text-xl font-semibold text-gray-900">{formatNumber(request.quantityRequested || 0)}</p>
              </div>
              <div className="border border-gray-200 p-3">
                <p className="text-gray-500">Approved</p>
                <p className="text-xl font-semibold text-emerald-700">{request.quantityApproved ? formatNumber(request.quantityApproved) : '-'}</p>
              </div>
              <div className="border border-gray-200 p-3">
                <p className="text-gray-500">Issued</p>
                <p className="text-xl font-semibold text-blue-700">{request.quantityIssued ? formatNumber(request.quantityIssued) : '-'}</p>
              </div>
            </div>
            <div className="mt-4 text-sm">
              <p className="text-gray-500">Decision Reason</p>
              <p className="font-medium text-gray-900 whitespace-pre-wrap">{request.reason || '-'}</p>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">4. Issued Stamps (Preview)</h3>
            {Array.isArray(request.taxStamps) && request.taxStamps.length > 0 ?
            <div className="overflow-x-auto border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2">Serial</th>
                      <th className="text-left px-3 py-2">Code</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-left px-3 py-2">Assigned At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.taxStamps.map((stamp) =>
                  <tr key={stamp.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-mono text-xs text-gray-900">{stamp.serialNo || '-'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-900">{stamp.codeValue || '-'}</td>
                        <td className="px-3 py-2"><Badge variant={getStatusColor(stamp.status)}>{stamp.status}</Badge></td>
                        <td className="px-3 py-2">{formatDate(stamp.assignedAt || stamp.generatedAt)}</td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div> :

            <p className="text-sm text-gray-500">No generated stamps linked to this request yet.</p>
            }
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Manufacturer</span>
                <span className="font-medium text-gray-900">{manufacturerLabel(request)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Verifier</span>
                <span className="font-medium text-gray-900">{reviewerLabel(request)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-medium text-gray-900">{request.status || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Requested</span>
                <span className="font-medium text-gray-900">{formatNumber(request.quantityRequested || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Approved</span>
                <span className="font-medium text-gray-900">{request.quantityApproved ? formatNumber(request.quantityApproved) : '-'}</span>
              </div>
            </div>
          </div>

          {canEdit && canReviewRequest(request.status) &&
          <div className="border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm text-amber-800 font-medium">This request is waiting for admin/officer verification.</p>
              <Button className="mt-3" onClick={() => navigate(`${basePath}/${request.id}/edit`)}>Go to Edit Page</Button>
            </div>
          }
        </div>
      </div>
    </div>);

};

export default StampRequestDetailsPage;