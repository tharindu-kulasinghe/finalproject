import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertCircle, ScanLine } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import getStatusColor from '../../utils/getStatusColor';
import verificationApi from '../../services/verificationApi';

const SCANNER_ELEMENT_ID = 'officer-stamp-scanner';
const SCAN_COOLDOWN_MS = 1500;

const getDeviceViewport = () => {
  const width = window.innerWidth || window.screen?.width || 1280;
  const height = window.innerHeight || window.screen?.height || 720;
  return {
    width: Math.max(320, Math.floor(width)),
    height: Math.max(320, Math.floor(height))
  };
};

const StampScanner = () => {
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
      const scannerElement = document.getElementById(SCANNER_ELEMENT_ID);
      if (scannerElement) scannerElement.innerHTML = '';
      return;
    }

    try {
      await scanner.stop();
    } catch (_) {
      void 0;
    }

    try {
      await scanner.clear();
    } catch (_) {
      void 0;
    }

    const scannerElement = document.getElementById(SCANNER_ELEMENT_ID);
    if (scannerElement) scannerElement.innerHTML = '';
  }, []);

  const getScannerDimensions = useCallback(() => {
    const scannerElement = document.getElementById(SCANNER_ELEMENT_ID);
    const bounds = scannerElement?.getBoundingClientRect();
    const width = Math.max(240, Math.floor(bounds?.width || scannerElement?.clientWidth || 0));
    const height = Math.max(240, Math.floor(bounds?.height || scannerElement?.clientHeight || 0));

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
        channel: 'ED_OFFICER_SCANNER'
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

    const scannerElement = document.getElementById(SCANNER_ELEMENT_ID);
    if (!scannerElement) return;

    scannerStartingRef.current = true;
    setCameraStarting(true);
    try {
      scannerElement.innerHTML = '';

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
        setTimeout(() => {
          cooldownRef.current = false;
        }, SCAN_COOLDOWN_MS);
      };

      let availableCameras = [];
      try {
        availableCameras = await Html5Qrcode.getCameras();
      } catch (_) {
        availableCameras = [];
      }

      const rearRegex = /(back|rear|environment|traseira|trasera|arriere|rueck)/i;
      const preferredRear = availableCameras.find((camera) => rearRegex.test(camera?.label || ''));
      const firstCamera = availableCameras[0];

      const cameraConfigs = [];
      if (preferredRear?.id) {
        cameraConfigs.push({ deviceId: { exact: preferredRear.id } });
      }
      if (firstCamera?.id && firstCamera.id !== preferredRear?.id) {
        cameraConfigs.push({ deviceId: { exact: firstCamera.id } });
      }
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
        } catch (error) {
          lastCameraError = error;
          try {
            await scanner.clear();
          } catch (_) {
      void 0;
    }
        }
      }

      if (lastCameraError || !startedScanner) {
        throw lastCameraError;
      }

      if (scannerRef.current && scannerRef.current !== startedScanner) {
        try {
          await startedScanner.stop();
        } catch (_) {
      void 0;
    }
        try {
          await startedScanner.clear();
        } catch (_) {
      void 0;
    }
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

  useEffect(() => {
    startScanner();
  }, [startScanner]);

  useEffect(() => {
    return () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
      stopScanner();
    };
  }, [stopScanner]);

  useEffect(() => {
    const handleSizeChange = () => {
      setDeviceViewport(getDeviceViewport());

      if (!scannerRef.current || verifying || resultOpen) return;

      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }

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
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
    };
  }, [resultOpen, startScanner, stopScanner, verifying]);

  const handleManualSubmit = async (event) => {
    event.preventDefault();
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
    <div className="space-y-6">
      <PageHeader
        title="Scan and Verify Stamps"
        description="Use live camera auto-scan or manual input to verify stamp QR values."
        actions={null} />
      

      <div className="space-y-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Camera Scanner</h3>
          <div className="border border-dashed border-gray-300 bg-gray-50 p-3">
            <div className="flex w-full items-center justify-center overflow-hidden border border-gray-200 bg-gray-100" style={{ height: `${scannerBoxHeight}px` }}>
              <div id={SCANNER_ELEMENT_ID} className="h-full w-full" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {cameraStarting ?
            'Starting camera...' :
            'Camera is active automatically. QR is scanned automatically.'}
          </p>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Manual Verify</h3>
          <form onSubmit={handleManualSubmit} className="flex gap-3">
            <Input
              value={manualValue}
              onChange={(event) => setManualValue(event.target.value)}
              placeholder="Paste QR value or stamp code"
              className="flex-1" />
            
            <Button type="submit" loading={verifying}>Verify</Button>
          </form>

          <div className="mt-5 rounded border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
            Officer scans are excluded from public scan count. Only PUBLIC_PORTAL scans increase the count.
          </div>
        </Card>
      </div>

      <Modal
        isOpen={resultOpen}
        onClose={handleCloseResult}
        title="Verification Result"
        size="lg">
        
        {result ?
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ScanLine className="h-5 w-5 text-gray-600" />
                <h4 className="text-base font-semibold text-gray-900">{result.result || 'UNKNOWN'}</h4>
              </div>
              <Badge variant={getStatusColor(result.result)}>{result.result || 'UNKNOWN'}</Badge>
            </div>

            <p className="text-sm text-gray-700">{result.message || '-'}</p>

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
                <p className="font-medium text-gray-900">{result.scannedAt ? new Date(result.scannedAt).toLocaleString() : '-'}</p>
              </div>
              <div className="border border-gray-200 p-3">
                <p className="text-gray-500">Verification ID</p>
                <p className="font-mono text-xs text-gray-900 break-all">{result.verificationId || '-'}</p>
              </div>
            </div>

            {result.stamp ?
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
                    <p className="text-gray-500">Batch</p>
                    <p className="font-medium text-gray-900">{result.stamp.batch?.batchNo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Production Date</p>
                    <p className="font-medium text-gray-900">
                      {result.stamp.batch?.productionDate ? new Date(result.stamp.batch.productionDate).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              </div> :

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

export default StampScanner;