import React, { useRef, useEffect, useState } from 'react';
import { Pencil, Trash2, Undo, Redo, Square, Circle, Download, Sparkles, FileSpreadsheet, EyeOff, LayoutTemplate } from 'lucide-react';

interface WhiteboardProps {
  onClose?: () => void;
}

interface DrawAction {
  type: 'pencil' | 'shape';
  tool: string;
  points?: { x: number; y: number }[];
  color: string;
  size: number;
  shapeData?: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    shapeType: 'rect' | 'circle' | 'line';
  };
}

export default function Whiteboard({ onClose }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const [tool, setTool] = useState<'pencil' | 'highlighter' | 'rect' | 'circle' | 'line'>('pencil');
  const [color, setColor] = useState('#3b82f6'); // default blue
  const [size, setSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [bgStyle, setBgStyle] = useState<'black' | 'white' | 'blueprint' | 'dotted'>('blueprint');

  // Multi-step undo/redo logs
  const [history, setHistory] = useState<DrawAction[]>([]);
  const [redoList, setRedoList] = useState<DrawAction[]>([]);

  // Temp points for pencil drawing
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const colors = [
    { value: '#ef4444', label: 'Crimson' },
    { value: '#f59e0b', label: 'Gold' },
    { value: '#10b981', label: 'Green' },
    { value: '#3b82f6', label: 'Classic Blue' },
    { value: '#a855f7', label: 'Purple' },
    { value: '#ffffff', label: 'White' },
    { value: '#1e293b', label: 'Slate' },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(dpr, dpr);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;

    drawAll();

    // Handle resize
    const handleResize = () => {
      const containerRect = canvas.getBoundingClientRect();
      canvas.width = containerRect.width * dpr;
      canvas.height = containerRect.height * dpr;
      context.scale(dpr, dpr);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      drawAll();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [bgStyle, history]);

  // Redraw the grid and all recorded history steps
  const drawAll = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Grid Backgrounds
    if (bgStyle === 'black') {
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, width, height);
    } else if (bgStyle === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    } else if (bgStyle === 'blueprint') {
      ctx.fillStyle = '#101726';
      ctx.fillRect(0, 0, width, height);
      // Grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (bgStyle === 'dotted') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#334155';
      const gap = 30;
      for (let x = gap; x < width; x += gap) {
        for (let y = gap; y < height; y += gap) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 2. Draw History items
    history.forEach((act) => {
      ctx.strokeStyle = act.color;
      ctx.lineWidth = act.size;
      
      // Handle multiplier transparency for highlighter
      if (act.tool === 'highlighter') {
        ctx.globalAlpha = 0.35;
      } else {
        ctx.globalAlpha = 1.0;
      }

      if (act.type === 'pencil' && act.points && act.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(act.points[0].x, act.points[0].y);
        for (let i = 1; i < act.points.length; i++) {
          ctx.lineTo(act.points[i].x, act.points[i].y);
        }
        ctx.stroke();
      } else if (act.type === 'shape' && act.shapeData) {
        const { startX, startY, endX, endY, shapeType } = act.shapeData;
        ctx.beginPath();
        if (shapeType === 'line') {
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        } else if (shapeType === 'rect') {
          ctx.strokeRect(startX, startY, endX - startX, endY - startY);
        } else if (shapeType === 'circle') {
          const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
          ctx.arc(startX, startY, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });

    ctx.globalAlpha = 1.0; // Reset alpha
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    startPosRef.current = { x, y };

    if (tool === 'pencil' || tool === 'highlighter') {
      currentPointsRef.current = [{ x, y }];
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'pencil' || tool === 'highlighter') {
      currentPointsRef.current.push({ x, y });
      
      // Temporary draw line on canvas
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.globalAlpha = tool === 'highlighter' ? 0.35 : 1.0;
      
      const pts = currentPointsRef.current;
      if (pts.length > 1) {
        ctx.beginPath();
        ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    } else {
      // For shapes, we redraw everything and then draw the transparent preview of shape
      drawAll();
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.globalAlpha = 0.5; // draft shape opacity
      
      const startX = startPosRef.current.x;
      const startY = startPosRef.current.y;

      ctx.beginPath();
      if (tool === 'line') {
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (tool === 'rect') {
        ctx.strokeRect(startX, startY, x - startX, y - startY);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
        ctx.arc(startX, startY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1.0;
  };

  const handlePointerUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let action: DrawAction;

    if (tool === 'pencil' || tool === 'highlighter') {
      action = {
        type: 'pencil',
        tool,
        points: [...currentPointsRef.current],
        color,
        size,
      };
    } else {
      action = {
        type: 'shape',
        tool,
        color,
        size,
        shapeData: {
          startX: startPosRef.current.x,
          startY: startPosRef.current.y,
          endX: x,
          endY: y,
          shapeType: tool as 'rect' | 'circle' | 'line',
        },
      };
    }

    setHistory((prev) => [...prev, action]);
    setRedoList([]); // Clear redo timeline
    currentPointsRef.current = [];
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const item = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRedoList((prev) => [...prev, item]);
  };

  const handleRedo = () => {
    if (redoList.length === 0) return;
    const item = redoList[redoList.length - 1];
    setRedoList((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, item]);
  };

  const handleClear = () => {
    setHistory([]);
    setRedoList([]);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'whiteboard_sketch.png';
    link.href = image;
    link.click();
  };

  return (
    <div id="whiteboard-container" className="flex flex-col h-full w-full bg-slate-900 border border-slate-700/60 rounded-xl overflow-hidden shadow-2xl">
      {/* Tool Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 bg-slate-950 border-b border-indigo-950/40 text-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Sparkles size={16} />
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-100">Interactive Sketchpad</span>
            <span className="hidden sm:inline text-xs text-slate-400 ml-2">Draw visual concepts to record</span>
          </div>
        </div>

        {/* Action triggers */}
        <div className="flex items-center gap-1.5">
          <button
            id="wb-undo-btn"
            onClick={handleUndo}
            disabled={history.length === 0}
            title="Undo stroke"
            className="p-1.5 rounded-md hover:bg-slate-800 disabled:opacity-40 transition-colors text-slate-300"
          >
            <Undo size={15} />
          </button>
          
          <button
            id="wb-redo-btn"
            onClick={handleRedo}
            disabled={redoList.length === 0}
            title="Redo stroke"
            className="p-1.5 rounded-md hover:bg-slate-800 disabled:opacity-40 transition-colors text-slate-300"
          >
            <Redo size={15} />
          </button>
          
          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          <button
            id="wb-clear-btn"
            onClick={handleClear}
            title="Clear canvas"
            className="p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-400 transition-colors text-slate-300"
          >
            <Trash2 size={15} />
          </button>

          <button
            id="wb-download-btn"
            onClick={handleDownload}
            title="Export drawing as PNG"
            className="p-1.5 rounded-md hover:bg-slate-800 transition-colors text-slate-300 flex items-center gap-1.5 text-xs font-semibold px-2"
          >
            <Download size={14} /> <span className="hidden sm:inline">Export PNG</span>
          </button>

          {onClose && (
            <button
              id="wb-close-btn"
              onClick={onClose}
              className="p-1 text-xs px-2 rounded-md border border-slate-700/60 bg-slate-900 hover:bg-slate-800 text-slate-400 font-semibold"
            >
              Hide
            </button>
          )}
        </div>
      </div>

      {/* Controller toolbar and Canvas Area */}
      <div className="flex flex-1 flex-col md:flex-row relative">
        
        {/* Vertical Left Toolbar */}
        <div className="flex md:flex-col gap-3 px-3 py-2 bg-slate-950/70 border-b md:border-b-0 md:border-r border-slate-800 items-center justify-between md:justify-start">
          
          {/* Tool selectors */}
          <div className="flex md:flex-col gap-1.5">
            <span className="hidden md:inline text-[9px] text-slate-500 uppercase tracking-widest font-bold text-center mb-1">
              Tools
            </span>
            <button
              id="wb-pencil-tool"
              onClick={() => setTool('pencil')}
              title="Pencil brush"
              className={`p-2 rounded-lg transition-all ${
                tool === 'pencil' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <Pencil size={16} />
            </button>
            <button
              id="wb-highlighter-tool"
              onClick={() => setTool('highlighter')}
              title="Semi-transparent Highlighter"
              className={`p-2 rounded-lg transition-all flex items-center justify-center font-bold text-[10px] ${
                tool === 'highlighter' ? 'bg-yellow-600 text-white shadow' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              H
            </button>
            <button
              id="wb-line-tool"
              onClick={() => setTool('line')}
              title="Line drawing"
              className={`p-2 rounded-lg transition-all ${
                tool === 'line' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <span className="inline-block w-4 h-0.5 bg-current rotate-[-45deg] transform origin-center" />
            </button>
            <button
              id="wb-rect-tool"
              onClick={() => setTool('rect')}
              title="Rectangle shape"
              className={`p-2 rounded-lg transition-all ${
                tool === 'rect' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <Square size={16} />
            </button>
            <button
              id="wb-circle-tool"
              onClick={() => setTool('circle')}
              title="Circle shape"
              className={`p-2 rounded-lg transition-all ${
                tool === 'circle' ? 'bg-indigo-600 text-white shadow' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <Circle size={16} />
            </button>
          </div>

          <div className="hidden md:block w-full h-[1px] bg-slate-800 my-1" />

          {/* Color palette */}
          <div className="flex md:flex-col gap-1.5">
            <span className="hidden md:inline text-[9px] text-slate-500 uppercase tracking-widest font-bold text-center mb-1">
              Colors
            </span>
            <div className="flex md:flex-col gap-1.5">
              {colors.map((c) => (
                <button
                  key={c.value}
                  id={`wb-color-${c.label.toLowerCase()}`}
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  style={{ backgroundColor: c.value }}
                  className={`w-5 h-5 rounded-full border ring-offset-2 ring-indigo-500 transition-all ${
                    color === c.value ? 'ring-2 border-transparent scale-110' : 'border-slate-700/80 scale-100 hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="hidden md:block w-full h-[1px] bg-slate-800 my-1" />

          {/* Pen Size selector */}
          <div className="flex md:flex-col gap-1 select-none items-center">
            <span className="hidden md:inline text-[9px] text-slate-500 uppercase tracking-widest font-bold text-center mb-1">
              Stroke
            </span>
            <button
              id="wb-size-thin"
              onClick={() => setSize(2)}
              className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${size === 2 ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Thin
            </button>
            <button
              id="wb-size-med"
              onClick={() => setSize(5)}
              className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${size === 5 ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Med
            </button>
            <button
              id="wb-size-thick"
              onClick={() => setSize(12)}
              className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${size === 12 ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Thick
            </button>
          </div>

          <div className="hidden md:block w-full h-[1px] bg-slate-800 my-1" />

          {/* Theme select */}
          <div className="flex md:flex-col gap-1.5">
            <span className="hidden md:inline text-[9px] text-slate-500 uppercase tracking-widest font-bold text-center mb-1">
              Canvas
            </span>
            <div className="flex gap-1">
              <button
                id="wb-theme-blueprint"
                onClick={() => setBgStyle('blueprint')}
                title="Blueprint Blue"
                className={`w-5 h-5 rounded border border-slate-700 text-[9px] flex items-center justify-center font-bold font-mono transition-colors ${bgStyle === 'blueprint' ? 'bg-indigo-600 text-blue-100 border-indigo-400' : 'bg-slate-900 text-slate-400'}`}
              >
                BP
              </button>
              <button
                id="wb-theme-dotted"
                onClick={() => setBgStyle('dotted')}
                title="Dotted Canvas"
                className={`w-5 h-5 rounded border border-slate-700 text-[9px] flex items-center justify-center font-bold font-mono transition-colors ${bgStyle === 'dotted' ? 'bg-slate-700 text-white' : 'bg-slate-950 text-slate-400'}`}
              >
                DT
              </button>
              <button
                id="wb-theme-black"
                onClick={() => setBgStyle('black')}
                title="Blackboard Pitch Black"
                className={`w-5 h-5 rounded border border-slate-700 text-[9px] flex items-center justify-center font-bold font-mono transition-colors ${bgStyle === 'black' ? 'bg-slate-100 text-slate-950' : 'bg-slate-950 text-slate-400'}`}
              >
                BK
              </button>
            </div>
          </div>

        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[340px]">
          <canvas
            ref={canvasRef}
            id="annotation-canvas"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            className="block w-full h-full cursor-cell"
          />

          {/* Mini info overlay */}
          <div className="absolute bottom-2.5 right-3 px-2 py-1 rounded bg-slate-950/70 border border-slate-800 backdrop-blur-sm pointer-events-none select-none text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
            <LayoutTemplate size={11} className="text-indigo-400" />
            Active Board: {bgStyle.toUpperCase()}
          </div>
        </div>

      </div>
    </div>
  );
}
