import React, { useState, useMemo } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Search, Info } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
  id: string;
}

export default function FAQSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const faqs: FAQItem[] = [
    {
      id: 'privacy',
      category: 'Privacy & Security',
      question: 'Does ScreenForge upload my recorded videos to external servers?',
      answer: 'No. ScreenForge operates under a strict offline-first structure. All recording compilation, raw audio/video frames, and transcoded outputs remain entirely inside your browser memory and CPU workspace. No data is ever dispatched to our servers or third-party cloud engines.',
    },
    {
      id: 'storage',
      category: 'Storage & History',
      question: 'Where are my recording histories saved if they are offline?',
      answer: 'Your recorded clips and screenshots are stored locally inside your browser\'s secure IndexedDB sandboxed database workspace. They will persist even if you reload the static application. They only clear if you explicitly wipe browser caches or click "Erase Session" inside the Clips History list.',
    },
    {
      id: 'camera',
      category: 'Usage & Media',
      question: 'Can I record my screen and front webcam simultaneously?',
      answer: 'Yes! Select the "Dual Feed" capture option. It will mount a high-contrast circular video overlay of your camera feed in the corner of your workspace. You can drag and position the preview circle anywhere on your screen and customize its border accents.',
    },
    {
      id: 'limits',
      category: 'Limits & Performance',
      question: 'Is there a file size limit or recording duration cap?',
      answer: 'There are no software caps imposed by ScreenForge. However, standard browser constraints allocate up to 50%-80% of your current drive\'s free storage to IndexedDB. This generally allows for hours of seamless HD recordings at high bitrates.',
    },
    {
      id: 'resolution',
      category: 'Usage & Media',
      question: 'Why does my browser request screen sharing / Display Capture privileges?',
      answer: 'ScreenForge uses the native W3C Screen Capture API. Your browser prompts you for permission to authorize grabbing video elements to guarantee safety. The utility captures exactly the tab, window, or entire screen monitor you designate.',
    },
    {
      id: 'performance',
      category: 'Limits & Performance',
      question: 'How do I resolve sluggish cursor motions or low frame rate during recording?',
      answer: 'To ensure ultra-smooth 60fps captures, verify that Hardware GPU Acceleration is thoroughly enabled inside your browser settings menu. This shifts frame composition tasks from your CPU to your dedicated hardware GPU chip.',
    },
    {
      id: 'sound',
      category: 'Usage & Media',
      question: 'How do I mix my internal system audio (games, music) with my mic voice overlay?',
      answer: 'Ensure "Record System Audio" is turned on, and select "Dual Feed" or "Screen" capture modes. When starting, check the "Share system audio" option inside the Chrome/Edge popup share menu and grant input permissions. ScreenForge\'s synchronized WebAudio context mixer handles the rest.',
    },
    {
      id: 'exports',
      category: 'Storage & History',
      question: 'What video containers and codecs are used to package the recordings?',
      answer: 'ScreenForge compiles standard high-fidelity WebM containers using modern VP9 or VP8 compression paired with synchronized Opus stereo audio. This ensures standard, lightweight files ready for distribution, editing, or direct YouTube upload.',
    }
  ];

  // Filter based on search query
  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section id="faq-section-wrapper" className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl flex flex-col gap-6 shadow-xl animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-850 pb-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400">
            <HelpCircle size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Documentation</span>
          </div>
          <h3 className="text-lg font-bold text-slate-100 mt-1 font-sans">Frequently Asked Questions</h3>
          <p className="text-xs text-slate-500 mt-0.5">Everything you need to know about ScreenForge privacy, local sandboxing, and outputs.</p>
        </div>

        {/* Dynamic FAQ Search bar */}
        <div className="relative w-full sm:w-72">
          <span className="absolute left-2.5 top-2.5 text-slate-500">
            <Search size={14} />
          </span>
          <input
            id="faq-search-input"
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filteredFaqs.map((faq) => {
          const isExpanded = expandedId === faq.id;
          return (
            <div 
              key={faq.id}
              id={`faq-card-${faq.id}`}
              className={`border rounded-xl transition-all ${
                isExpanded 
                  ? 'bg-slate-950/60 border-indigo-500/30 shadow' 
                  : 'bg-slate-950/20 border-slate-850 hover:bg-slate-950/40 hover:border-slate-800'
              }`}
            >
              {/* Question Header Accordion Click */}
              <button
                id={`faq-btn-${faq.id}`}
                onClick={() => toggleExpand(faq.id)}
                className="w-full px-5 py-4 flex items-center justify-between text-left gap-4"
              >
                <div className="space-y-1">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-850 text-[9px] font-mono text-indigo-400 uppercase tracking-wider font-semibold">
                    {faq.category}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-200 hover:text-indigo-300 transition-colors">
                    {faq.question}
                  </h4>
                </div>
                <div className="text-slate-500 p-1 bg-slate-900/60 rounded border border-slate-850">
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {/* Collapsible Answer Body */}
              {isExpanded && (
                <div 
                  id={`faq-answer-${faq.id}`}
                  className="px-5 pb-5 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-900/60 animate-fade-in"
                >
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}

        {filteredFaqs.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl bg-slate-950/10">
            No matching questions found for &quot;<span className="text-indigo-400 font-semibold">{searchQuery}</span>&quot;. Try refining your terms.
          </div>
        )}
      </div>
    </section>
  );
}
