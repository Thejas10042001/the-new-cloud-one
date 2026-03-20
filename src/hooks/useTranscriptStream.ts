import { useState, useEffect, useCallback, useRef } from 'react';
import { TranscriptSegment } from '../types/transcriptTypes';
import { transcriptStreamService } from '../services/transcriptStreamService';
import { transcriptStorageService } from '../services/transcriptStorageService';

export const useTranscriptStream = (botId: string | null) => {
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slidingWindowTranscript, setSlidingWindowTranscript] = useState<string[]>([]);
  
  const transcriptRef = useRef<TranscriptSegment[]>([]);

  // Initialize from storage
  useEffect(() => {
    const saved = transcriptStorageService.getFromSessionStorage();
    if (saved) {
      transcriptRef.current = saved;
      setTranscript(saved);
      updateSlidingWindow(saved);
    }
  }, []);

  const updateSlidingWindow = (segments: TranscriptSegment[]) => {
    const window = segments.slice(-20);
    const formatted = window.map(s => `${s.speaker}: ${s.text}`);
    setSlidingWindowTranscript(formatted);
  };

  const handleNewSegment = useCallback((segment: TranscriptSegment) => {
    // Reset detection
    if (segment.id === 1) {
      transcriptRef.current = [segment];
      setTranscript([segment]);
      updateSlidingWindow([segment]);
      transcriptStorageService.saveToSessionStorage([segment]);
      if (botId) {
        transcriptStorageService.saveToIndexedDB(botId, [segment]);
      }
      return;
    }

    // Duplicate protection
    const lastSegment = transcriptRef.current[transcriptRef.current.length - 1];
    if (lastSegment && lastSegment.text === segment.text) {
      return;
    }

    // Append segment
    const updated = [...transcriptRef.current, segment];
    transcriptRef.current = updated;
    setTranscript(updated);
    updateSlidingWindow(updated);

    // Persist
    transcriptStorageService.saveToSessionStorage(updated);
    if (botId) {
      transcriptStorageService.saveToIndexedDB(botId, updated);
    }
  }, [botId]);

  useEffect(() => {
    if (!botId) return;

    transcriptStreamService.connectTranscriptStream(
      botId,
      handleNewSegment,
      (err) => setError(err instanceof Error ? err.message : String(err)),
      setIsConnected
    );

    return () => {
      transcriptStreamService.disconnect();
    };
  }, [botId, handleNewSegment]);

  const getLiveTranscriptContext = useCallback(() => {
    if (slidingWindowTranscript.length === 0) return '';
    return `[LIVE MEETING CONTEXT]\n\n${slidingWindowTranscript.join('\n')}`;
  }, [slidingWindowTranscript]);

  const clearTranscript = useCallback(() => {
    transcriptRef.current = [];
    setTranscript([]);
    setSlidingWindowTranscript([]);
    transcriptStorageService.clearSessionStorage();
  }, []);

  return {
    transcript,
    slidingWindowTranscript,
    isConnected,
    error,
    getLiveTranscriptContext,
    clearTranscript
  };
};
