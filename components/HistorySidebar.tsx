
import React from 'react';
import { ChangeRecord } from '../types';

interface HistorySidebarProps {
  history: ChangeRecord[];
  onRestore: (record: ChangeRecord) => void;
  isOpen: boolean;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onRestore, isOpen }) => {
  if (!isOpen) return null;

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-700 h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <h2 className="font-bold text-lg text-slate-200">Change History</h2>
        <span className="bg-slate-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded text-slate-400 border border-slate-700">
          {history.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {history.length === 0 ? (
          <div className="text-slate-500 text-center py-10 px-4">
            <div className="mb-4 text-slate-700 flex justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
            </div>
            <p className="text-sm">No snapshots yet.</p>
            <p className="text-xs text-slate-600 mt-2">The app auto-saves every 60 seconds if changes are detected.</p>
          </div>
        ) : (
          history.slice().reverse().map((record) => (
            <button
              key={record.id}
              onClick={() => onRestore(record)}
              className="w-full text-left p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800 transition-all border border-slate-700/50 hover:border-blue-500/50 group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${record.type === 'auto' ? 'bg-slate-700 text-slate-400' : 'bg-blue-600/20 text-blue-400'}`}>
                  {record.type}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed line-clamp-4 group-hover:text-slate-100 italic border-l-2 border-slate-700 pl-3 py-1 bg-slate-900/20 rounded-r">
                {record.summary}
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                 <span className="flex items-center gap-1">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                   </svg>
                   {record.leftContent.length + record.rightContent.length} bytes
                 </span>
                 <span className="opacity-0 group-hover:opacity-100 text-blue-400 font-bold transition-opacity">Restore</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default HistorySidebar;
