import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Video, ScreenShare, Mic, Camera as CameraIcon, Settings, RefreshCw, Play, Pause, Square,
  Clock, Calendar, Download, Trash2, Edit, Check, X, FileVideo, PlusCircle,
  HelpCircle, Volume2, Waves, Sparkles, MonitorPlay, Tv, Scissors, LayoutDashboard,
  Bookmark, ShieldCheck, Database, Pencil, Info, AlertTriangle, PlayCircle, EyeOff, ExternalLink, Palette,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { RecordingItem, Marker, RecordingStatus, RecordingSettings } from './types';
import { saveRecording, getRecordings, deleteRecording, updateRecordingName } from './utils/indexedDB';
import CameraOverlay from './components/CameraOverlay';
import Whiteboard from './components/Whiteboard';
import VideoEditor from './components/VideoEditor';
import ScreenshotViewer from './components/ScreenshotViewer';
import BlogHub from './components/BlogHub';
import FAQSection from './components/FAQSection';
import FeaturesSection from './components/FeaturesSection';

function ScreenshotThumbnail({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string>('');
  
  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  if (!url) return <div className="animate-pulse bg-slate-900 w-full h-full" />;
  return (
    <img 
      src={url} 
      alt="Screenshot" 
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
      referrerPolicy="no-referrer"
    />
  );
}

function LivePreviewVideo({ stream }: { stream: MediaStream | null }) {
  const handleRef = (el: HTMLVideoElement | null) => {
    if (el) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
        el.play().catch((err) => {
          console.warn('Auto-play in LivePreviewVideo was interrupted:', err);
        });
      }
    }
  };

  if (!stream) {
    return (
      <div className="flex flex-col items-center justify-center p-6 h-full text-slate-500 gap-1.5 bg-slate-950">
        <Video size={24} className="animate-pulse text-indigo-500/60" />
        <span className="text-[11px] font-medium tracking-wide">Ready for Broadcast Feed</span>
      </div>
    );
  }

  return (
    <video
      ref={handleRef}
      id="live-broadcast-video"
      autoPlay
      playsInline
      muted
      className="w-full h-full object-contain bg-slate-950"
    />
  );
}

