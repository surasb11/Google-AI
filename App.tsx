
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChangeRecord, DiffPart } from './types';
import { computeDiff, downloadZip } from './utils/diffUtils';
import { analyzeChanges } from './services/geminiService';
import HistorySidebar from './components/HistorySidebar';

declare const Prism: any;

const LANGUAGES = [
  { label: 'Plain Text', value: 'plaintext' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Python', value: 'python' },
  { label: 'JSON', value: 'json' },
  { label: 'CSS', value: 'css' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'HTML', value: 'markup' },
];

const AUTO_SAVE_INTERVAL = 60000; // 60 seconds
const CHANGE_THRESHOLD = 10; // min characters change to consider "significant"

const CodeEditor: React.FC<{
  value: string;
  onChange: (val: string) => void;
  language: string;
  placeholder?: string;
  label: string;
}> = ({ value, onChange, language, placeholder, label }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const highlighted = React.useMemo(() => {
    if (language === 'plaintext') return value;
    try {
      return Prism.highlight(value, Prism.languages[language] || Prism.languages.javascript, language);
    } catch (e) {
      return value;
    }
  }, [value, language]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="bg-slate-900/50 px-3 py-1 flex items-center justify-between border-b border-slate-800/50">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</span>
      </div>
      <div className="flex-1 editor-container">
        <pre 
          ref={highlightRef}
          className="editor-highlight mono"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: highlighted + (value.endsWith('\n') ? ' ' : '') }}
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          placeholder={placeholder}
          className="editor-textarea mono"
          spellCheck={false}
        />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [leftContent, setLeftContent] = useState('');
  const [rightContent, setRightContent] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [history, setHistory] = useState<ChangeRecord[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diffParts, setDiffParts] = useState<DiffPart[]>([]);
  const [splitWidth, setSplitWidth] = useState(50);
  const [showDiff, setShowDiff] = useState(false);
  const [lastSavedStatus, setLastSavedStatus] = useState<string>('Ready');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const lastSavedLeft = useRef('');
  const lastSavedRight = useRef('');

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    setSplitWidth(Math.min(Math.max(newWidth, 10), 90));
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const createSnapshot = async (type: 'manual' | 'auto') => {
    if (!leftContent.trim() && !rightContent.trim()) return;
    
    // Check if content is different enough from last saved
    const diffLen = Math.abs(leftContent.length - lastSavedLeft.current.length) + 
                    Math.abs(rightContent.length - lastSavedRight.current.length);
    
    if (type === 'auto' && diffLen < CHANGE_THRESHOLD) return;

    setIsAnalyzing(true);
    setLastSavedStatus(type === 'auto' ? 'Auto-saving...' : 'Saving snapshot...');

    try {
      const diffs = computeDiff(leftContent, rightContent);
      setDiffParts(diffs);

      const summary = await analyzeChanges(leftContent, rightContent);
      
      const newRecord: ChangeRecord = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        leftContent,
        rightContent,
        summary,
        type
      };
      
      setHistory(prev => [...prev, newRecord]);
      lastSavedLeft.current = leftContent;
      lastSavedRight.current = rightContent;
      setLastSavedStatus(`Last saved at ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      console.error(err);
      setLastSavedStatus('Save failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCompare = () => {
    setShowDiff(true);
    createSnapshot('manual');
  };

  const handleRestore = (record: ChangeRecord) => {
    setLeftContent(record.leftContent);
    setRightContent(record.rightContent);
    setShowDiff(true);
    setDiffParts(computeDiff(record.leftContent, record.rightContent));
  };

  const handleDownload = () => {
    downloadZip(leftContent, rightContent, history);
  };

  // Auto-save effect
  useEffect(() => {
    const timer = setInterval(() => {
      createSnapshot('auto');
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(timer);
  }, [leftContent, rightContent]); // Depend on content to have current values in closure

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200">
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900 shadow-md z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              D
            </div>
            <h1 className="font-bold text-lg tracking-tight hidden sm:block">DiffMaster <span className="text-blue-500">AI</span></h1>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Language</label>
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 outline-none hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowDiff(!showDiff)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${showDiff ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            {showDiff ? 'Exit Diff View' : 'Visual Diff'}
          </button>
          
          <button 
            onClick={handleCompare}
            disabled={isAnalyzing}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-md text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-green-500/10"
          >
            {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {isAnalyzing ? 'Analyzing...' : 'Snapshot'}
          </button>

          <button 
            onClick={handleDownload}
            className="px-4 py-1.5 bg-slate-100 hover:bg-white text-slate-900 rounded-md text-sm font-medium transition-all"
          >
            ZIP
          </button>

          <button 
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={`p-1.5 rounded-md transition-all ${isHistoryOpen ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative" ref={containerRef}>
        <div className="flex-1 flex overflow-hidden">
          <div className="h-full relative flex flex-col" style={{ width: `${splitWidth}%` }}>
            <CodeEditor 
              label="Source / Original"
              value={leftContent} 
              onChange={setLeftContent} 
              language={language}
              placeholder="Paste original text or code..."
            />
          </div>

          <div
            className="w-1.5 bg-slate-900 hover:bg-blue-500 cursor-col-resize transition-all group relative z-20 flex items-center justify-center"
            onMouseDown={handleMouseDown}
          >
            <div className="w-0.5 h-10 bg-slate-700 group-hover:bg-blue-200 rounded-full" />
          </div>

          <div className="h-full relative flex flex-col" style={{ width: `${100 - splitWidth}%` }}>
            <CodeEditor 
              label="Target / Modified"
              value={rightContent} 
              onChange={setRightContent} 
              language={language}
              placeholder="Paste modified version..."
            />
          </div>
        </div>

        {showDiff && (
          <div className="absolute inset-0 bg-slate-950 z-30 flex flex-col animate-in fade-in duration-200">
            <div className="h-10 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Difference Preview</span>
              </div>
              <button onClick={() => setShowDiff(false)} className="text-xs text-slate-500 hover:text-white transition-colors">
                Esc to Close
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 sm:p-10 bg-[#0d1117]">
              <div className="max-w-5xl mx-auto bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="p-8 mono text-sm whitespace-pre-wrap leading-relaxed break-words">
                  {diffParts.length === 0 ? (
                    <div className="text-slate-500 text-center py-20 italic">
                      No changes detected. Use "Snapshot" to generate a diff.
                    </div>
                  ) : (
                    diffParts.map((part, idx) => (
                      <span
                        key={idx}
                        className={
                          part.type === 'added' ? 'diff-added' : 
                          part.type === 'removed' ? 'diff-removed' : 
                          'text-slate-400'
                        }
                      >
                        {part.value}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <HistorySidebar 
          history={history} 
          onRestore={handleRestore} 
          isOpen={isHistoryOpen} 
        />
      </div>

      <footer className="h-8 border-t border-slate-800 bg-slate-900 flex items-center justify-between px-4 text-[10px] text-slate-500">
        <div className="flex gap-4">
          <span>{leftContent.length} chars (L) | {rightContent.length} chars (R)</span>
          <span className="border-l border-slate-800 pl-4 uppercase tracking-tighter">Current Lang: {language}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
            <span className="font-mono text-[9px] uppercase">{lastSavedStatus}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>AI Engine Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
