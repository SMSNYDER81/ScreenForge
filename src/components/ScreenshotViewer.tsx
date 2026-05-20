import React, { useRef, useEffect, useState } from 'react';
import { X, Download, Copy, Share2, Palette, Trash2, Check, Sparkles, Move } from 'lucide-react';
import { RecordingItem } from '../types';

interface ScreenshotViewerProps {
  screenshot: RecordingItem;
  onClose: () => void;
  onRename?: (id: string, newName: string) => void;
  onDelete?: (id: string) => void;
}

export default function ScreenshotViewer({ screenshot, onClose, onRename, onDelete }: ScreenshotViewerProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  
  // Annotation states
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [brushColor, setBrushColor] = useState('#f59e0b'); // Amber highlight by default
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasInited, setCanvasInited] = useState(false);

  const colors = [
    { value: '#ef4444', label: 'Red' },
    { value: '#f59e0b', label: 'Gold' },
    { value: '#10b981', label: 'Green' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#a855f7', label: 'Purple' },
    { value: '#ffffff', label: 'White' },
  ];

  useEffect(() => {
    const url = URL.createObjectURL(screenshot.blob);
    setImageUrl(url);
    setIsAnnotating(false);
    setCanvasInited(false);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [screenshot]);

  // Init canvas for annotation when modes change
  useEffect(() => {
    if (isAnnotating && canvasRef.current && imageUrl) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        // Size canvas relative to containers
        const maxWidth = Math.min(window.innerWidth - 64, 960);
        const maxHeight = window.innerHeight * 0.6;
        
        let width = img.naturalWidth || 1920;
        let height = img.naturalHeight || 1080;

        // Constraint scaling
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw original screenshot as background
        ctx.drawImage(img, 0, 0, width, height);
        setCanvasInited(true);
      };
    }
  }, [isAnnotating, imageUrl]);

  // Modern Async Clipboard API implementation
  const copyToClipboard = async () => {
    try {
      if (isAnnotating && canvasRef.current) {
        canvasRef.current.toBlob(async (blob) => {
          if (!blob) return;
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ [blob.type]: blob })
            ]);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
          } catch (clipErr) {
            console.error('Direct blob clipboard writing failed, copying dataurl:', clipErr);
            fallbackCopy(canvasRef.current!.toDataURL());
          }
        }, 'image/png');
      } else {
        await navigator.clipboard.write([
          new ClipboardItem({ [screenshot.blob.type]: screenshot.blob })
        ]);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (err) {
      console.error('Clipboard copy error, using fallback:', err);
      // Fallback
      if (imageUrl) {
        fallbackCopy(imageUrl);
      }
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {
      console.warn('Fallback copy failed as well', e);
    }
  };

  const downloadScreenshot = () => {
    const link = document.createElement('a');
    if (isAnnotating && canvasRef.current) {
      link.href = canvasRef.current.toDataURL('image/png');
    } else {
      link.href = imageUrl;
    }
    link.download = `${screenshot.name}.png`;
    link.click();
  };

  // Drawing event handlers
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getCoordinates(e);
    lastPos.current = pos;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const pos = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPos.current = pos;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const resetAnnotation = () => {
    if (canvasRef.current && imageUrl) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col gap-5 p-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <Palette size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase">SCREEN CAPTURE VIEWER</span>
            <h3 className="text-base font-bold text-white leading-tight mt-0.5">{screenshot.name}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          {/* Toggle Annotation Layer */}
          <button
            onClick={() => setIsAnnotating(!isAnnotating)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isAnnotating
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles size={13} />
            {isAnnotating ? 'Close Annotation Studio' : 'Sketch & Annotate'}
          </button>

          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1"
            title="Copy Screen Capture Image to Clipboard"
          >
            {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{isCopied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={downloadScreenshot}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-xs font-semibold flex items-center gap-1"
          >
            <Download size={14} />
            <span>Download PNG</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {isAnnotating && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-950 rounded-xl border border-slate-850">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Markers:</span>
              <div className="flex items-center gap-1">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setBrushColor(c.value)}
                    style={{ backgroundColor: c.value }}
                    className={`w-5 h-5 rounded-full transition-all relative ${
                      brushColor === c.value ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Weight:</span>
              <input
                type="range"
                min="2"
                max="12"
                step="1"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-20 accent-indigo-500 h-1.5 rounded-lg cursor-pointer bg-slate-800"
              />
              <span className="text-xs font-mono text-slate-400 w-4">{brushSize}px</span>
            </div>
          </div>

          <button
            onClick={resetAnnotation}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] uppercase font-bold text-slate-400 hover:text-white"
          >
            Erase drawings (Reset)
          </button>
        </div>
      )}

      {/* Main image content canvas */}
      <div 
        ref={containerRef}
        className="relative min-h-[300px] max-h-[60vh] rounded-xl overflow-hidden bg-slate-950 border border-slate-850 flex items-center justify-center p-2 group"
      >
        {!isAnnotating ? (
          imageUrl ? (
            <img
              src={imageUrl}
              alt="Screen capture preview"
              className="max-w-full max-h-[50vh] object-contain rounded-lg border border-slate-900 shadow-md transition-all"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="animate-pulse flex flex-col items-center justify-center text-slate-600">
              <Sparkles size={36} className="animate-spin mb-2 text-indigo-400" />
              <p className="text-xs">Preparing capture pixels...</p>
            </div>
          )
        ) : (
          <div className="relative">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="cursor-crosshair block rounded-lg border border-slate-800 shadow-lg bg-slate-950"
            />
            {(!canvasInited) && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-xs text-slate-400">
                Aligning sketch layout board...
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
        <span className="flex items-center gap-1">
          <Palette size={11} className="text-amber-500" />
          IMAGE RESOLUTION: PNG RENDER FLUID
        </span>
        <span>SIZE: {(screenshot.size / 1024).toFixed(1)} KB</span>
      </div>
    </div>
  );
}
