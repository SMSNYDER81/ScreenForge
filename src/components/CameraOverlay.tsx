import React, { useRef, useEffect, useState } from 'react';
import { Camera, Minimize2, Maximize, Tv, Power, Move } from 'lucide-react';

interface CameraOverlayProps {
  stream: MediaStream | null;
  onClose: () => void;
  activeCameraId: string;
}

export default function CameraOverlay({ stream, onClose, activeCameraId }: CameraOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [size, setSize] = useState<number>(180); // Circular diameter in px
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPipActive, setIsPipActive] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, activeCameraId]);

  // Handle PiP level changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPip = () => setIsPipActive(true);
    const handleLeavePip = () => setIsPipActive(false);

    video.addEventListener('enterpictureinpicture', handleEnterPip);
    video.addEventListener('leavepictureinpicture', handleLeavePip);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPip);
      video.removeEventListener('leavepictureinpicture', handleLeavePip);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.action-button')) return;
    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    // Set capture to track pointer even when leaving the item boundary
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const parentWidth = window.innerWidth;
    const parentHeight = window.innerHeight;

    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;

    // Constrain to window bounds
    newX = Math.max(10, Math.min(newX, parentWidth - size - 10));
    newY = Math.max(10, Math.min(newY, parentHeight - size - 10));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    containerRef.current?.releasePointerCapture(e.pointerId);
  };

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('Failed to toggle Picture-in-Picture mode:', err);
    }
  };

  if (!stream) return null;

  return (
    <div
      ref={containerRef}
      id="camera-overlay-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size}px`,
        height: `${size}px`,
        touchAction: 'none',
      }}
      className={`z-50 select-none group rounded-full overflow-hidden border-2 shadow-2xl transition-shadow duration-300 bg-black cursor-grab active:cursor-grabbing ${
        isDragging ? 'border-amber-400 shadow-amber-900/30' : 'border-indigo-500/80 hover:border-indigo-400'
      }`}
    >
      {/* Video Stream */}
      <video
        ref={videoRef}
        id="camera-overlay-video"
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover scale-x-[-1]" // mirror local feed
      />

      {/* Control Overlay */}
      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 text-white">
        {/* Resize controls */}
        <div className="flex gap-1.5 action-button">
          <button
            id="camera-pip-btn"
            onClick={togglePip}
            title={isPipActive ? "Close Always-on-Top Floating Capsule" : "Spawn Always-on-Top Floating Capsule"}
            className="p-1.5 rounded-full bg-slate-900/90 hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all text-indigo-400"
          >
            <Tv size={12} />
          </button>
          
          <button
            id="camera-size-inc-btn"
            onClick={() => setSize(prev => Math.min(280, prev + 20))}
            title="Enlarge Size"
            className="p-1.5 rounded-full bg-slate-900/90 hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all"
          >
            <Maximize size={12} />
          </button>
          
          <button
            id="camera-size-dec-btn"
            onClick={() => setSize(prev => Math.max(120, prev - 20))}
            title="Shrink Size"
            className="p-1.5 rounded-full bg-slate-900/90 hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all"
          >
            <Minimize2 size={12} />
          </button>
        </div>

        {/* Snap locations presets */}
        <div className="flex gap-1 text-[9px] bg-slate-950/95 py-0.5 px-1.5 rounded-full action-button select-none border border-slate-800">
          <span className="text-slate-500 font-semibold mr-1">Snap:</span>
          <button
            onClick={() => setPosition({ x: 20, y: 20 })}
            className="px-1 text-[9px] rounded bg-slate-900 hover:bg-slate-850 hover:text-white text-indigo-300 font-bold transition-all"
            title="Top Left"
          >
            TL
          </button>
          <button
            onClick={() => setPosition({ x: window.innerWidth - size - 20, y: 20 })}
            className="px-1 text-[9px] rounded bg-slate-900 hover:bg-slate-850 hover:text-white text-indigo-300 font-bold transition-all"
            title="Top Right"
          >
            TR
          </button>
          <button
            onClick={() => setPosition({ x: 20, y: window.innerHeight - size - 20 })}
            className="px-1 text-[9px] rounded bg-slate-900 hover:bg-slate-850 hover:text-white text-indigo-300 font-bold transition-all"
            title="Bottom Left"
          >
            BL
          </button>
          <button
            onClick={() => setPosition({ x: window.innerWidth - size - 20, y: window.innerHeight - size - 20 })}
            className="px-1 text-[9px] rounded bg-slate-900 hover:bg-slate-850 hover:text-white text-indigo-300 font-bold transition-all"
            title="Bottom Right"
          >
            BR
          </button>
        </div>

        {/* Drag handle text */}
        <span className="text-[9px] font-medium tracking-wide bg-slate-950/90 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Move size={8} /> Drag Me
        </span>

        {/* Poweroff toggle */}
        <button
          id="camera-close-overlay-btn"
          onClick={onClose}
          title="Turn Camera Off"
          className="absolute top-1 right-3 action-button p-1 hover:text-red-400 transition-colors"
        >
          <Power size={12} />
        </button>
      </div>

      {/* Small Indicator if PiP Active */}
      {isPipActive && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-2">
          <Tv className="text-amber-400 animate-pulse mb-1 animate-duration-1000" size={18} />
          <span className="text-[9px] text-gray-300 font-medium tracking-tight">Active in Always-on-Top capsule</span>
          <button
            id="camera-exit-pip-btn"
            onClick={togglePip}
            className="mt-1.5 action-button text-[8px] bg-indigo-600/90 hover:bg-indigo-500 text-white font-semibold py-1 px-2 rounded-md"
          >
            Bring Back
          </button>
        </div>
      )}
    </div>
  );
}
