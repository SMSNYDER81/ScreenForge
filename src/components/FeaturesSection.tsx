import React from 'react';
import { 
  ShieldCheck, 
  Tv, 
  Waves, 
  Smartphone, 
  Pencil, 
  Bookmark, 
  FileVideo, 
  Cpu, 
  Sparkles,
  Zap
} from 'lucide-react';

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}

export default function FeaturesSection() {
  const features: FeatureCard[] = [
    {
      icon: <ShieldCheck size={20} className="text-emerald-400" />,
      title: '100% Offline-First Privacy',
      description: 'Zero videos are uploaded to remote storage cloud nodes. File compression, synthesis, and compilation transpire safely in your browser Sandbox.',
      accent: 'emerald',
    },
    {
      icon: <Smartphone size={20} className="text-indigo-400" />,
      title: 'Dynamic Aspect Ratios',
      description: 'Switch between standard cinematic 16:9 widescreen or portrait 9:16 layout limits to design TikTok reels, YouTube Shorts, or mobile tutorials.',
      accent: 'indigo',
    },
    {
      icon: <Tv size={20} className="text-amber-400" />,
      title: 'Draggable Facecam Overlay',
      description: 'Overlay custom camera bubbles inside active screen shared streams. Position overlays in any corner, adjust sizes, or go full standalone.',
      accent: 'amber',
    },
    {
      icon: <Waves size={20} className="text-cyan-400" />,
      title: 'WebAudio Mixed Feeds',
      description: 'Synchronized real-time capture combining microphone comment audio tracks with background desk or game loops into uniform stereo streams.',
      accent: 'cyan',
    },
    {
      icon: <Pencil size={20} className="text-pink-400" />,
      title: 'Real-time Vector Sketchpad',
      description: 'Open a full overlay whiteboard or trigger local overlay sketch tools directly inside screenshots to map workflows, architecture grids, or code blocks.',
      accent: 'pink',
    },
    {
      icon: <Bookmark size={20} className="text-violet-400" />,
      title: 'Sleek Stamp Markers',
      description: 'Flag critical segments or bookmark timelines during live sessions. Preserved timestamp arrays help map YouTube chapters effortlessly.',
      accent: 'violet',
    },
    {
      icon: <FileVideo size={20} className="text-blue-400" />,
      title: 'Frame-Accurate Video Trimmer',
      description: 'Trim, slice, and prune raw WebM container recordings right inside the app library prior to committing files to local disk structures.',
      accent: 'blue',
    },
    {
      icon: <Cpu size={20} className="text-rose-400" />,
      title: 'GPU Hardware Comp',
      description: 'Harness native browser hardware rendering capabilities to buffer stream tracks up to 60fps without causing desktop lags or core dropouts.',
      accent: 'rose',
    }
  ];

  return (
    <section id="features-section-wrapper" className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl flex flex-col gap-6 shadow-xl animate-fade-in">
      <div className="border-b border-slate-850 pb-4">
        <div className="flex items-center gap-2 text-indigo-400">
          <Sparkles size={18} />
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Platform Capabilities</span>
        </div>
        <h3 className="text-lg font-bold text-slate-100 mt-1 font-sans">Comprehensive Workstation Features</h3>
        <p className="text-xs text-slate-500 mt-0.5">Explore the powerful client-side design layers built directly inside ScreenForge.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feat, idx) => (
          <div 
            key={idx}
            className="p-5 bg-slate-950/40 rounded-xl border border-slate-850/80 hover:border-slate-750 hover:bg-slate-950/60 transition-all flex flex-col gap-3 group shadow-md"
          >
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 w-fit group-hover:scale-105 transition-transform">
              {feat.icon}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors uppercase font-mono tracking-wider">
                {feat.title}
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1.5 font-sans">
                {feat.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Structured stats/SEO block */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 py-5 rounded-xl bg-slate-950/50 border border-slate-850/60 text-center">
        <div>
          <span className="block text-xl font-extrabold text-indigo-400 font-mono">100%</span>
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 font-mono block mt-0.5">Offline Secure</span>
        </div>
        <div className="border-l border-slate-850/80">
          <span className="block text-xl font-extrabold text-amber-400 font-mono">0ms</span>
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 font-mono block mt-0.5">Network Delay</span>
        </div>
        <div className="border-l border-slate-850/80">
          <span className="block text-xl font-extrabold text-cyan-400 font-mono">60 FPS</span>
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 font-mono block mt-0.5">Max Stream Cap</span>
        </div>
        <div className="border-l border-slate-850/80">
          <span className="block text-xl font-extrabold text-pink-400 font-mono">IndexedDB</span>
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 font-mono block mt-0.5">State Persistent</span>
        </div>
      </div>
    </section>
  );
}
