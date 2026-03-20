import React, { useEffect, useRef } from 'react';
import { TranscriptSegment } from '../types/transcriptTypes';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, AlertTriangle, Cloud, Network } from 'lucide-react';

interface LiveTranscriptPanelProps {
  transcript: TranscriptSegment[];
  isConnected: boolean;
  error: string | null;
  className?: string;
}

export const LiveTranscriptPanel: React.FC<LiveTranscriptPanelProps> = ({
  transcript,
  isConnected,
  error,
  className
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div className={cn("flex flex-col h-full bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden", className)}>
      {/* Header */}
      <div className="px-6 py-4 border-bottom border-black/5 flex items-center justify-between bg-black/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black/5 rounded-xl">
            <Activity className="w-4 h-4 text-black/60" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold tracking-tight text-black">Live Transcript</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                isConnected ? "bg-emerald-500" : "bg-red-500"
              )} />
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                isConnected ? "text-emerald-600" : "text-red-600"
              )}>
                {isConnected ? "● Live Meeting" : "● Disconnected"}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-bold text-black/30 uppercase tracking-widest">Segments</span>
            <span className="text-[11px] font-mono font-bold text-black/60">{transcript.length}</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-50 border-b border-red-100 px-6 py-3 flex items-center gap-3"
          >
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-[11px] font-medium text-red-600 leading-tight">
              Connection Error: {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar scroll-smooth"
      >
        {transcript.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 bg-black/[0.03] rounded-2xl flex items-center justify-center">
              <Network className="w-6 h-6 text-black/20" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-black/40">Waiting for live audio...</p>
              <p className="text-[11px] text-black/20 mt-1">The transcript will appear here in real-time.</p>
            </div>
          </div>
        ) : (
          transcript.map((segment, index) => (
            <motion.div
              key={`${segment.id}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group"
            >
              <div className="flex items-baseline gap-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40 shrink-0 w-20 truncate">
                  {segment.speaker}
                </span>
                <p className="text-[13px] text-black/70 leading-relaxed">
                  {segment.text}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-black/[0.01] border-t border-black/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="w-3 h-3 text-black/20" />
          <span className="text-[9px] font-bold text-black/20 uppercase tracking-widest">Cloud Sync Active</span>
        </div>
        <div className="text-[9px] font-mono text-black/20">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
