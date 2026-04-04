import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, Monitor, Play, Square, Loader2, MessageSquare, User, Bot, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface TranscriptSegment {
  speaker: string;
  source: string;
  text: string;
  timestamp: number;
}

export const GranolaLive = ({ onTranscriptUpdate }: { onTranscriptUpdate?: (text: string) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const micSessionRef = useRef<any>(null);
  const systemSessionRef = useRef<any>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const systemProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const addLog = (msg: string) => {
    console.log(`[GranolaLive] ${msg}`);
    setDebugLogs(prev => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    if (onTranscriptUpdate) {
      const fullText = transcripts.map(t => `${t.source}: ${t.text}`).join('\n');
      onTranscriptUpdate(fullText);
    }
  }, [transcripts, onTranscriptUpdate]);

  const createSession = async (ai: GoogleGenAI, label: 'Host' | 'Participant', source: 'Mic' | 'System') => {
    addLog(`Connecting to ${source} session...`);
    const connectPromise = ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: `You are a real-time transcription assistant. You are transcribing audio from the ${source === 'Mic' ? 'microphone (Host)' : 'system audio (Participants)'}. Transcribe everything accurately.`,
        inputAudioTranscription: {}, 
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => addLog(`Gemini Live ${source} Session Opened`),
        onmessage: (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription?.text) {
            const text = message.serverContent.inputTranscription.text.trim();
            if (text) {
              setTranscripts(prev => [...prev, {
                speaker: label,
                source: source === 'Mic' ? 'Host: [Mic]' : 'Participant: [System]',
                text: text,
                timestamp: Date.now()
              }]);
            }
          }
          
          if (message.serverContent?.modelTurn?.parts) {
            const text = message.serverContent.modelTurn.parts.map(p => p.text).join("").trim();
            if (text) {
              setTranscripts(prev => {
                const last = prev.length > 0 ? prev[prev.length - 1] : null;
                if (last && last.source === (source === 'Mic' ? 'Host: [Mic]' : 'Participant: [System]') && last.text === text) {
                  return prev;
                }
                return [...prev, {
                  speaker: label,
                  source: source === 'Mic' ? 'Host: [Mic]' : 'Participant: [System]',
                  text: text,
                  timestamp: Date.now()
                }];
              });
            }
          }
        },
        onerror: (err) => {
          addLog(`Gemini Live ${source} Error: ${err.message || 'Unknown'}`);
          setError(`${source} connection error: ${err.message || 'Unknown error'}`);
          stopCapture();
        },
        onclose: () => addLog(`Gemini Live ${source} Session Closed`)
      }
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Connection timeout for ${source} session (15s)`)), 15000)
    );

    const session = await Promise.race([connectPromise, timeoutPromise]);
    addLog(`${source} session connected successfully`);
    return session;
  };

  const startCapture = async () => {
    addLog("Starting capture process...");
    setIsConnecting(true);
    setError(null);
    try {
      // 1. Get Microphone
      setLoadingMessage("Requesting microphone access...");
      addLog("Requesting microphone access...");
      let micStream;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = micStream;
        addLog("Microphone access granted");
      } catch (err: any) {
        addLog(`Microphone Access Error: ${err.message}`);
        throw new Error("Microphone access denied. Please allow microphone permissions in your browser.");
      }

      // 2. Get System Audio (via Display Media)
      setLoadingMessage("IMPORTANT: Select a tab/window and check 'Share audio' in the browser prompt.");
      addLog("Requesting system audio access...");
      let systemStream;
      try {
        systemStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          } as any
        });
        systemStreamRef.current = systemStream;
        
        const audioTracks = systemStream.getAudioTracks();
        addLog(`System audio access granted. Tracks: ${audioTracks.length}`);
        
        if (audioTracks.length === 0) {
          addLog("WARNING: No system audio track found. User likely didn't check 'Share audio'.");
          throw new Error("System audio track not detected. You MUST check the 'Share audio' box in the browser's media picker to capture meeting sound.");
        }
      } catch (err: any) {
        addLog(`System Audio Access Error: ${err.message}`);
        if (micStream) micStream.getTracks().forEach(t => t.stop());
        throw new Error(err.message || "System audio capture denied. Please select a tab/window and ensure 'Share audio' is checked.");
      }

      // 3. Setup Audio Context
      setLoadingMessage("Initializing audio processing...");
      addLog("Setting up AudioContext...");
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      await audioContext.resume();
      addLog(`AudioContext state: ${audioContext.state}`);

      // 4. Connect to Gemini Live API
      setLoadingMessage("Connecting to Gemini Live API...");
      const apiKey = process.env.GEMINI_API_KEY;
      addLog(`API Key check: ${apiKey ? "Present" : "Missing"}`);
      if (!apiKey) {
        throw new Error("Gemini API Key is missing. Please check your environment variables.");
      }
      const ai = new GoogleGenAI({ apiKey });
      
      // Connect in parallel with individual timeouts
      addLog("Connecting to Gemini Live sessions...");
      const [micSession, systemSession] = await Promise.all([
        createSession(ai, 'Host', 'Mic'),
        createSession(ai, 'Participant', 'System')
      ]);
      
      micSessionRef.current = micSession;
      systemSessionRef.current = systemSession;

      // 5. Setup Processors
      addLog("Setting up audio processors...");
      const setupProcessor = (stream: MediaStream, session: any, label: string) => {
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (e) => {
          if (!isRecording) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
          
          try {
            session.sendRealtimeInput({
              audio: {
                data: base64Data,
                mimeType: 'audio/pcm;rate=16000'
              }
            });
          } catch (sendErr) {
            // Only log once per session to avoid flooding
            console.error(`Error sending ${label} audio:`, sendErr);
          }
        };
        return processor;
      };

      micProcessorRef.current = setupProcessor(micStream, micSession, "Mic");
      systemProcessorRef.current = setupProcessor(systemStream, systemSession, "System");

      addLog("Capture started successfully!");
      setIsRecording(true);
      setIsConnecting(false);

    } catch (err: any) {
      addLog(`FATAL ERROR: ${err.message}`);
      setError(err.message || "Failed to start capture.");
      setIsConnecting(false);
      stopCapture();
    }
  };

  const stopCapture = () => {
    addLog("Stopping capture...");
    setIsRecording(false);
    setIsConnecting(false);
    
    if (micSessionRef.current) {
      micSessionRef.current.close();
      micSessionRef.current = null;
    }
    if (systemSessionRef.current) {
      systemSessionRef.current.close();
      systemSessionRef.current = null;
    }
    
    if (micProcessorRef.current) {
      micProcessorRef.current.disconnect();
      micProcessorRef.current = null;
    }
    if (systemProcessorRef.current) {
      systemProcessorRef.current.disconnect();
      systemProcessorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    
    if (systemStreamRef.current) {
      systemStreamRef.current.getTracks().forEach(t => t.stop());
      systemStreamRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-3xl overflow-hidden border border-slate-200 shadow-xl">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Granola Live</h2>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
              {isRecording ? (
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
                  Recording System + Mic
                </span>
              ) : (
                "Ready to transcribe"
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isRecording ? (
            <button
              onClick={startCapture}
              disabled={isConnecting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-md shadow-indigo-100"
            >
              {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              Start Capture
            </button>
          ) : (
            <button
              onClick={stopCapture}
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-md shadow-rose-100"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop Capture
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-white/50">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-700">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        {transcripts.length === 0 && !isConnecting && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6 py-10">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="text-center space-y-2 max-w-xs">
              <p className="text-sm font-bold text-slate-600">Ready to transcribe</p>
              <p className="text-xs leading-relaxed">
                Click <strong>Start Capture</strong> to begin. You'll need to grant microphone access and then select a tab/window to share.
              </p>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-[10px] text-indigo-700 font-medium">
                <strong>CRITICAL:</strong> In the browser prompt, you MUST check the <strong>"Share audio"</strong> box to capture system sound.
              </div>
            </div>
          </div>
        )}

        {isConnecting && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-600 font-bold uppercase tracking-widest">Connecting...</p>
              <p className="text-xs text-slate-400 font-medium max-w-[250px] mx-auto leading-relaxed">
                {loadingMessage}
              </p>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {transcripts.map((t, i) => (
            <motion.div
              key={t.timestamp + i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex flex-col gap-1 max-w-[85%]",
                t.speaker === 'Host' ? "ml-auto items-end" : "items-start"
              )}
            >
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t.source}
                </span>
                <span className="text-[10px] text-slate-300">
                  {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className={cn(
                "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                t.speaker === 'Host' 
                  ? "bg-indigo-600 text-white rounded-tr-none" 
                  : "bg-white border border-slate-100 text-slate-700 rounded-tl-none"
              )}>
                {t.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer / Status */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Mic className={cn("w-3 h-3", isRecording ? "text-indigo-600" : "text-slate-300")} />
            Microphone
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Monitor className={cn("w-3 h-3", isRecording ? "text-indigo-600" : "text-slate-300")} />
            System Audio
          </div>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors"
          >
            {showDebug ? "Hide Logs" : "Show Logs"}
          </button>
        </div>

        {showDebug && (
          <div className="p-3 bg-slate-900 rounded-xl font-mono text-[9px] text-slate-300 max-h-[150px] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-2 border-b border-slate-800 pb-1">
              <span className="text-slate-500 uppercase tracking-widest">Debug Output</span>
              <button onClick={() => setDebugLogs([])} className="text-rose-400 hover:text-rose-300">Clear</button>
            </div>
            {debugLogs.length > 0 ? (
              debugLogs.map((log, i) => (
                <div key={i} className="py-0.5 border-b border-slate-800/50">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-slate-600 italic">No logs yet...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
