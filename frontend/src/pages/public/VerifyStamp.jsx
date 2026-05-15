import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertCircle, Building2, ScanLine } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import getStatusColor from '../../utils/getStatusColor';
import verificationApi from '../../services/verificationApi';

const SCANNER_ELEMENT_ID = 'public-stamp-scanner';
const SCAN_COOLDOWN_MS = 1500;

const getDeviceViewport = () => {
  const width = window.innerWidth || window.screen?.width || 1280;
  const height = window.innerHeight || window.screen?.height || 720;
  return {
    width: Math.max(320, Math.floor(width)),
    height: Math.max(320, Math.floor(height))
  };
};

const VerifyStamp = () => {
  const scannerRef = useRef(null);
  const cooldownRef = useRef(false);
  const resizeTimerRef = useRef(null);
  const scannerStartingRef = useRef(false);

  const [cameraStarting, setCameraStarting] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [deviceViewport, setDeviceViewport] = useState(() => getDeviceViewport());

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (!scanner) {
      const el = document.getElementById(SCANNER_ELEMENT_ID);
      if (el) el.innerHTML = '';
      return;
    }

    try {await scanner.stop();} catch (_ERR) {void _ERR;}
    try {await scanner.clear();} catch (_ERR) {void _ERR;}

    const el = document.getElementById(SCANNER_ELEMENT_ID);
    if (el) el.innerHTML = '';
  }, []);

  const getScannerDimensions = useCallback(() => {
    const el = document.getElementById(SCANNER_ELEMENT_ID);
    const bounds = el?.getBoundingClientRect();
    const width = Math.max(240, Math.floor(bounds?.width || el?.clientWidth || 0));
    const height = Math.max(240, Math.floor(bounds?.height || el?.clientHeight || 0));
    return { width, height };
  }, []);

  const verifyValue = useCallback(async (rawValue, source) => {
    const scannedValue = rawValue?.trim();
    if (!scannedValue) return;

    setVerifying(true);
    try {
      const response = await verificationApi.verifyStamp({
        codeValue: scannedValue,
        qrValue: scannedValue,
        channel: 'PUBLIC_PORTAL'
      });

      setResult({
        ...(response.data?.data || {}),
        scannedValue,
        source
      });
      setResultOpen(true);

      if (source === 'camera') {
        await stopScanner();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to verify stamp';
      toast.error(message);
      setResult({
        result: 'ERROR',
        message,
        scannedValue,
        publicScanCount: 0,
        source
      });
      setResultOpen(true);

      if (source === 'camera') {
        await stopScanner();
      }
    } finally {
      setVerifying(false);
    }
  }, [stopScanner]);

  const startScanner = useCallback(async () => {
    if (scannerRef.current || scannerStartingRef.current || verifying || resultOpen) return;

    const el = document.getElementById(SCANNER_ELEMENT_ID);
    if (!el) return;

    scannerStartingRef.current = true;
    setCameraStarting(true);
    try {
      el.innerHTML = '';

      const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      if (!window.isSecureContext && !isLocalhost) {
        throw new Error('Camera requires HTTPS (or localhost)');
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera is not supported by this browser');
      }

      const { width: containerWidth, height: containerHeight } = getScannerDimensions();
      const rawAspectRatio = containerWidth / containerHeight;
      const cameraAspectRatio = Number(Math.min(1.78, Math.max(0.75, rawAspectRatio || 1)).toFixed(3));
      const qrConfig = { fps: 10, aspectRatio: cameraAspectRatio };

      const onScanSuccess = async (decodedText) => {
        if (cooldownRef.current) return;
        cooldownRef.current = true;
        await verifyValue(decodedText, 'camera');
        setTimeout(() => {cooldownRef.current = false;}, SCAN_COOLDOWN_MS);
      };

      let availableCameras = [];
      try {availableCameras = await Html5Qrcode.getCameras();} catch (_ERR) {void _ERR;availableCameras = [];}

      const rearRegex = /(back|rear|environment|traseira|trasera|arriere|rueck)/i;
      const preferredRear = availableCameras.find((cam) => rearRegex.test(cam?.label || ''));
      const firstCamera = availableCameras[0];

      const cameraConfigs = [];
      if (preferredRear?.id) cameraConfigs.push({ deviceId: { exact: preferredRear.id } });
      if (firstCamera?.id && firstCamera.id !== preferredRear?.id) cameraConfigs.push({ deviceId: { exact: firstCamera.id } });
      cameraConfigs.push({ facingMode: { ideal: 'environment' } });
      cameraConfigs.push({ facingMode: 'environment' });
      cameraConfigs.push({ facingMode: { ideal: 'user' } });
      cameraConfigs.push(true);

      let lastCameraError = null;
      let startedScanner = null;
      for (const cameraConfig of cameraConfigs) {
        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
        try {
          await scanner.start(cameraConfig, qrConfig, onScanSuccess, () => {});
          lastCameraError = null;
          startedScanner = scanner;
          break;
        } catch (err) {
          lastCameraError = err;
          try {await scanner.clear();} catch (_ERR) {void _ERR;}
        }
      }

      if (lastCameraError || !startedScanner) throw lastCameraError;

      if (scannerRef.current && scannerRef.current !== startedScanner) {
        try {await startedScanner.stop();} catch (_ERR) {void _ERR;}
        try {await startedScanner.clear();} catch (_ERR) {void _ERR;}
        return;
      }

      scannerRef.current = startedScanner;
    } catch (error) {
      const reason = error?.message || 'Camera access blocked or unavailable on this device/browser';
      toast.error(`Unable to access camera. ${reason}`);
    } finally {
      scannerStartingRef.current = false;
      setCameraStarting(false);
    }
  }, [verifying, verifyValue, resultOpen, getScannerDimensions, deviceViewport]);

  useEffect(() => {startScanner();}, [startScanner]);

  useEffect(() => {
    return () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      stopScanner();
    };
  }, [stopScanner]);

  useEffect(() => {
    const handleSizeChange = () => {
      setDeviceViewport(getDeviceViewport());
      if (!scannerRef.current || verifying || resultOpen) return;
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(async () => {
        await stopScanner();
        await startScanner();
      }, 180);
    };

    window.addEventListener('resize', handleSizeChange);
    window.addEventListener('orientationchange', handleSizeChange);

    return () => {
      window.removeEventListener('resize', handleSizeChange);
      window.removeEventListener('orientationchange', handleSizeChange);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, [resultOpen, startScanner, stopScanner, verifying]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    await verifyValue(manualValue, 'manual');
  };

  const handleCloseResult = async () => {
    setResultOpen(false);
    await startScanner();
  };

  const scanCount = useMemo(() => result?.publicScanCount ?? result?.stamp?.publicScanCount ?? 0, [result]);
  const scannerBoxHeight = useMemo(() => {
    const byViewportHeight = Math.floor(deviceViewport.height * 0.82);
    const byViewportWidth = Math.floor(deviceViewport.width * 0.95);
    const calculated = Math.min(byViewportHeight, byViewportWidth);
    return Math.min(920, Math.max(460, calculated));
  }, [deviceViewport.height, deviceViewport.width]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Tax Stamp</h1>
        <p className="text-gray-500">Point your camera at a stamp QR code or enter the code manually</p>
      </div>

      <div className="space-y-6">
        {}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Camera Scanner</h3>
          <div className="border border-dashed border-gray-300 bg-gray-50 p-3">
            <div
              className="flex w-full items-center justify-center overflow-hidden border border-gray-200 bg-gray-100"
              style={{ height: `${scannerBoxHeight}px` }}>
              
              <div id={SCANNER_ELEMENT_ID} className="h-full w-full" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {cameraStarting ? 'Starting camera...' : 'Camera is active. QR is scanned automatically.'}
          </p>
        </div>

        {}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Manual Verify</h3>
          <form onSubmit={handleManualSubmit} className="flex gap-3">
            <Input
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="Paste QR value or stamp code"
              className="flex-1" />
            
            <Button type="submit" loading={verifying}>Verify</Button>
          </form>
        </div>
      </div>

      {}
      <Modal
        isOpen={resultOpen}
        onClose={handleCloseResult}
        title="Verification Result"
        size="lg">
        
        {result ?
        <div className="space-y-5">
            {}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ScanLine className="h-5 w-5 text-gray-600" />
                <h4 className="text-base font-semibold text-gray-900">{result.result || 'UNKNOWN'}</h4>
              </div>
              <Badge variant={getStatusColor(result.result)}>{result.result || 'UNKNOWN'}</Badge>
            </div>

            <p className="text-sm text-gray-700">{result.message || '-'}</p>

            {}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="border border-gray-200 p-3">
                <p className="text-gray-500">Public Scan Count</p>
                <p className="text-xl font-semibold text-gray-900">{scanCount}</p>
              </div>
              <div className="border border-gray-200 p-3">
                <p className="text-gray-500">Scanned Value</p>
                <p className="font-mono text-xs text-gray-900 break-all">{result.scannedValue || '-'}</p>
              </div>
              <div className="border border-gray-200 p-3">
                <p className="text-gray-500">Verified At</p>
                <p className="font-medium text-gray-900">
                  {result.scannedAt ? new Date(result.scannedAt).toLocaleString() : '-'}
                </p>
              </div>
              <div className="border border-gray-200 p-3">
                <p className="text-gray-500">Verification ID</p>
                <p className="font-mono text-xs text-gray-900 break-all">{result.verificationId || '-'}</p>
              </div>
            </div>

            {}
            {result.stamp ?
          <>
                <div className="border border-gray-200 p-4">
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">Stamp Details</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Stamp Code</p>
                      <p className="font-medium text-gray-900 break-all">{result.stamp.codeValue || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Stamp Status</p>
                      <Badge variant={getStatusColor(result.stamp.status)}>{result.stamp.status || '-'}</Badge>
                    </div>
                    <div>
                      <p className="text-gray-500">Product</p>
                      <p className="font-medium text-gray-900">{result.stamp.product?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Category</p>
                      <p className="font-medium text-gray-900">{result.stamp.product?.category || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Product Code</p>
                      <p className="font-medium text-gray-900">{result.stamp.product?.code || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Batch No</p>
                      <p className="font-medium text-gray-900">{result.stamp.batch?.batchNo || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Production Date</p>
                      <p className="font-medium text-gray-900">
                        {result.stamp.batch?.productionDate ?
                    new Date(result.stamp.batch.productionDate).toLocaleDateString() :
                    '-'}
                      </p>
                    </div>
                    {result.stamp.firstVerifiedAt &&
                <div>
                        <p className="text-gray-500">First Verified</p>
                        <p className="font-medium text-gray-900">
                          {new Date(result.stamp.firstVerifiedAt).toLocaleString()}
                        </p>
                      </div>
                }
                  </div>
                </div>

                {}
                {result.stamp.manufacturer ?
            <div className="border border-blue-100 bg-blue-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <h5 className="text-sm font-semibold text-blue-900">Manufacturer</h5>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-blue-700">Company Name</p>
                        <p className="font-semibold text-blue-900">{result.stamp.manufacturer.companyName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Contact Person</p>
                        <p className="font-medium text-blue-900">{result.stamp.manufacturer.fullName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Email</p>
                        <p className="font-medium text-blue-900">{result.stamp.manufacturer.email || '-'}</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Mobile</p>
                        <p className="font-medium text-blue-900">{result.stamp.manufacturer.mobile || '-'}</p>
                      </div>
                      {result.stamp.manufacturer.address &&
                <div className="md:col-span-2">
                          <p className="text-blue-700">Address</p>
                          <p className="font-medium text-blue-900">{result.stamp.manufacturer.address}</p>
                        </div>
                }
                    </div>
                  </div> :
            null}
              </> :

          <div className="rounded border border-red-100 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                No stamp details available for this scan.
              </div>
          }

            <div className="flex justify-end">
              <Button onClick={handleCloseResult}>Close</Button>
            </div>
          </div> :

        <div className="text-sm text-gray-500">No verification result available.</div>
        }
      </Modal>
    </div>);

};

export default VerifyStamp;