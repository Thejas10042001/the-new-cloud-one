import { fetchEventSource } from '@microsoft/fetch-event-source';
import { TranscriptSegment } from '../types/transcriptTypes';

type TranscriptCallback = (segment: TranscriptSegment) => void;
type ErrorCallback = (error: any) => void;
type ConnectionCallback = (connected: boolean) => void;

class TranscriptStreamService {
  private abortController: AbortController | null = null;

  async connectTranscriptStream(
    botId: string,
    onTranscript: TranscriptCallback,
    onError?: ErrorCallback,
    onConnectionChange?: ConnectionCallback
  ) {
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();

    const url = `/api/transcripts/${encodeURIComponent(botId)}`;
    console.log(`Connecting to transcript stream: ${url}`);

    try {
      await fetchEventSource(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
        },
        signal: this.abortController.signal,
        onopen: async (response) => {
          if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
            onConnectionChange?.(true);
          } else {
            const body = await response.text();
            console.error(`Connection failed: ${response.status} ${response.statusText} - Body: ${body}`);
            throw new Error(`Failed to connect: ${response.status} ${response.statusText}`);
          }
        },
        onmessage: (msg) => {
          if (!msg.data || !msg.data.trim()) return;
          
          if (msg.event === 'transcript' || !msg.event) {
            try {
              const segment: TranscriptSegment = JSON.parse(msg.data);
              onTranscript(segment);
            } catch (e) {
              console.error('Failed to parse transcript segment', e, 'Data:', msg.data);
            }
          } else if (msg.event === 'status') {
            try {
              const status = JSON.parse(msg.data);
              console.log('Transcript stream status:', status.message);
            } catch (e) {
              console.error('Failed to parse status message', e);
            }
          } else if (msg.event === 'error') {
            try {
              const error = JSON.parse(msg.data);
              console.error('Transcript stream error event:', error.message);
              onError?.(new Error(error.message));
            } catch (e) {
              console.error('Failed to parse error message', e);
            }
          }
        },
        onclose: () => {
          onConnectionChange?.(false);
          console.log('Transcript stream closed');
        },
        onerror: (err) => {
          // Ignore abort errors as they are intentional during disconnects/reconnects
          const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'));
          if (isAbort) {
            return;
          }
          
          onConnectionChange?.(false);
          console.error('Transcript stream error', err);
          onError?.(err);
          // Return undefined to let fetchEventSource handle reconnection
          return;
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Transcript stream aborted');
      } else {
        console.error('Transcript stream connection failed', err);
        onError?.(err);
      }
    }
  }

  disconnect() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

export const transcriptStreamService = new TranscriptStreamService();
