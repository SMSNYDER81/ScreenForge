export interface RecordingItem {
  id: string;
  name: string;
  createdAt: number;
  duration: number; // in seconds
  size: number; // in bytes
  blob: Blob;
  markers: Marker[];
  type?: 'video' | 'screenshot';
}

export interface Marker {
  id: string;
  timestamp: number; // in seconds
  label: string;
}

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped';

export interface RecordingSettings {
  videoResolution: '1080p' | '720p' | '480p';
  frameRate: 30 | 60;
  recordMicrophone: boolean;
  selectedMicrophoneId: string;
  recordSystemAudio: boolean;
  enableCamera: boolean;
  selectedCameraId: string;
  recordingMode: 'dual' | 'screen' | 'camera';
  aspectRatio: '16:9' | '9:16';
}
