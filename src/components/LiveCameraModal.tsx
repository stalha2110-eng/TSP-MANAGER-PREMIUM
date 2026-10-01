import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RotateCw, RotateCcw, Check, Sparkles, AlertCircle } from 'lucide-react';

interface LiveCameraModalProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  onFallbackToFileInput: () => void;
}

export function LiveCameraModal({
  onCapture,
  onClose,
  onFallbackToFileInput
}: LiveCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    let isMounted = true;

    async function startCamera() {
      setIsLoading(true);
      setCameraError(null);
      try {
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
          throw new Error('Camera streaming is not supported on this browser.');
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 1280 }
          },
          audio: false
        };

        let mediaStream: MediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (initialErr) {
          console.warn('Constrained camera request failed, trying simple video stream:', initialErr);
          // Fallback to simple unconstrained video
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (!isMounted) {
          mediaStream.getTracks().forEach(t => t.stop());
          return;
        }

        currentStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(e => console.warn('Camera video play error:', e));
        }
      } catch (err: any) {
        console.warn('Live camera error, ready for fallback:', err);
        if (isMounted) {
          setCameraError(err?.message || 'Unable to access live camera feed.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [facingMode]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;

    // Trigger visual shutter flash
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = Math.min(size, 480);
    canvas.height = Math.min(size, 480);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center-crop to a clean square
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;
    ctx.drawImage(video, startX, startY, size, size, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedUrl(dataUrl);
  };

  const handleUsePhoto = () => {
    if (capturedUrl) {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      onCapture(capturedUrl);
    }
  };

  const handleRetake = () => {
    setCapturedUrl(null);
  };

  const handleSwitchCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    setStream(null);
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleNativeFallback = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    onClose();
    onFallbackToFileInput();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 flex flex-col justify-between p-4 sm:p-6 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between z-10 w-full max-w-md mx-auto text-white">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
            <Camera size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider">Product Camera</h3>
            <p className="text-[9px] text-white/60">Take a photo of the item / सामान की फोटो लें</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!capturedUrl && !cameraError && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all cursor-pointer text-white"
              title="Switch Front/Rear Camera"
            >
              <RotateCw size={17} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (stream) stream.getTracks().forEach(t => t.stop());
              onClose();
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all cursor-pointer text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Viewfinder Center */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 relative w-full max-w-md mx-auto overflow-hidden">
        {cameraError ? (
          <div className="text-center p-6 bg-white/10 rounded-3xl border border-white/20 max-w-xs space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Camera size={26} />
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-1">Live Camera Unavailable</p>
              <p className="text-xs text-white/60">
                You can capture using your device's native camera app or pick from gallery.
              </p>
            </div>
            <button
              type="button"
              onClick={handleNativeFallback}
              className="w-full py-3 px-4 rounded-xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-lg"
            >
              Open Device Camera
            </button>
          </div>
        ) : capturedUrl ? (
          <div className="relative w-full max-w-xs aspect-square rounded-3xl overflow-hidden border-2 border-[var(--primary)] shadow-2xl">
            <img src={capturedUrl} alt="Captured preview" className="w-full h-full object-cover" />
            <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
              <Check size={12} strokeWidth={3} /> Photo Captured
            </div>
          </div>
        ) : (
          <div className="relative w-full max-w-xs aspect-square rounded-3xl overflow-hidden border-2 border-white/25 shadow-2xl bg-black flex items-center justify-center">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70 z-10 bg-black/60">
                <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Starting Camera...</span>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Shutter Flash Animation */}
            {isFlashing && (
              <div className="absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 animate-out fade-out" />
            )}
            {/* Viewfinder Target Framing */}
            <div className="absolute inset-4 pointer-events-none rounded-2xl flex flex-col justify-between p-1">
              <div className="flex justify-between">
                <div className="w-5 h-5 border-t-2 border-l-2 border-white/80 rounded-tl-lg" />
                <div className="w-5 h-5 border-t-2 border-r-2 border-white/80 rounded-tr-lg" />
              </div>
              <div className="flex justify-between">
                <div className="w-5 h-5 border-b-2 border-l-2 border-white/80 rounded-bl-lg" />
                <div className="w-5 h-5 border-b-2 border-r-2 border-white/80 rounded-br-lg" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="w-full max-w-md mx-auto pb-4">
        {capturedUrl ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer border border-white/20 flex items-center justify-center gap-2"
            >
              <RotateCcw size={15} /> Retake
            </button>
            <button
              type="button"
              onClick={handleUsePhoto}
              className="flex-1 py-3.5 rounded-2xl bg-[var(--primary)] hover:opacity-90 text-white font-black text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer shadow-lg shadow-[var(--primary)]/30 flex items-center justify-center gap-2"
            >
              <Check size={16} strokeWidth={3} /> Use Photo
            </button>
          </div>
        ) : !cameraError ? (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleCapture}
              disabled={isLoading}
              className="w-20 h-20 rounded-full border-4 border-white p-1 flex items-center justify-center active:scale-90 transition-transform cursor-pointer shadow-2xl hover:scale-105"
              title="Click Photo"
            >
              <div className="w-full h-full rounded-full bg-white active:bg-zinc-200 transition-colors shadow-inner" />
            </button>
            <button
              type="button"
              onClick={handleNativeFallback}
              className="text-[11px] font-bold text-white/60 hover:text-white underline cursor-pointer mt-1"
            >
              Or open device camera / gallery
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