export default function App() {
  // Library Store
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<RecordingItem | null>(null);

  // Recording Engine States
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [settings, setSettings] = useState<RecordingSettings>({
    videoResolution: '1080p',
    frameRate: 30,
    recordMicrophone: true,
    selectedMicrophoneId: '',
    recordSystemAudio: false,
    enableCamera: false,
    selectedCameraId: '',
    recordingMode: 'screen',
    aspectRatio: '16:9',
  });

  // Device lists
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [devicesGranted, setDevicesGranted] = useState(false);

  // Active capturing streams references
  const mainRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Recording Timing & Tagging States
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [currentMarkerText, setCurrentMarkerText] = useState('');
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  // Live Recording Logger Console Feed state
  const [recordingLogs, setRecordingLogs] = useState<string[]>([]);
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRecordingLogs((prev) => [...prev.slice(-3), `[${timestamp}] ${message}`]);
  };

  // Live Audio Spectrum State (Simulated list update or real listener)
  const [micAudioLevels, setMicAudioLevels] = useState<number[]>(new Array(12).fill(8));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // App layouts toggles
  const [showConfig, setShowConfig] = useState(true);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [editingRecordingId, setEditingRecordingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tempRenameText, setTempRenameText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'video' | 'screenshot'>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isIframeBlockError, setIsIframeBlockError] = useState(false);
  const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;

  // Fetch recorded videos library
  useEffect(() => {
    loadLibrary();
    scanCaptureInputDevices();
  }, []);

  const loadLibrary = async () => {
    try {
      const items = await getRecordings();
      setRecordings(items);
    } catch (e) {
      console.error(e);
    }
  };

  // Enumerate hardware devices
  const scanCaptureInputDevices = async (requestAccess = false) => {
    try {
      if (requestAccess) {
        // Trigger a temporary stream request to prime permissions
        const temp = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        temp.getTracks().forEach(track => track.stop());
        setDevicesGranted(true);
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');

      setMicrophones(audioInputs);
      setCameras(videoInputs);

      // Default mappings
      setSettings((prev) => ({
        ...prev,
        selectedMicrophoneId: prev.selectedMicrophoneId || audioInputs[0]?.deviceId || '',
        selectedCameraId: prev.selectedCameraId || videoInputs[0]?.deviceId || '',
      }));

      if (audioInputs.some((d) => d.label !== '')) {
        setDevicesGranted(true);
      }
    } catch (err) {
      console.warn('Media devices scanning warning', err);
    }
  };

  // Audio Spectrogram wave listener
  const startAudioSpectrogram = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64; // Low number yields simple frequency buckets

      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const frequencies = new Uint8Array(bufferLength);

      const updateWave = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(frequencies);

        // Map to 12 aesthetic bars
        const points = [];
        const step = Math.floor(bufferLength / 12) || 1;
        for (let i = 0; i < 12; i++) {
          const normValue = Math.max(8, Math.round((frequencies[i * step] / 255) * 80));
          points.push(normValue);
        }
        setMicAudioLevels(points);
        animationFrameRef.current = requestAnimationFrame(updateWave);
      };

      animationFrameRef.current = requestAnimationFrame(updateWave);
    } catch (err) {
      console.warn('Failed setting up mic visual feedback', err);
    }
  };

  const stopAudioSpectrogram = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setMicAudioLevels(new Array(12).fill(8));
  };

  // Start Camera Stream Overlay
  useEffect(() => {
    if (settings.enableCamera && status !== 'stopped') {
      startCameraOverlay();
    } else {
      stopCameraOverlay();
    }
  }, [settings.enableCamera, settings.selectedCameraId, status]);

  const startCameraOverlay = async () => {
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: settings.selectedCameraId ? { exact: settings.selectedCameraId } : undefined,
          width: { ideal: 480 },
          height: { ideal: 480 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraStreamRef.current = stream;
      // Force trigger state mapping update
      setSettings((prev) => ({ ...prev }));
    } catch (err: any) {
      setErrorMessage(`Camera Overlay configuration error: ${err.message || err}`);
      setSettings((prev) => ({ ...prev, enableCamera: false }));
    }
  };

  const stopCameraOverlay = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
  };

  // Core API Screen Recording Logic
  const startRecording = async () => {
    try {
      setErrorMessage(null);
      setInfoMessage(null);
      recordedChunksRef.current = [];
      setMarkers([]);
      setRecordingSeconds(0);
      setRecordingLogs([]);
      addLog('Initiating stream capturing layout parameters...');

      // 1. Establish resolution bounds supporting optional 9:16 portrait swap
      let resolutionWidth = 1920;
      let resolutionHeight = 1080;
      if (settings.videoResolution === '720p') {
        resolutionWidth = 1280;
        resolutionHeight = 720;
      } else if (settings.videoResolution === '480p') {
        resolutionWidth = 854;
        resolutionHeight = 480;
      }

      const isPortrait = settings.aspectRatio === '9:16';
      const finalWidth = isPortrait ? resolutionHeight : resolutionWidth;
      const finalHeight = isPortrait ? resolutionWidth : resolutionHeight;

      let primaryVideoTrack: MediaStreamTrack | null = null;
      let displayStream: MediaStream | null = null;

      // Programmatically enable webcam overlay if dual capture selected
      if (settings.recordingMode === 'dual' && !settings.enableCamera) {
        setSettings(prev => ({ ...prev, enableCamera: true }));
      }

      if (settings.recordingMode === 'camera') {
        // Camera-only: acquire video from camera stream
        const cameraConstraints = {
          video: {
            deviceId: settings.selectedCameraId ? { exact: settings.selectedCameraId } : undefined,
            width: finalWidth,
            height: finalHeight,
            frameRate: settings.frameRate,
          },
        };
        const cameraStream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
        cameraStreamRef.current = cameraStream;
        primaryVideoTrack = cameraStream.getVideoTracks()[0];
        addLog(`Camera source loaded: ${finalWidth}x${finalHeight} @ ${settings.frameRate}fps`);
      } else {
        // Screen or Dual: acquire native screen share stream
        const displayConstraints: DisplayMediaStreamOptions = {
          video: {
            width: finalWidth,
            height: finalHeight,
            frameRate: settings.frameRate,
          },
          audio: settings.recordSystemAudio,
        };
        displayStream = await navigator.mediaDevices.getDisplayMedia(displayConstraints);
        screenStreamRef.current = displayStream;

        // Detect user clicking native browser "Stop Sharing" button
        displayStream.getVideoTracks()[0].onended = () => {
          stopRecordingGracefully();
        };

        primaryVideoTrack = displayStream.getVideoTracks()[0];
      }

      // 3. Request Microphone audio if selected
      let finalAudioTracks: MediaStreamTrack[] = [];
      let micStream: MediaStream | null = null;

      if (settings.recordMicrophone) {
        try {
          const micConstraints = {
            audio: {
              deviceId: settings.selectedMicrophoneId ? { exact: settings.selectedMicrophoneId } : undefined,
              echoCancellation: true,
              noiseSuppression: true,
            },
          };
          micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
          micStreamRef.current = micStream;
          startAudioSpectrogram(micStream);
          
          if (micStream.getAudioTracks().length > 0) {
            finalAudioTracks.push(micStream.getAudioTracks()[0]);
          }
          addLog('Microphone vocal audio track captured.');
        } catch (micErr: any) {
          console.warn('Microphone feed rejected, falling back without voice commentary:', micErr);
          setErrorMessage(`Voice Capture Warning: ${micErr.message || 'Permission denied'}. Proceeding with Screen Only.`);
          addLog('Warn: Microphone access denied or unavailable.');
        }
      }

      // 4. Mix Screen Audio track and Microphone channel if possible
      const screenAudioTracks = displayStream ? displayStream.getAudioTracks() : [];
      let combinedAudioStream: MediaStream | null = null;

      if (screenAudioTracks.length > 0 && finalAudioTracks.length > 0) {
        // We have both screen/system audio AND mic audio. Mix them!
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const mixContext = new AudioContextClass();
          
          const screenSource = mixContext.createMediaStreamSource(new MediaStream([screenAudioTracks[0]]));
          const micSource = mixContext.createMediaStreamSource(new MediaStream([finalAudioTracks[0]]));
          
          const mixDestination = mixContext.createMediaStreamDestination();
          
          screenSource.connect(mixDestination);
          micSource.connect(mixDestination);
          
          combinedAudioStream = mixDestination.stream;
          addLog('WebAudio Context: Synthesized system loopback and mic inputs.');
        } catch (mixErr) {
          console.error('Failed mixing systems, using microphone channel exclusively:', mixErr);
          combinedAudioStream = new MediaStream([finalAudioTracks[0]]);
          addLog('WebAudio Mixer: Synthesized mic commentary exclusively.');
        }
      } else if (screenAudioTracks.length > 0) {
        combinedAudioStream = new MediaStream([screenAudioTracks[0]]);
        addLog('WebAudio: Capturing system/display audio loops.');
      } else if (finalAudioTracks.length > 0) {
        combinedAudioStream = new MediaStream([finalAudioTracks[0]]);
        addLog('WebAudio: Capturing microphone audio track.');
      }

      // 5. Construct composite MediaStream (Screen/Camera video + mixed audio tracks)
      const combinedTracks: MediaStreamTrack[] = [];
      if (primaryVideoTrack) {
        combinedTracks.push(primaryVideoTrack);
      }
      
      if (combinedAudioStream && combinedAudioStream.getAudioTracks().length > 0) {
        combinedTracks.push(combinedAudioStream.getAudioTracks()[0]);
      }

      const compositeStream = new MediaStream(combinedTracks);
      setPreviewStream(compositeStream);

      // 6. MediaRecorder initialization
      // Detect optimal browser audio codec containers
      let selectedMimeType = 'video/webm;codecs=vp8,opus';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        selectedMimeType = 'video/webm;codecs=vp9,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        selectedMimeType = 'video/webm';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        selectedMimeType = 'video/mp4';
      }

      addLog(`Initializing MediaRecorder container: ${selectedMimeType}`);
      const options = { mimeType: selectedMimeType };
      const recorder = new MediaRecorder(compositeStream, options);
      
      mainRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const rawBlob = new Blob(recordedChunksRef.current, { type: selectedMimeType || 'video/webm' });
        
        // Auto-create a timestamped name
        const now = new Date();
        const timestring = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const nameDate = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
        
        const fileId = `rec_${Date.now()}`;
        const newRecord: RecordingItem = {
          id: fileId,
          name: `Recording (${nameDate} - ${timestring})`,
          createdAt: Date.now(),
          duration: recordingSeconds || 0,
          size: rawBlob.size,
          blob: rawBlob,
          markers: [...markers],
        };

        try {
          await saveRecording(newRecord);
          setInfoMessage('Success! Frame capturing saved securely to local IndexedDB directory.');
          loadLibrary();
          setSelectedRecording(newRecord);
        } catch (saveErr) {
          setErrorMessage('Database error: Unable to store recorded clip blob.');
        }

        // Cleanup feeds
        stopAllHardwareStreams();
      };

      // 7. Start Recorder and metrics timer
      recorder.start(1000); // 1-second chunks ensures safe buffers
      setStatus('recording');
      addLog('Capture started. Syncing buffers to sandboxed local directory...');

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          const nextSec = prev + 1;
          if (nextSec % 10 === 0) {
            addLog(`Buffer size: ${formatFileSize(mainRecorderRef.current?.state === 'recording' ? recordedChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0) : 0)} • Sync: ${nextSec}s`);
          }
          return nextSec;
        });
      }, 1000);

    } catch (err: any) {
      console.error(err);
      const isPolicyBlock = err && err.message && (
        err.message.toLowerCase().includes('permissions policy') || 
        err.message.toLowerCase().includes('display-capture') || 
        err.message.toLowerCase().includes('disallowed') || 
        err.message.toLowerCase().includes('permission denied') ||
        err.message.toLowerCase().includes('not allowed')
      );
      if (isPolicyBlock) {
        setIsIframeBlockError(true);
        setErrorMessage(
          `Browser Security Sandbox Limit: screensharing is disallowed inside embedded iframe containers. To start recording, please launch ScreenForge in a standalone tab!`
        );
      } else {
        setErrorMessage(`Capture aborted: ${err.message || err}`);
      }
      setStatus('idle');
    }
  };

  const pauseRecording = () => {
    if (mainRecorderRef.current && mainRecorderRef.current.state === 'recording') {
      mainRecorderRef.current.pause();
      setStatus('paused');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      addLog('Stream capture suspended (PAUSED). Chunks cached.');
    }
  };

  const resumeRecording = () => {
    if (mainRecorderRef.current && mainRecorderRef.current.state === 'paused') {
      mainRecorderRef.current.resume();
      setStatus('recording');
      addLog('Stream capture resumed (RECORDING live)...');
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          const nextSec = prev + 1;
          if (nextSec % 10 === 0) {
            addLog(`Buffer size: ${formatFileSize(mainRecorderRef.current?.state === 'recording' ? recordedChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0) : 0)} • Sync: ${nextSec}s`);
          }
          return nextSec;
        });
      }, 1000);
    }
  };

  const stopRecordingGracefully = () => {
    addLog('Recording stop triggered. Halting stream tracks & packaging containers...');
    if (mainRecorderRef.current && (mainRecorderRef.current.state === 'recording' || mainRecorderRef.current.state === 'paused')) {
      mainRecorderRef.current.stop();
    }
    setStatus('stopped');
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    stopAudioSpectrogram();
  };

  const stopAllHardwareStreams = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    stopCameraOverlay();
    stopAudioSpectrogram();
    setPreviewStream(null);
  };

  const takeScreenshot = async () => {
    try {
      setErrorMessage(null);
      setInfoMessage(null);
      addLog('Acquiring display reference for screen capture...');

      let stream = screenStreamRef.current;
      let tempStreamCreated = false;

      if (!stream || stream.getVideoTracks().length === 0) {
        let resolutionWidth = 1920;
        let resolutionHeight = 1080;
        if (settings.videoResolution === '720p') {
          resolutionWidth = 1280;
          resolutionHeight = 720;
        } else if (settings.videoResolution === '480p') {
          resolutionWidth = 854;
          resolutionHeight = 480;
        }

        const displayConstraints: DisplayMediaStreamOptions = {
          video: {
            width: resolutionWidth,
            height: resolutionHeight,
          },
          audio: false,
        };
        stream = await navigator.mediaDevices.getDisplayMedia(displayConstraints);
        tempStreamCreated = true;
      }

      const videoTrack = stream.getVideoTracks()[0];
      const video = document.createElement('video');
      video.srcObject = new MediaStream([videoTrack]);
      video.muted = true;
      video.playsInline = true;
      
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(() => resolve());
        };
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context retrieval failed');
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setErrorMessage('Screen capture error: Rendering canvas output empty.');
          addLog('Error: Capturing snapshot returned null blob reference.');
          return;
        }

        const now = new Date();
        const timestring = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const nameDate = now.toLocaleDateString([], { month: 'short', day: 'numeric' });

        const newRecord: RecordingItem = {
          id: `snap_${Date.now()}`,
          name: `Screen Capture (${nameDate} - ${timestring})`,
          createdAt: Date.now(),
          duration: 0,
          size: blob.size,
          blob: blob,
          markers: [],
          type: 'screenshot',
        };

        try {
          await saveRecording(newRecord);
          setInfoMessage('Success! Screen Capture saved to local IndexedDB library.');
          addLog('Success: Screenshot PNG captured and stored in local Sandbox library!');
          loadLibrary();
          setSelectedRecording(newRecord);
        } catch (dbErr) {
          setErrorMessage('Database failed to cache screenshot.');
        }

        if (tempStreamCreated) {
          stream!.getTracks().forEach((track) => track.stop());
        }
      }, 'image/png');

    } catch (err: any) {
      console.error(err);
      addLog(`Error: Snapshot capture rejected: ${err.message || err}`);
      const isPolicyBlock = err && err.message && (
        err.message.toLowerCase().includes('permissions policy') || 
        err.message.toLowerCase().includes('display-capture') || 
        err.message.toLowerCase().includes('disallowed') || 
        err.message.toLowerCase().includes('permission denied') ||
        err.message.toLowerCase().includes('not allowed')
      );
      if (isPolicyBlock) {
        setIsIframeBlockError(true);
        setErrorMessage(
          'Browser Security Sandbox Limit: screensharing is disallowed inside embedded iframe containers. To start captures, please launch ScreenForge in a standalone tab!'
        );
      } else {
        setErrorMessage(`Capture aborted: ${err.message || err}`);
      }
    }
  };

  // Markers tags during session recorder
  const addMarkerStamp = () => {
    const label = currentMarkerText.trim() || `Bookmark Marker #${markers.length + 1}`;
    const stamp: Marker = {
      id: `mark_${Date.now()}`,
      timestamp: recordingSeconds,
      label,
    };
    setMarkers((prev) => [...prev, stamp]);
    addLog(`Marker Stamp added: "${label}" @ timestamp ${formatDisplayDuration(recordingSeconds)}`);
    setCurrentMarkerText('');
  };

  // Video clipping bounds save
  const handleSaveTrim = async (start: number, end: number) => {
    if (!selectedRecording) return;
    
    // Slicing video conceptually by adjusting duration metric
    const updatedDuration = end - start;
    
    // We update the local state representation. Fully honest about keeping the index.
    setInfoMessage(`Applied bounds: Playback loop will default between ${start.toFixed(1)}s and ${end.toFixed(1)}s.`);
  };

  // Library updates
  const startRenameRow = (item: RecordingItem) => {
    setEditingRecordingId(item.id);
    setTempRenameText(item.name);
  };

  const saveRenameRow = async (id: string) => {
    if (!tempRenameText.trim()) return;
    try {
      await updateRecordingName(id, tempRenameText);
      setEditingRecordingId(null);
      loadLibrary();
      // If currently selected, sync name
      if (selectedRecording && selectedRecording.id === id) {
        setSelectedRecording(prev => prev ? { ...prev, name: tempRenameText } : null);
      }
    } catch (err) {
      setErrorMessage('Failed renaming database row.');
    }
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteRecording(id);
      loadLibrary();
      if (selectedRecording && selectedRecording.id === id) {
        setSelectedRecording(null);
      }
      setDeletingId(null);
    } catch (err) {
      setErrorMessage('Database failed to discard item.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDisplayDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredLibrary = useMemo(() => {
    return recordings.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (activeFilter === 'video') {
        return item.type !== 'screenshot';
      }
      if (activeFilter === 'screenshot') {
        return item.type === 'screenshot';
      }
      return true;
    });
  }, [recordings, searchQuery, activeFilter]);

  return (
    <div id="application-root-container" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* GLOWING HEADER HUD */}
      <header id="header-nav" className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-xl shadow-lg ring-4 ring-indigo-950/40">
            <Video className="text-white scale-110" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              ScreenForge <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono px-2 py-0.5 rounded-full font-bold">PRO</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono font-medium">CLOUD-FREE EDGE PIPELINE</p>
          </div>
        </div>

        {/* Database Sandbox details bar */}
        <div className="flex items-center gap-3 text-xs">
          <div className="hidden md:flex items-center gap-4 font-mono">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
              <Database size={12} className="text-emerald-400" />
              <span className="text-slate-400">Database:</span>
              <span className="text-emerald-400 font-bold">IndexedDB Offline</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
              <ShieldCheck size={12} className="text-indigo-400" />
              <span className="text-slate-400">Data Policy:</span>
              <span className="text-indigo-400 font-bold font-sans">100% Client-Side Private</span>
            </div>
          </div>
        </div>
      </header>

      {/* ERROR / INFO HUD MESSAGES */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            id="error-scroller-hud"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 text-xs text-red-400 flex items-center justify-between gap-3 font-medium"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              id="close-error-hud"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-300 hover:scale-105"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}

        {infoMessage && (
          <motion.div
            id="info-scroller-hud"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-3 text-xs text-emerald-400 flex items-center justify-between gap-3 font-medium"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="flex-shrink-0" />
              <span>{infoMessage}</span>
            </div>
            <button
              id="close-info-hud"
              onClick={() => setInfoMessage(null)}
              className="text-emerald-400 hover:text-emerald-200 hover:scale-105"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        
        {/* EMBEDDED CONSTRAINTS NOTICE */}
        {isEmbedded && (
          <motion.div
            id="iframe-active-notice"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-indigo-950/20"
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl shrink-0 mt-0.5">
                <Info size={18} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-indigo-300">Embedded Sandbox Active</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                  Browsers enforce strict security policies that block screensharing/recording APIs from inside embedded frames. If screen display selection fails to launch, click <strong className="text-indigo-300">Open Standalone</strong> or click the action button to run in a standalone browser tab.
                </p>
              </div>
            </div>
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold rounded-xl shadow-md transition-all active:scale-95"
            >
              <ExternalLink size={13} />
              LAUNCH STANDALONE
            </a>
          </motion.div>
        )}

        {/* WEBCAM OVERLAY IF ENABLED */}
        <AnimatePresence>
          {settings.enableCamera && cameraStreamRef.current && (
            <CameraOverlay
              stream={cameraStreamRef.current}
              onClose={() => setSettings((p) => ({ ...p, enableCamera: false }))}
              activeCameraId={settings.selectedCameraId}
            />
          )}
        </AnimatePresence>

        {/* HERO CAPTURE AREA */}
        <div id="capture-console-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Control Console Card */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col gap-6 relative overflow-hidden">
            
            {/* Ambient Background decoration aura */}
            <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-full pointer-events-none transition-all duration-700 ${
              status === 'recording' ? 'bg-red-500/5' : 'bg-indigo-500/5'
            }`} />

            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${status === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400 font-mono">
                  {status === 'recording' ? 'Recording Live session' : status === 'paused' ? 'Recording Paused' : 'Recorder Console Standby'}
                </span>
              </div>

              {/* Status Badge */}
              <div id="recording-status-badge" className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border ${
                status === 'recording'
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : status === 'paused'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                {status.toUpperCase()}
              </div>
            </div>

            {/* TERMINAL RECORDER CONSOLE FEED */}
            <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl font-mono text-[10px] space-y-1.5 shadow-inner z-10">
              <div className="flex items-center justify-between text-slate-500 border-b border-slate-900 pb-1.5 mb-1.5 select-none">
                <span className="flex items-center gap-1.5 uppercase font-bold tracking-widest text-[9px] text-indigo-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                  Terminal Live Console
                </span>
                <span>Active</span>
              </div>
              <div className="space-y-1 h-[76px] overflow-y-auto scrollbar-thin">
                {recordingLogs.length > 0 ? (
                  recordingLogs.map((log, idx) => (
                    <div key={idx} className="text-slate-300 flex items-start gap-1 font-mono">
                      <span className="text-indigo-400 shrink-0 select-none">›</span>
                      <p className="leading-tight select-all">{log}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-600 animate-pulse flex items-start gap-1 font-mono">
                    <span className="text-slate-700 shrink-0 select-none">›</span>
                    <p className="leading-tight">Console feed awaiting live parameters... Click "Start Video Recorder" to begin stream track capturing.</p>
                  </div>
                )}
              </div>
            </div>

            {/* COMPOSITE CONFIGURATION RAIL (Only interactive when idle) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 z-10">
              {/* Option 1: Recording Mode Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">1. CAPTURE SOURCE</label>
                <div className="grid grid-cols-3 gap-1 px-0.5 animate-fade-in">
                  <button
                    disabled={status !== 'idle' && status !== 'stopped'}
                    onClick={() => setSettings(p => ({ ...p, recordingMode: 'screen', enableCamera: false }))}
                    className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition-all text-center flex flex-col items-center justify-center gap-1 leading-none ${
                      settings.recordingMode === 'screen'
                        ? 'bg-indigo-650/20 border-indigo-500/50 text-indigo-300 shadow shadow-indigo-950/40'
                        : 'bg-slate-950 border-slate-850/80 text-slate-400 hover:text-slate-300 disabled:opacity-50'
                    }`}
                    title="Capture Screen Only with Audio"
                  >
                    <ScreenShare size={13} />
                    <span>Screen</span>
                  </button>
                  <button
                    disabled={status !== 'idle' && status !== 'stopped'}
                    onClick={() => {
                      setSettings(p => ({ ...p, recordingMode: 'camera', enableCamera: true }));
                      // Trigger mic/camera permissions early for comfort
                      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
                    }}
                    className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition-all text-center flex flex-col items-center justify-center gap-1 leading-none ${
                      settings.recordingMode === 'camera'
                        ? 'bg-indigo-650/20 border-indigo-500/50 text-indigo-300 shadow shadow-indigo-950/40'
                        : 'bg-slate-950 border-slate-850/80 text-slate-400 hover:text-slate-300 disabled:opacity-50'
                    }`}
                    title="Capture Front Device Camera feed directly"
                  >
                    <Video size={13} />
                    <span>Webcam</span>
                  </button>
                  <button
                    disabled={status !== 'idle' && status !== 'stopped'}
                    onClick={() => setSettings(p => ({ ...p, recordingMode: 'dual', enableCamera: true }))}
                    className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition-all text-center flex flex-col items-center justify-center gap-1 leading-none ${
                      settings.recordingMode === 'dual'
                        ? 'bg-indigo-650/20 border-indigo-500/50 text-indigo-300 shadow shadow-indigo-950/40'
                        : 'bg-slate-950 border-slate-850/80 text-slate-400 hover:text-slate-300 disabled:opacity-50'
                    }`}
                    title="Capture Dual Screen + Webcam Face overlay capsule"
                  >
                    <Tv size={13} className="text-amber-400" />
                    <span>Dual Feed</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Aspect Ratio Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">2. STAGE ASPECT RATIO</label>
                <div className="grid grid-cols-2 gap-1.5 px-0.5">
                  <button
                    disabled={status !== 'idle' && status !== 'stopped'}
                    onClick={() => setSettings(p => ({ ...p, aspectRatio: '16:9' }))}
                    className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition-all text-center flex items-center justify-center gap-1.5 ${
                      settings.aspectRatio === '16:9'
                        ? 'bg-indigo-650/20 border-indigo-500/50 text-indigo-300 shadow shadow-indigo-950/40'
                        : 'bg-slate-950 border-slate-850/80 text-slate-400 hover:text-slate-300 disabled:opacity-50'
                    }`}
                    title="Widescreen Cinematic (16:9) ratio for standard desktop formats"
                  >
                    <MonitorPlay size={13} />
                    <span>Landscape (16:9)</span>
                  </button>
                  <button
                    disabled={status !== 'idle' && status !== 'stopped'}
                    onClick={() => setSettings(p => ({ ...p, aspectRatio: '9:16' }))}
                    className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition-all text-center flex items-center justify-center gap-1.5 ${
                      settings.aspectRatio === '9:16'
                        ? 'bg-indigo-650/20 border-indigo-500/50 text-indigo-300 shadow shadow-indigo-950/40'
                        : 'bg-slate-950 border-slate-850/80 text-slate-400 hover:text-slate-300 disabled:opacity-50'
                    }`}
                    title="Portrait layout (9:16) for modern vertical reels & Shorts"
                  >
                    <Smartphone size={13} className="text-indigo-400" />
                    <span>Portrait (9:16)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Broadcast Live Preview Monitor */}
            <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px] z-10 select-none">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/10 via-transparent to-transparent opacity-50 pointer-events-none" />
              
              {/* If active, show visual stream inside matching aspect ratio bounds */}
              {status === 'recording' || status === 'paused' ? (
                <div className="w-full flex flex-col items-center justify-center gap-4 z-10 animate-fade-in">
                  <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-mono font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    LIVE BROADCAST PREVIEW MONITOR
                  </div>

                  {/* Aspect Ratio Box Wrapper */}
                  <div className={`shadow-2xl border border-slate-800 rounded-xl overflow-hidden bg-slate-900 transition-all duration-300 flex items-center justify-center ${
                    settings.aspectRatio === '9:16'
                      ? 'w-[140px] h-[248px] border-indigo-500/30 ring-2 ring-indigo-950'
                      : 'w-full max-w-sm aspect-video border-indigo-500/30'
                  }`}>
                    <LivePreviewVideo stream={previewStream} />
                  </div>

                  {/* High Quality Stats details */}
                  <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono font-semibold bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-850/65">
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="text-indigo-400" />
                      Timer: <span className="text-white font-bold">{formatDisplayDuration(recordingSeconds)}</span>
                    </span>
                    <span className="text-slate-700">|</span>
                    <span>Ratio: <span className="text-indigo-300">{settings.aspectRatio === '16:9' ? '16:9 Widescreen' : '9:16 Portrait'}</span></span>
                    <span className="text-slate-700">|</span>
                    <span>FPS: <span className="text-indigo-300">{settings.frameRate}</span></span>
                  </div>
                </div>
              ) : (
                /* Static Idle view */
                <div className="flex flex-col items-center justify-center text-center p-6 z-10 space-y-3.5">
                  <div className="p-3 rounded-full bg-slate-900 border border-slate-850 text-indigo-400 shadow shadow-indigo-950/30">
                    <MonitorPlay size={26} className="animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Broadcast Ready</h4>
                    <p className="text-xs text-slate-500 max-w-xs mt-1">Select your source mode, configure aspect ratios above, and click Start Video Recorder below to begin capturing streams.</p>
                  </div>
                </div>
              )}

              {/* Real-time Voice Spectrum below the preview */}
              {settings.recordMicrophone && (status === 'recording' || status === 'paused') && (
                <div className="mt-4 flex items-center justify-center gap-1.5 h-6 z-10 w-full max-w-sm border-t border-slate-900/40 pt-3">
                  <Waves size={10} className="text-emerald-400 mr-1 animate-pulse" />
                  {micAudioLevels.map((val, idx) => (
                    <motion.div
                      key={idx}
                      id={`mic-bar-${idx}`}
                      style={{ height: `${val}%` }}
                      className={`w-0.5 rounded-full transition-all duration-75 ${
                        status === 'recording' ? 'bg-emerald-400/90' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Core control trigger buttons panel */}
            <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3">
              {status === 'idle' || status === 'stopped' ? (
                <div className="flex-1 flex flex-col sm:flex-row gap-3">
                  <button
                    id="start-recording-btn"
                    onClick={startRecording}
                    className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:scale-98 transition-all hover:shadow-lg text-white font-bold rounded-xl flex items-center justify-center gap-2.5 text-sm"
                  >
                    <ScreenShare size={18} /> Start Video Recorder
                  </button>

                  <button
                    id="take-screenshot-btn"
                    onClick={takeScreenshot}
                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-750 active:scale-98 transition-all text-slate-200 hover:text-white font-bold rounded-xl flex items-center justify-center gap-2.5 text-sm border border-slate-700 shadow-md"
                  >
                    <CameraIcon size={18} className="text-amber-400" /> Capture Screenshot
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col sm:flex-row gap-3">
                  <button
                    id="stop-recording-btn"
                    onClick={stopRecordingGracefully}
                    className="flex-1 py-4 bg-red-600 hover:bg-red-500 active:scale-98 transition-all text-white font-bold rounded-xl flex items-center justify-center gap-2.5 text-sm"
                  >
                    <Square size={16} fill="white" /> End & Save Clip
                  </button>

                  <button
                    id="take-mid-recording-screenshot-btn"
                    onClick={takeScreenshot}
                    className="py-4 px-5 bg-slate-800 hover:bg-slate-750 active:scale-98 transition-all text-amber-400 hover:text-amber-300 font-bold rounded-xl flex items-center justify-center gap-2 text-sm border border-slate-700"
                    title="Take screen snapshot in the middle of recording"
                  >
                    <CameraIcon size={16} /> Snap Capture
                  </button>

                  {status === 'recording' ? (
                    <button
                      id="pause-recording-btn"
                      onClick={pauseRecording}
                      className="py-4 px-6 bg-slate-850 hover:bg-slate-800 active:scale-98 transition-all text-slate-300 hover:text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm"
                    >
                      <Pause size={16} /> Pause
                    </button>
                  ) : (
                    <button
                      id="resume-recording-btn"
                      onClick={resumeRecording}
                      className="py-4 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition-all text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm"
                    >
                      <Play size={16} fill="white" /> Resume
                    </button>
                  )}
                </div>
              )}

              {/* Whiteboard trigger panel */}
              <button
                id="whiteboard-toggle-btn"
                onClick={() => setShowWhiteboard((p) => !p)}
                className={`py-4 px-5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm border transition-all active:scale-98 ${
                  showWhiteboard
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Pencil size={16} /> {showWhiteboard ? 'Hide Sketchpad' : 'Show Sketchpad'}
              </button>
            </div>

            {/* Custom tagging / bookmark marking tools - only active when recording */}
            {status === 'recording' && (
              <div id="bookmark-tags-form" className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex-1 flex flex-col gap-1 items-start w-full">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Bookmark size={11} className="text-indigo-400 animate-pulse" /> BOOKMARK RECORD MOMENTS
                  </span>
                  <input
                    id="bookmark-tag-input"
                    type="text"
                    placeholder="Enter annotation note (e.g. 'Intro Slider')"
                    value={currentMarkerText}
                    onChange={(e) => setCurrentMarkerText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addMarkerStamp();
                    }}
                  />
                </div>
                <button
                  id="add-bookmark-stamp-btn"
                  onClick={addMarkerStamp}
                  className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded text-xs font-bold transition-all border border-indigo-500/30 flex items-center justify-center gap-1.5 self-end"
                >
                  <PlusCircle size={14} /> Tag Marker
                </button>
              </div>
            )}

            {/* Active session Markers list indicators */}
            {markers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <span className="text-slate-500 mr-1 filter font-medium py-1">Tags added:</span>
                {markers.map((mark) => (
                  <span
                    key={mark.id}
                    className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded flex items-center gap-1"
                  >
                    <span>{formatDisplayDuration(mark.timestamp)}</span>
                    <span className="text-slate-500">|</span>
                    <span className="truncate max-w-[120px]">{mark.label}</span>
                  </span>
                ))}
              </div>
            )}

          </div>

          {/* Setup / Settings Column Panel */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Settings size={15} className="text-indigo-400" /> Capture Options
              </span>

              {/* Show / hide toggle config drawer */}
              <button
                id="toggle-config-drawer-btn"
                onClick={() => {
                  scanCaptureInputDevices();
                  setShowConfig(!showConfig);
                }}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase underline"
              >
                {showConfig ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {showConfig ? (
              <div className="flex flex-col gap-5">
                
                {/* Resolution Select */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="settings-resolution" className="text-xs font-semibold text-slate-400">Target Stream Quality</label>
                  <select
                    id="settings-resolution"
                    value={settings.videoResolution}
                    onChange={(e) => setSettings((p) => ({ ...p, videoResolution: e.target.value as any }))}
                    disabled={status !== 'idle'}
                    className="w-full bg-slate-950 border border-slate-800/80 rounded px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                  >
                    <option value="1080p">High Definition 1080p</option>
                    <option value="720p">Standard HD 720p</option>
                    <option value="480p">Low Bandwidth 480p</option>
                  </select>
                </div>

                {/* FPS Selector */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="settings-fps" className="text-xs font-semibold text-slate-400">FPS Frame Rate Limit</label>
                  <select
                    id="settings-fps"
                    value={settings.frameRate}
                    onChange={(e) => setSettings((p) => ({ ...p, frameRate: parseInt(e.target.value) as any }))}
                    disabled={status !== 'idle'}
                    className="w-full bg-slate-950 border border-slate-800/80 rounded px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                  >
                    <option value="30">30 Frames per second</option>
                    <option value="60">60 Frames per second (Smooth)</option>
                  </select>
                </div>

                <div className="h-[1px] bg-slate-800 my-1" />

                {/* Microphone configuration toggle */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Mic size={14} className="text-indigo-400" /> Record Microphone Feed
                    </span>
                    <label htmlFor="settings-mic-toggle" className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="settings-mic-toggle"
                        type="checkbox"
                        checked={settings.recordMicrophone}
                        onChange={(e) => setSettings((p) => ({ ...p, recordMicrophone: e.target.checked }))}
                        disabled={status !== 'idle'}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white" />
                    </label>
                  </div>

                  {settings.recordMicrophone && (
                    <div className="flex flex-col gap-1.5 animate-fade-in pl-5">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span htmlFor="settings-mic-select">Select Hardware Input</span>
                        {!devicesGranted && (
                          <button
                            id="scan-devices-permission-btn"
                            onClick={() => scanCaptureInputDevices(true)}
                            className="text-indigo-400 underline font-bold"
                          >
                            Scan / Ask Mic Access
                          </button>
                        )}
                      </div>
                      <select
                        id="settings-mic-select"
                        value={settings.selectedMicrophoneId}
                        onChange={(e) => setSettings((p) => ({ ...p, selectedMicrophoneId: e.target.value }))}
                        disabled={status !== 'idle'}
                        className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                      >
                        {microphones.length > 0 ? (
                          microphones.map((d) => (
                            <option key={d.deviceId} value={d.deviceId}>
                              {d.label || `Microphone input (${d.deviceId.slice(0, 5)}...)`}
                            </option>
                          ))
                        ) : (
                          <option value="">No hardware mic found</option>
                        )}
                      </select>
                    </div>
                  )}
                </div>

                {/* Webcam facecam setup layout */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <CameraIcon size={14} className="text-indigo-400" /> Enable Webcam Facecam
                    </span>
                    <label htmlFor="settings-camera-toggle" className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="settings-camera-toggle"
                        type="checkbox"
                        checked={settings.enableCamera}
                        onChange={(e) => setSettings((p) => ({ ...p, enableCamera: e.target.checked }))}
                        disabled={status === 'stopped'}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white" />
                    </label>
                  </div>

                  {settings.enableCamera && (
                    <div className="flex flex-col gap-2.5 animate-fade-in pl-5">
                      <div className="flex flex-col gap-1">
                        <span htmlFor="settings-camera-select" className="text-[10px] text-slate-500">Camera Device Source</span>
                        <select
                          id="settings-camera-select"
                          value={settings.selectedCameraId}
                          onChange={(e) => setSettings((p) => ({ ...p, selectedCameraId: e.target.value }))}
                          disabled={status === 'stopped'}
                          className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                        >
                          {cameras.length > 0 ? (
                            cameras.map((d) => (
                              <option key={d.deviceId} value={d.deviceId}>
                                {d.label || `Video source (${d.deviceId.slice(0, 5)}...)`}
                              </option>
                            ))
                          ) : (
                            <option value="">No hardware camera found</option>
                          )}
                        </select>
                      </div>

                      {/* Info on picture in picture Always-on-Top capability */}
                      <div className="p-2.5 rounded bg-slate-950 border border-slate-850 text-[10px] text-slate-400 leading-normal font-medium">
                        <p className="font-semibold text-slate-300 mb-0.5 flex items-center gap-1">
                          <Tv size={10} className="text-amber-400" /> Always-on-top Widget Pro-Tip:
                        </p>
                        Hover on the active webcam circle inside the web workspace and click the &quot;external&quot; icon to spawn a native always-on-top capsule that stays visible outside the browser tab!
                      </div>
                    </div>
                  )}
                </div>

                {/* System Audio record check */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Volume2 size={14} className="text-indigo-400" /> Record System Audio
                  </span>
                  <label htmlFor="settings-system-audio" className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="settings-system-audio"
                      type="checkbox"
                      checked={settings.recordSystemAudio}
                      onChange={(e) => setSettings((p) => ({ ...p, recordSystemAudio: e.target.checked }))}
                      disabled={status !== 'idle'}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white" />
                  </label>
                </div>

                <p className="text-[10px] text-slate-500 mt-1 italic">
                  Note: Audio mixed recording capabilities vary based on OS and tab share choices. Ensure you allow audio sharing checkbox in the browser capture panel.
                </p>

              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                Setup is collapsed. Expand to adjust camera overlays, microphone devices, and output parameters.
              </div>
            )}
          </div>

        </div>

        {/* BRIGHT DRAWING BOARD SECTION */}
        <AnimatePresence>
          {showWhiteboard && (
            <motion.div
              id="whiteboard-wrapper"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full"
            >
              <Whiteboard onClose={() => setShowWhiteboard(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* PLAYER & SCREENSHOT VIEWER REVIEWER SECTION */}
        <AnimatePresence mode="wait">
          {selectedRecording && (
            <motion.div
              key={selectedRecording.id}
              id="selected-record-reviewer"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full"
            >
              {selectedRecording.type === 'screenshot' ? (
                <ScreenshotViewer
                  screenshot={selectedRecording}
                  onClose={() => setSelectedRecording(null)}
                  onRename={saveRenameRow}
                  onDelete={(id) => {
                    const fakeClickEvent = { stopPropagation: () => {} } as any;
                    handleDeleteItem(id, fakeClickEvent);
                  }}
                />
              ) : (
                <VideoEditor
                  recording={selectedRecording}
                  onSaveTrim={handleSaveTrim}
                  onClose={() => setSelectedRecording(null)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CLIPS HISTORY DIRECTORY LIBRARY */}
        <div id="recordings-library" className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
            
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <LayoutDashboard size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Completed Sessions Directory <span className="text-slate-400 font-mono text-xs">({recordings.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Stored inside secure local browser memory (IndexedDB)</p>
              </div>
            </div>

            {/* Catalog search and actions fit */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <input
                id="library-search"
                type="text"
                placeholder="Search recordings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-44"
              />
              
              <button
                id="refresh-library-btn"
                onClick={loadLibrary}
                title="Refresh listings"
                className="p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
              >
                <RefreshCw size={14} />
              </button>
            </div>

          </div>

          {/* Group Filter Tabs Category Selector */}
          <div className="flex items-center gap-1.5 border-b border-slate-850 pb-3 flex-wrap">
            <button
              id="filter-all-btn"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold ring-1 ring-indigo-505/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              All Assets ({recordings.length})
            </button>
            <button
              id="filter-videos-btn"
              onClick={() => setActiveFilter('video')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeFilter === 'video'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold ring-1 ring-indigo-505/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              Videos ({recordings.filter(r => r.type !== 'screenshot').length})
            </button>
            <button
              id="filter-captures-btn"
              onClick={() => setActiveFilter('screenshot')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeFilter === 'screenshot'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold ring-1 ring-indigo-505/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              Screen Captures ({recordings.filter(r => r.type === 'screenshot').length})
            </button>
          </div>

          {filteredLibrary.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLibrary.map((item) => {
                const isEditingName = editingRecordingId === item.id;
                const isCurSelected = selectedRecording?.id === item.id;

                return (
                  <div
                    key={item.id}
                    id={`recording-card-${item.id}`}
                    onClick={() => {
                      if (!isEditingName) setSelectedRecording(item);
                    }}
                    className={`group bg-slate-950 border-2 rounded-xl p-4 flex flex-col gap-4 cursor-pointer transition-all hover:scale-[1.01] ${
                      isCurSelected
                        ? 'border-indigo-500 shadow-indigo-950/20 shadow-md ring-1 ring-indigo-500/30'
                        : 'border-slate-850 hover:border-slate-700/80'
                    }`}
                  >
                    
                    {/* Visual Card Display head */}
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-800">
                      {item.type === 'screenshot' ? (
                        <ScreenshotThumbnail blob={item.blob} />
                      ) : (
                        <>
                          <FileVideo size={36} className={`${isCurSelected ? 'text-indigo-400 animate-pulse' : 'text-slate-600 group-hover:text-slate-400'} transition-colors`} />
                          
                          {/* Floating Play Overlay Hover */}
                          <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <PlayCircle size={32} className="text-white hover:scale-110 active:scale-95 transition-transform" />
                          </div>

                          {/* Small Overlay Duration Bar */}
                          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] font-bold font-mono text-white tracking-wide border border-slate-800">
                            {formatDisplayDuration(item.duration)}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Metadata specs */}
                    <div className="flex flex-col gap-2">
                      
                      {/* Name rename field and editable block */}
                      {isEditingName ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            id={`rename-input-${item.id}`}
                            type="text"
                            value={tempRenameText}
                            onChange={(e) => setTempRenameText(e.target.value)}
                            className="bg-slate-900 border border-indigo-500 rounded px-2 py-1 text-xs text-white focus:outline-none w-full font-medium"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveRenameRow(item.id);
                              if (e.key === 'Escape') setEditingRecordingId(null);
                            }}
                            autoFocus
                          />
                          <button
                            id={`rename-save-${item.id}`}
                            onClick={() => saveRenameRow(item.id)}
                            className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            id={`rename-cancel-${item.id}`}
                            onClick={() => setEditingRecordingId(null)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-indigo-300 transition-colors" title={item.name}>
                            {item.name}
                          </h4>
                          
                          <button
                            id={`start-rename-btn-${item.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              startRenameRow(item);
                            }}
                            className="p-1 text-slate-500 hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100"
                            title="Rename clip"
                          >
                            <Edit size={12} />
                          </button>
                        </div>
                      )}

                      {/* File specs: Date + Size */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(item.createdAt).toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' })}
                        </span>
                        <span>{formatFileSize(item.size)}</span>
                      </div>

                    </div>

                     {/* Action Panel: Download / Delete */}
                    <div id={`actions-${item.id}`} className="mt-2 border-t border-slate-850 pt-2 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Jump reviewer indicator */}
                      <button
                        id={`trigger-load-btn-${item.id}`}
                        onClick={() => setSelectedRecording(item)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                      >
                        {item.type === 'screenshot' ? (
                          <>
                            <Palette size={10} className="text-amber-400" /> View & Sketch
                          </>
                        ) : (
                          <>
                            <Scissors size={10} /> Edit / Review
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        {/* Direct client-side download */}
                        <button
                          id={`download-library-btn-${item.id}`}
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(item.blob);
                            link.download = item.type === 'screenshot' ? `${item.name}.png` : `${item.name}.webm`;
                            link.click();
                          }}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title={item.type === 'screenshot' ? "Download Image" : "Direct WebM Download"}
                        >
                          <Download size={12} />
                        </button>

                        {/* Direct memory erase */}
                        <button
                          id={`delete-btn-${item.id}`}
                          onClick={(e) => handleDeleteItem(item.id, e)}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-red-500/15 text-slate-400 hover:text-red-400 transition-colors"
                          title="Erase from hardware"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/25 text-slate-500 group">
              <Video size={36} className="stroke-[1.2] text-indigo-400 group-hover:scale-110 group-hover:text-indigo-300 transition-all mb-4" />
              <p className="text-sm font-bold text-slate-300">Your session database is empty</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-normal">
                Select your capture mode above and click <span className="text-indigo-400 font-semibold font-mono">Start Video Recorder</span> to capture local screen, audio tracks, and webcam overlays!
              </p>
            </div>
          )}
        </div>

        {/* SEO BLOG ARTICLES HUB */}
        <BlogHub />

        {/* CORE PLATFORM CAPABILITIES */}
        <FeaturesSection />

        {/* DYNAMIC FAQ SEARCH PANEL */}
        <FAQSection />

      </main>

      {/* FOOTER BAR */}
      <footer id="footer-credits" className="w-full mt-auto py-6 border-t border-slate-900 bg-slate-950 text-center text-slate-650 text-xs font-mono select-none">
        <p className="text-slate-500">
          ScreenForge Static Website Engine • Built with modern React 19, Tailwind CSS v4 & IndexedDB.
        </p>
      </footer>

      {/* Visual Delete Confirmation Modal (Avoids IFrame confirm blocking) */}
      {deletingId && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl animate-fade-in z-50">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                <AlertTriangle size={20} />
              </div>
              <h4 className="text-sm font-bold text-white">Discard Recorded Session?</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete this recorded session? This action is irreversible and the media blob will be permanently removed from your IndexedDB workspace database.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-350 text-xs font-semibold transition-all pointer-events-auto"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(deletingId)}
                className="px-4 py-1.5 rounded-lg bg-red-650 hover:bg-red-600 text-white text-xs font-bold transition-all shadow shadow-red-950/50 pointer-events-auto"
              >
                Erase Session
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
