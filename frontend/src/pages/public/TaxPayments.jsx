import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Building2, Info, Shield, ArrowRight, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import SelectDropdown from '../../components/common/SelectDropdown';
import api from '../../services/api';


function redirectToIpay(action, fields) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.acceptCharset = 'UTF-8';
  Object.entries(fields).forEach(([name, value]) => {
    if (value === undefined || value === null || value === '') return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

const bankAccounts = [
{ name: 'People\'s Bank', account: '1234567890', branch: 'Colombo Main' },
{ name: 'Bank of Ceylon', account: '9876543210', branch: 'Fort' },
{ name: 'Commercial Bank', account: '5678901234', branch: 'Kandy' }];


const TaxPayments = () => {
  const [formData, setFormData] = useState({
    payFor: 'LICENSE',
    licenseNumber: '',
    batchNo: '',
    penaltyRef: '',
    declaredAmount: '',
    method: 'BANK_TRANSFER',
    bankName: '',
    bankBranch: '',
    bankReference: '',
    payerName: '',
    payerContact: '',
    customerEmail: '',
    gatewayCardScheme: '',
    remarks: '',
    proofImage: null
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [autoAmountLocked, setAutoAmountLocked] = useState(true);
  const [lastDeclaredPayment, setLastDeclaredPayment] = useState(null);

  const payForOptions = useMemo(() => [
  { value: 'LICENSE', label: 'License Payment (auto amount)' },
  { value: 'BATCH', label: 'Batch Payment / Stamp Payment (auto amount)' },
  { value: 'PENALTY', label: 'Penalty Payment (manual amount)' }],
  []);

  const methodOptions = useMemo(() => [
  { value: 'BANK_TRANSFER', label: 'Bank transfer + slip' },
  { value: 'PAYMENT_GATEWAY', label: 'Card / online (iPay)' }],
  []);

  const gatewaySchemeOptions = useMemo(() => [
  { value: '', label: 'All methods iPay offers' },
  { value: 'VISA', label: 'Visa only' },
  { value: 'MC', label: 'Mastercard only' }],
  []);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const ipay = searchParams.get('ipay');
    if (!ipay) return;
    if (ipay === 'ok') {
      toast.success('You returned from iPay. If payment succeeded, it will show as verified in the system.');
    } else if (ipay === 'cancel') {
      toast('Payment was cancelled or timed out on iPay.');
    }
    const next = new URLSearchParams(searchParams);
    next.delete('ipay');
    next.delete('orderId');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const resetLookup = () => {
    setLookupResult(null);
    setLastDeclaredPayment(null);
    if (formData.payFor === 'PENALTY') {
      setAutoAmountLocked(false);
    } else {
      setAutoAmountLocked(true);
    }
  };

  const handlePayForChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      payFor: value,
      licenseNumber: '',
      batchNo: '',
      penaltyRef: '',
      declaredAmount: ''
    }));
    setErrors({});
    setLookupResult(null);
    setLastDeclaredPayment(null);
    setAutoAmountLocked(value !== 'PENALTY');
  };

  const runLookup = async () => {
    setLastDeclaredPayment(null);

    const payFor = formData.payFor;
    const licenseNumber = formData.licenseNumber.trim();
    const batchNo = formData.batchNo.trim();

    if (payFor === 'LICENSE' && !licenseNumber) {
      toast.error('Enter license number');
      return;
    }
    if (payFor === 'BATCH' && !batchNo) {
      toast.error('Enter batch number');
      return;
    }

    setLookupLoading(true);
    try {
      const res = payFor === 'LICENSE' ?
      await api.get(`/public/payments/license/${encodeURIComponent(licenseNumber)}`) :
      await api.get(`/public/payments/batch/${encodeURIComponent(batchNo)}`);

      const data = res.data?.data;
      setLookupResult(data || null);

      const suggested = Number(data?.suggestedAmount ?? 0);
      if (Number.isFinite(suggested) && suggested > 0) {
        setFormData((prev) => ({ ...prev, declaredAmount: String(suggested) }));
        setAutoAmountLocked(true);
        toast.success('Amount auto-filled');
      } else {
        setFormData((prev) => ({ ...prev, declaredAmount: '' }));
        setAutoAmountLocked(false);
        toast('No due amount found. You may enter amount manually.', { icon: 'ℹ️' });
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Lookup failed';
      setLookupResult(null);
      setFormData((prev) => ({ ...prev, declaredAmount: '' }));
      setAutoAmountLocked(payFor !== 'PENALTY');
      toast.error(message);
    } finally {
      setLookupLoading(false);
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.payFor) nextErrors.payFor = 'Select payment type';

    if (formData.payFor === 'LICENSE' && !formData.licenseNumber.trim()) nextErrors.licenseNumber = 'License number is required';
    if (formData.payFor === 'BATCH' && !formData.batchNo.trim()) nextErrors.batchNo = 'Batch number is required';
    if (formData.payFor === 'PENALTY') {
      if (!formData.penaltyRef.trim()) nextErrors.penaltyRef = 'Penalty reference is required';
      if (!formData.licenseNumber.trim()) nextErrors.licenseNumber = 'License number is required for penalty payment';
    }

    const amount = Number(formData.declaredAmount);
    if (!Number.isFinite(amount) || amount <= 0) nextErrors.declaredAmount = 'Enter a valid amount';

    if (formData.method === 'BANK_TRANSFER') {
      if (!formData.bankName) nextErrors.bankName = 'Bank name is required';
      if (!formData.bankBranch) nextErrors.bankBranch = 'Branch is required';
      if (!formData.bankReference) nextErrors.bankReference = 'Bank reference is required';
      if (!formData.proofImage) nextErrors.proofImage = 'Slip / screenshot is required';
    }

    if (formData.method === 'PAYMENT_GATEWAY' && formData.customerEmail.trim()) {
      const em = formData.customerEmail.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) nextErrors.customerEmail = 'Enter a valid email';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      if (formData.method === 'PAYMENT_GATEWAY') {
        const res = await api.post('/public/payments/ipay/prepare', {
          payFor: formData.payFor,
          licenseNumber: formData.licenseNumber.trim(),
          batchNo: formData.batchNo.trim(),
          penaltyRef: formData.penaltyRef.trim(),
          declaredAmount: formData.declaredAmount,
          payerName: formData.payerName.trim(),
          payerContact: formData.payerContact.trim(),
          customerEmail: formData.customerEmail.trim(),
          paymentMethod: formData.gatewayCardScheme || undefined,
          remarks: formData.remarks.trim()
        });
        const data = res.data?.data;
        if (!data?.action || !data?.fields) {
          toast.error('Could not start payment. Is iPay configured on the server?');
          return;
        }
        toast.success('Redirecting to iPay…');
        redirectToIpay(data.action, data.fields);
        return;
      }

      const payload = new FormData();
      payload.append('payFor', formData.payFor);
      payload.append('method', 'BANK_TRANSFER');
      payload.append('declaredAmount', String(formData.declaredAmount));
      payload.append('bankName', formData.bankName);
      payload.append('bankBranch', formData.bankBranch);
      payload.append('bankReference', formData.bankReference);
      payload.append('remarks', formData.remarks || '');
      if (formData.payerName) payload.append('payerName', formData.payerName);
      if (formData.payerContact) payload.append('payerContact', formData.payerContact);

      if (formData.payFor === 'LICENSE' || formData.payFor === 'PENALTY') {
        payload.append('licenseNumber', formData.licenseNumber.trim());
      }
      if (formData.payFor === 'BATCH') {
        payload.append('batchNo', formData.batchNo.trim());
      }
      if (formData.payFor === 'PENALTY') {
        payload.append('penaltyRef', formData.penaltyRef.trim());
      }

      if (formData.proofImage) {
        payload.append('proofImage', formData.proofImage);
      }

      const res = await api.post('/public/payments/declare', payload);
      const payment = res.data?.data;
      setLastDeclaredPayment(payment || null);
      toast.success(`Payment declared: ${payment?.paymentRef || 'OK'}`);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to declare payment';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Tax Payments"
        description="Pay without sign-in using License / Batch details, with auto amount where available" />
      

      <div className="space-y-6">
        <div className="border border-gray-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center border border-info-200 bg-info-50">
              <Info className="h-5 w-5 text-info-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">How it works</p>
              <p className="mt-1 text-sm text-gray-600">
                Make the bank transfer, then declare it here with your slip screenshot. An officer will verify and allocate the payment.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/verify">
                  <Button variant="outline">Verify Stamp</Button>
                </Link>
                <Button variant="outline" onClick={resetLookup}>Reset</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Official Bank Accounts</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bankAccounts.map((bank) =>
            <div key={`${bank.name}-${bank.account}`} className="border border-gray-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center border border-gray-200 bg-gray-50">
                    <Building2 className="h-5 w-5 text-gray-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{bank.name}</p>
                    <p className="text-xs text-gray-500 mt-1">Account: <span className="font-mono text-gray-700">{bank.account}</span></p>
                    <p className="text-xs text-gray-500">Branch: <span className="text-gray-700">{bank.branch}</span></p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <Shield className="h-4 w-4" />
            Use your bank receipt reference when declaring payment.
          </div>
        </div>

        <div className="border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Declare Payment (No sign-in)</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectDropdown
                label="Payment Type"
                value={formData.payFor}
                onChange={(e) => handlePayForChange(e.target.value)}
                options={payForOptions}
                required />
              
              <Input
                label="Declared Amount (LKR)"
                type="number"
                min="0"
                step="0.01"
                value={formData.declaredAmount}
                onChange={(e) => handleChange('declaredAmount', e.target.value)}
                placeholder={autoAmountLocked ? 'Auto-filled from lookup' : 'Enter amount'}
                disabled={autoAmountLocked && formData.payFor !== 'PENALTY'}
                required />
              
            </div>

            {errors.payFor && <p className="text-sm text-red-600">{errors.payFor}</p>}
            {errors.declaredAmount && <p className="text-sm text-red-600">{errors.declaredAmount}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(formData.payFor === 'LICENSE' || formData.payFor === 'PENALTY') &&
              <Input
                label="License Number"
                value={formData.licenseNumber}
                onChange={(e) => handleChange('licenseNumber', e.target.value)}
                placeholder="e.g. LIC-MFG-000123"
                required />

              }

              {formData.payFor === 'BATCH' &&
              <Input
                label="Batch Number"
                value={formData.batchNo}
                onChange={(e) => handleChange('batchNo', e.target.value)}
                placeholder="e.g. BATCH-123456"
                required />

              }

              {formData.payFor === 'PENALTY' &&
              <Input
                label="Penalty Reference"
                value={formData.penaltyRef}
                onChange={(e) => handleChange('penaltyRef', e.target.value)}
                placeholder="e.g. PEN-2026-001"
                required />

              }

              {(formData.payFor === 'LICENSE' || formData.payFor === 'BATCH') &&
              <div className="flex items-end gap-2">
                  <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={runLookup}
                  loading={lookupLoading}
                  disabled={lookupLoading}>
                  
                    Auto-calculate <Search className="h-4 w-4" />
                  </Button>
                </div>
              }
            </div>

            {errors.licenseNumber && <p className="text-sm text-red-600">{errors.licenseNumber}</p>}
            {errors.batchNo && <p className="text-sm text-red-600">{errors.batchNo}</p>}
            {errors.penaltyRef && <p className="text-sm text-red-600">{errors.penaltyRef}</p>}

            {lookupResult ?
            <div className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {lookupResult.kind === 'LICENSE' ?
              <span>
                    Found license <span className="font-mono">{lookupResult.license?.licenseNumber}</span> — Suggested amount: <span className="font-semibold">LKR {Number(lookupResult.suggestedAmount || 0).toLocaleString()}</span>
                  </span> :

              <span>
                    Found batch <span className="font-mono">{lookupResult.batch?.batchNo}</span> — Suggested amount: <span className="font-semibold">LKR {Number(lookupResult.suggestedAmount || 0).toLocaleString()}</span>
                  </span>
              }
              </div> :
            null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectDropdown
                label="Payment Method"
                value={formData.method}
                onChange={(e) => handleChange('method', e.target.value)}
                options={methodOptions} />
              
              <div
                className={`border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 ${
                formData.method === 'PAYMENT_GATEWAY' ? 'min-h-[2.75rem]' : ''}`
                }>
                
                {formData.method === 'BANK_TRANSFER' ?
                'Attach the bank slip and submit. No sign-in required.' :
                null}
              </div>
            </div>

            {formData.method === 'PAYMENT_GATEWAY' &&
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                label="Payer name (optional)"
                value={formData.payerName}
                onChange={(e) => handleChange('payerName', e.target.value)}
                placeholder="Shown on iPay checkout" />
              
                <Input
                label="Mobile (optional)"
                value={formData.payerContact}
                onChange={(e) => handleChange('payerContact', e.target.value)}
                placeholder="Digits only preferred" />
              
                <Input
                label="Email for receipt (optional)"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => handleChange('customerEmail', e.target.value)}
                placeholder="you@example.com" />
              
                <SelectDropdown
                label="Card / scheme filter (optional)"
                value={formData.gatewayCardScheme}
                onChange={(e) => handleChange('gatewayCardScheme', e.target.value)}
                options={gatewaySchemeOptions} />
              
                {errors.customerEmail && <p className="md:col-span-2 text-sm text-red-600">{errors.customerEmail}</p>}
              </div>
            }

            {formData.method === 'BANK_TRANSFER' &&
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                label="Bank Name"
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                placeholder="e.g. Bank of Ceylon"
                required />
              
                <Input
                label="Branch"
                value={formData.bankBranch}
                onChange={(e) => handleChange('bankBranch', e.target.value)}
                placeholder="e.g. Fort"
                required />
              
                <div className="md:col-span-2">
                  <Input
                  label="Bank Reference"
                  value={formData.bankReference}
                  onChange={(e) => handleChange('bankReference', e.target.value)}
                  placeholder="e.g. TXN-12345"
                  required />
                
                </div>
                <Input
                label="Payer Name (Optional)"
                value={formData.payerName}
                onChange={(e) => handleChange('payerName', e.target.value)}
                placeholder="e.g. Tharindu" />
              
                <Input
                label="Payer Contact (Optional)"
                value={formData.payerContact}
                onChange={(e) => handleChange('payerContact', e.target.value)}
                placeholder="e.g. 07X-XXXXXXX" />
              
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Slip / Screenshot</label>
                  <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => handleChange('proofImage', e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 bg-white px-3 py-2.5 text-sm"
                  required />
                
                  {errors.proofImage && <p className="text-sm text-red-600 mt-1">{errors.proofImage}</p>}
                </div>
              </div>
            }

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Remarks (Optional)</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none"
                placeholder="Add note for verification" />
              
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="submit" loading={loading} disabled={loading} className="sm:w-auto gap-2">
                Submit Declaration <ArrowRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" onClick={() => toast('Enter details, attach slip, then submit.')} className="sm:w-auto">
                Need help?
              </Button>
            </div>

            {lastDeclaredPayment ?
            <div className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Declared successfully. Reference: <span className="font-mono font-semibold">{lastDeclaredPayment.paymentRef}</span>
              </div> :
            null}
          </form>
        </div>
      </div>
    </div>);

};

export default TaxPayments;