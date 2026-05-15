import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import getStatusColor from '../../utils/getStatusColor';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import { formatNumber } from '../../utils/formatCurrency';
import stampApi from '../../services/stampApi';

const TaxStampDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [stamp, setStamp] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStamp = useCallback(async () => {
    setLoading(true);
    try {
      const response = await stampApi.getTaxStampById(id);
      setStamp(response.data?.data || null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load tax stamp details');
      setStamp(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStamp();
  }, [fetchStamp]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner text="Loading tax stamp details..." />
      </div>);

  }

  if (!stamp) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <p className="text-gray-500">Tax stamp not found</p>
        <Link to="/manufacturer/tax-stamp-history">
          <Button variant="outline">Back to Tax Stamp History</Button>
        </Link>
      </div>);

  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Tax Stamp ${stamp.codeValue || stamp.serialNo || ''}`}
        description="Tax stamp profile, request linkage and verification activity"
        actions={<Button variant="outline" onClick={() => navigate('/manufacturer/tax-stamp-history')}>Back to History</Button>} />
      

      <div className="text-sm text-gray-500">
        <Link to="/manufacturer/tax-stamp-history" className="hover:text-gray-700">Tax Stamp History</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">Details</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Stamp Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Stamp Code</p>
                <p className="font-medium text-gray-900 font-mono">{stamp.codeValue || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Serial Number</p>
                <p className="font-medium text-gray-900 font-mono">{stamp.serialNo || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <Badge variant={getStatusColor(stamp.status)}>{stamp.status || '-'}</Badge>
              </div>
              <div>
                <p className="text-gray-500">Generated At</p>
                <p className="font-medium text-gray-900">{formatDateTime(stamp.generatedAt || stamp.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Assigned At</p>
                <p className="font-medium text-gray-900">{formatDateTime(stamp.assignedAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Expires At</p>
                <p className="font-medium text-gray-900">{formatDate(stamp.expiresAt)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Product and Batch</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Product</p>
                <p className="font-medium text-gray-900">{stamp.product?.name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Product Code</p>
                <p className="font-medium text-gray-900 font-mono">{stamp.product?.code || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Category</p>
                <p className="font-medium text-gray-900">{stamp.product?.category || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Batch No</p>
                <p className="font-medium text-gray-900 font-mono">{stamp.batch?.batchNo || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Production Date</p>
                <p className="font-medium text-gray-900">{formatDate(stamp.batch?.productionDate)}</p>
              </div>
              <div>
                <p className="text-gray-500">Batch Units</p>
                <p className="font-medium text-gray-900">{formatNumber(stamp.batch?.unitsProduced || 0)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">3. Linked Stamp Request</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Request No</p>
                <p className="font-medium text-gray-900 font-mono">{stamp.stampRequest?.requestNo || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Request Status</p>
                <p className="font-medium text-gray-900">{stamp.stampRequest?.status || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Quantity Requested</p>
                <p className="font-medium text-gray-900">{stamp.stampRequest?.quantityRequested != null ? formatNumber(stamp.stampRequest.quantityRequested) : '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Quantity Approved</p>
                <p className="font-medium text-gray-900">{stamp.stampRequest?.quantityApproved != null ? formatNumber(stamp.stampRequest.quantityApproved) : '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Quantity Issued</p>
                <p className="font-medium text-gray-900">{stamp.stampRequest?.quantityIssued != null ? formatNumber(stamp.stampRequest.quantityIssued) : '-'}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">4. Verification Logs</h3>
            {Array.isArray(stamp.verificationLogs) && stamp.verificationLogs.length > 0 ?
            <div className="overflow-x-auto border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2">Verified At</th>
                      <th className="text-left px-3 py-2">Channel</th>
                      <th className="text-left px-3 py-2">Result</th>
                      <th className="text-left px-3 py-2">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stamp.verificationLogs.map((log) =>
                  <tr key={log.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">{formatDateTime(log.verifiedAt)}</td>
                        <td className="px-3 py-2">{log.channel || '-'}</td>
                        <td className="px-3 py-2">{log.result || '-'}</td>
                        <td className="px-3 py-2">{log.scannedLocation || '-'}</td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div> :

            <p className="text-sm text-gray-500">No verification logs found for this stamp.</p>
            }
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-medium text-gray-900">{stamp.status || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Product</span>
                <span className="font-medium text-gray-900">{stamp.product?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Batch</span>
                <span className="font-medium text-gray-900">{stamp.batch?.batchNo || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Request</span>
                <span className="font-medium text-gray-900">{stamp.stampRequest?.requestNo || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Logs</span>
                <span className="font-medium text-gray-900">{stamp.verificationLogs?.length || 0}</span>
              </div>
            </div>
          </div>

          {stamp.suspiciousFlag &&
          <div className="border border-red-200 bg-red-50 p-5">
              <p className="text-sm text-red-800 font-medium">Flagged as suspicious</p>
              <p className="text-sm text-red-700 mt-2">{stamp.suspiciousReason || 'No specific reason provided.'}</p>
            </div>
          }
        </div>
      </div>
    </div>);

};

export default TaxStampDetails;