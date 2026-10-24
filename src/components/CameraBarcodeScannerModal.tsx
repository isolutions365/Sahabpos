import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, CheckCircle, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => boolean;
}

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<'success' | 'error' | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef<boolean>(false);
  const scanCooloffRef = useRef<number>(0);

  // Play audio beep
  const playBeepSound = (type: 'success' | 'error') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else {
        osc.frequency.setValueAtTime(280, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      }
    } catch {
      // AudioContext may be restricted by browser policy
    }
  };

  // Start Scanner
  const startScanner = async (cameraId?: string) => {
    setErrorMessage(null);
    const container = document.getElementById('qr-reader-container');
    if (!container) return;

    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      }

      const html5QrCode = new Html5Qrcode('qr-reader-container', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: 'environment' };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edgeSize = Math.floor(minEdge * 0.75);
            return {
              width: Math.max(edgeSize, 220),
              height: Math.max(Math.floor(edgeSize * 0.6), 140),
            };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          const now = Date.now();
          // 1.5s cooloff between duplicate barcode scans to avoid rapid repeated fires
          if (now - scanCooloffRef.current < 1500 && lastScannedCode === decodedText) {
            return;
          }
          scanCooloffRef.current = now;
          setLastScannedCode(decodedText);

          const success = onScan(decodedText);
          if (success) {
            playBeepSound('success');
            setScanFeedback('success');
          } else {
            playBeepSound('error');
            setScanFeedback('error');
          }

          setTimeout(() => {
            setScanFeedback(null);
          }, 2000);
        },
        () => {
          // Frame read callback without detection (no-op)
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera Scanner start error:', err);
      setIsScanning(false);
      const msg = err?.message || String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setErrorMessage('Camera access was denied. Please allow camera permissions in browser settings. / تم رفض إذن الوصول للكاميرا. يرجى تفعيل إذن الكاميرا من إعدادات المتصفح.');
      } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
        setErrorMessage('No camera found on this device. / لم يتم العثور على كاميرا في هذا الجهاز.');
      } else {
        setErrorMessage(`Unable to access camera (${msg}). Ensure no other app is using the camera. / تعذر فتح الكاميرا.`);
      }
    }
  };

  // Stop scanner
  const stopScanner = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch (e) {
      console.warn('Error while stopping scanner:', e);
    } finally {
      setIsScanning(false);
      isStoppingRef.current = false;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    // Enumerate cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          const camList = devices.map((d) => ({ id: d.id, label: d.label || `Camera ${d.id.slice(0, 4)}` }));
          setCameras(camList);
          // Prefer back/environment camera if available
          const backCam = camList.find((c) => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment') || c.label.toLowerCase().includes('rear'));
          const chosenId = backCam ? backCam.id : camList[0].id;
          setSelectedCameraId(chosenId);
          startScanner(chosenId);
        } else {
          startScanner();
        }
      })
      .catch((err) => {
        console.warn('Could not list cameras, trying facingMode directly:', err);
        startScanner();
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const handleCameraChange = (cameraId: string) => {
    setSelectedCameraId(cameraId);
    startScanner(cameraId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] shadow-2xs">
              <Camera className="w-5 h-5 text-[#4338CA]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight flex items-center gap-2">
                <span>Camera Barcode Scanner / ماسح الكاميرا</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Point camera at 1D Barcode (EAN-13, UPC) or QR Code to instantly add to cart
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute beep' : 'Enable beep'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder Content */}
        <div className="relative flex-1 bg-black min-h-[300px] flex items-center justify-center overflow-hidden">
          {/* HTML5 QR Container */}
          <div id="qr-reader-container" className="w-full h-full min-h-[300px]"></div>

          {/* Visual Overlay Scan Box & Laser */}
          {isScanning && !errorMessage && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-44 rounded-2xl border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center justify-center">
                {/* Corner Accents */}
                <span className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></span>
                <span className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></span>
                <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></span>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></span>

                {/* Animated Laser Line */}
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_#f43f5e] animate-pulse"></div>

                <span className="text-[10px] font-bold text-white/80 bg-black/60 px-2.5 py-0.5 rounded-full absolute -bottom-7">
                  Align Barcode inside Box / ضع الباركود داخل الإطار
                </span>
              </div>
            </div>
          )}

          {/* Scan Feedback Banner */}
          {scanFeedback && (
            <div
              className={`absolute top-4 inset-x-6 z-20 p-3 rounded-2xl shadow-xl border flex items-center gap-2.5 animate-bounce ${
                scanFeedback === 'success'
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-rose-600 text-white border-rose-400'
              }`}
            >
              {scanFeedback === 'success' ? (
                <CheckCircle className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <div className="text-xs font-bold leading-tight flex-1">
                {scanFeedback === 'success' ? (
                  <span>Item added to cart! / تمت إضافة الصنف للسلة ({lastScannedCode})</span>
                ) : (
                  <span>Barcode not found in inventory / غير مسجل بالمخزون ({lastScannedCode})</span>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs max-w-sm leading-relaxed text-slate-200 font-medium">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => startScanner(selectedCameraId)}
                className="px-4 py-2 bg-[#4338CA] hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry / إعادة المحاولة
              </button>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Camera switcher */}
          {cameras.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600">Camera / الكاميرا:</span>
              <select
                value={selectedCameraId}
                onChange={(e) => handleCameraChange(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#4338CA] cursor-pointer"
              >
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Continuous scan active
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Done / إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
