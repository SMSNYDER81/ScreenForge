import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Download, Scissors, Bookmark, ChevronRight, Volume2, VolumeX, Eye, Sparkles, ExternalLink } from 'lucide-react';
import { Marker, RecordingItem } from '../types';

interface VideoEditorProps {
  recording: RecordingItem;
  onSaveTrim?: (start: number, end: number) => void;
  onClose?: () => void;
}

export default function VideoEditor({ recording, onSaveTrim, onClose }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Trim times
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // Volume controls
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Reset trimmer values when recording changes
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [recording]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const dur = video.duration || recording.duration || 0;
    setDuration(dur);
    setTrimStart(0);
    setTrimEnd(dur);
  };

  // Enforce trim limits during active play
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const cur = video.currentTime;
      setCurrentTime(cur);

      // Loop or pause if we exceed trim end
      if (cur >= trimEnd) {
        video.currentTime = trimStart;
        if (!video.paused) {
          // keep playing but loop back to trimStart
        }
      }
      if (cur < trimStart) {
        video.currentTime = trimStart;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [trimStart, trimEnd]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = trimStart;
      video.play().then(() => setIsPlaying(true));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setIsMuted(v === 0);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (videoRef.current) {
      videoRef.current.muted = nextMute;
    }
  };

  // Skip video playhead to precise timestamp
  const jumpToTime = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    // Check boundaries of trim
    const clamped = Math.max(trimStart, Math.min(seconds, trimEnd));
    video.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);

    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');

    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${mStr}:${sStr}`;
    }
    return `${mStr}:${sStr}`;
  };

  const videoUrl = React.useMemo(() => {
    return URL.createObjectURL(recording.blob);
  }, [recording.blob]);

  // Clean object URL on release
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const triggerDownload = () => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${recording.name || 'recording'}_trimmed.webm`;
    link.click();
  };

  return (
    <div id="video-editor-panel" className="flex flex-col gap-6 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl text-slate-100">
      
      {/* Editor Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Scissors size={18} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Review & Trim Clips</h3>
            <p className="text-xs text-slate-400 mt-0.5">Active Clip: {recording.name}</p>
          </div>
        </div>

        {onClose && (
          <button
            id="editor-close-btn"
            onClick={onClose}
            className="text-xs bg-slate-800 border border-slate-700/60 hover:bg-slate-700 hover:text-white px-3 py-1.5 rounded-lg text-slate-300 font-medium transition-colors"
          >
            Hide Reviewer
          </button>
        )}
      </div>

      {/* Main Grid: Player on left, Marker metadata on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Player and timeline column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          {/* Video canvas container */}
          <div className="relative rounded-xl overflow-hidden bg-black/95 border border-slate-950 aspect-video flex items-center justify-center group">
            <video
              ref={videoRef}
              id="editor-video-element"
              src={videoUrl}
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full h-full max-h-[420px] object-contain"
              playsInline
              onClick={togglePlay}
            />

            {/* Play/Pause center overlay trigger */}
            {!isPlaying && (
              <button
                id="editor-center-play-btn"
                onClick={togglePlay}
                className="absolute p-4 rounded-full bg-indigo-600/90 text-white shadow-xl hover:bg-indigo-500 hover:scale-110 active:scale-95 transition-all text-center flex items-center justify-center"
              >
                <Play size={24} fill="currentColor" className="ml-0.5" />
              </button>
            )}

            {/* Float Bottom Time HUD */}
            <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded text-xs font-mono border border-slate-800/80">
              <span className="text-emerald-400 font-bold">{formatTime(currentTime)}</span>
              <span className="text-slate-500"> / </span>
              <span className="text-slate-300">{formatTime(duration)}</span>
            </div>
            
            <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded text-xs font-semibold text-indigo-400 border border-slate-800/80 flex items-center gap-1.5">
              <Eye size={12} /> Trim Loop Active
            </div>
          </div>

          {/* Player controls row */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <button
                id="editor-play-btn"
                onClick={togglePlay}
                className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center justify-center font-bold"
                title={isPlaying ? "Pause playback" : "Start playback"}
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
              </button>
              
              <button
                id="editor-rewind-btn"
                onClick={handleRestart}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                title="Restart from loop boundary"
              >
                <RotateCcw size={15} />
              </button>
            </div>

            {/* Volume controls */}
            <div className="flex items-center gap-2">
              <button
                id="editor-mute-btn"
                onClick={toggleMute}
                className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                id="editor-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Clipping info text */}
            <div className="text-xs font-mono text-slate-400 text-right">
              Looping Interval: <span className="text-amber-400 font-semibold">{formatTime(trimStart)}</span> to <span className="text-indigo-400 font-semibold">{formatTime(trimEnd)}</span>
            </div>
          </div>

          {/* Range Slider for Clipper / Trimmer */}
          <div className="flex flex-col gap-2.5 bg-slate-950/30 p-4 rounded-xl border border-slate-800/70">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Scissors size={12} className="text-emerald-400" /> TIMELINE CRIPPER RANGE
              </span>
              <span className="text-xs text-slate-400">
                Crop duration: <span className="text-slate-200 font-semibold">{(trimEnd - trimStart).toFixed(1)}s</span> (Out of {duration.toFixed(1)}s)
              </span>
            </div>

            {/* Custom range timeline element */}
            <div className="relative pt-6 pb-2">
              <div className="absolute top-1.5 left-0 text-[10px] font-mono text-slate-500">
                0:00
              </div>
              <div className="absolute top-1.5 right-0 text-[10px] font-mono text-slate-500">
                {formatTime(duration)}
              </div>

              {/* Slider Track Background and Selected zone */}
              <div className="relative w-full h-3.5 bg-slate-950 rounded border border-slate-800 overflow-hidden">
                {/* Highlighted selection banner */}
                <div
                  style={{
                    left: `${duration ? (trimStart / duration) * 100 : 0}%`,
                    width: `${duration ? ((trimEnd - trimStart) / duration) * 100 : 100}%`,
                  }}
                  className="absolute top-0 bottom-0 bg-emerald-500/15 border-l border-r border-emerald-400"
                />

                {/* Live playhead pointer bar */}
                <div
                  style={{
                    left: `${duration ? (currentTime / duration) * 100 : 0}%`,
                  }}
                  className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-10 shadow-lg"
                />
              </div>

              {/* Slider Double Handles */}
              <div className="relative flex flex-col gap-4 mt-3">
                
                {/* Start handle */}
                <div className="flex items-center gap-3">
                  <label htmlFor="editor-trim-start" className="text-xs font-mono text-slate-500 w-16">Start Clip:</label>
                  <input
                    id="editor-trim-start"
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.1"
                    value={trimStart}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const safeVal = Math.min(val, trimEnd - 0.5);
                      setTrimStart(safeVal);
                      jumpToTime(safeVal);
                    }}
                    className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <span className="text-xs font-mono text-emerald-400 font-bold w-12 text-right">
                    {formatTime(trimStart)}
                  </span>
                </div>

                {/* End handle */}
                <div className="flex items-center gap-3">
                  <label htmlFor="editor-trim-end" className="text-xs font-mono text-slate-500 w-16">End Clip:</label>
                  <input
                    id="editor-trim-end"
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.1"
                    value={trimEnd}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const safeVal = Math.max(val, trimStart + 0.5);
                      setTrimEnd(safeVal);
                      jumpToTime(safeVal);
                    }}
                    className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-xs font-mono text-amber-400 font-bold w-12 text-right">
                    {formatTime(trimEnd)}
                  </span>
                </div>

              </div>
            </div>

            {/* Save metadata trim details trigger */}
            {onSaveTrim && (
              <button
                id="editor-save-trim-btn"
                onClick={() => onSaveTrim(trimStart, trimEnd)}
                className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition-all text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2"
              >
                <Scissors size={13} /> Apply Timeline Crop (Saves Bound)
              </button>
            )}

          </div>

        </div>

        {/* Right column: Markers list */}
        <div className="flex flex-col gap-4 bg-slate-950/20 border border-slate-800/60 p-4 rounded-xl">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Bookmark size={15} className="text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Timestamp Marks</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Click on any timestamp mark below to jump the video scrub head immediately to that record moment!
          </p>

          <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-800">
            {recording.markers && recording.markers.length > 0 ? (
              recording.markers.map((mark) => (
                <button
                  key={mark.id}
                  id={`marker-jump-${mark.id}`}
                  onClick={() => jumpToTime(mark.timestamp)}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800/60 hover:border-indigo-500/50 text-left transition-all text-slate-300 animate-fade-in group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold">
                      {formatTime(mark.timestamp)}
                    </span>
                    <span className="text-xs font-medium text-slate-200 line-clamp-1">
                      {mark.label}
                    </span>
                  </div>
                  <ChevronRight size={13} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                </button>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-lg text-slate-500">
                <Bookmark size={20} className="stroke-[1.5] mb-2 opacity-30" />
                <span className="text-xs font-medium text-slate-500">No bookmark tags added</span>
                <span className="text-[10px] text-slate-600 mt-1">Tap &quot;Add Marker&quot; on the recording HUD to tag spots.</span>
              </div>
            )}
          </div>

          {/* Action trigger download */}
          <div className="border-t border-slate-800/80 pt-3 flex flex-col gap-3">
            <div>
              <button
                id="editor-download-raw-btn"
                onClick={triggerDownload}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Download size={14} /> Download WebM Recording
              </button>
              <p className="text-[10px] font-mono text-center text-slate-500 mt-1.5 leading-tight">
                Saves a high-quality fully-playable WebM container to your computer.
              </p>
            </div>

            <div className="relative mt-2 border border-slate-800/80 bg-slate-950/40 rounded-xl p-3 border-dashed hover:border-indigo-500/30 transition-all">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Sparkles size={11} className="text-amber-450 animate-pulse" /> Producer Sibling Site
              </span>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-3 font-medium">
                Want to publish professional video campaigns? Take this recording to <strong className="text-indigo-300">The Video Forge</strong> to apply high-fidelity cloud themes and cinematic templates.
              </p>
              <a
                href="https://thevideoforge.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <span>Produce on The Video Forge</span>
                <ExternalLink size={11} className="text-indigo-400" />
              </a>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
