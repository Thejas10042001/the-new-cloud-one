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

    try {
      await fetchEventSource(`/api/transcripts/${botId}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
        },
        signal: this.abortController.signal,
        onopen: async (response) => {
          if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
            onConnectionChange?.(true);
          } else {
            throw new Error(`Failed to connect: ${response.status} ${response.statusText}`);
          }
        },
        onmessage: (msg) => {
          if (msg.event === 'transcript' || !msg.event) {
            try {
              const segment: TranscriptSegment = JSON.parse(msg.data);
              onTranscript(segment);
            } catch (e) {
              console.error('Failed to parse transcript segment', e);
              onError?.(e);
            }
          }
        },
        onclose: () => {
          onConnectionChange?.(false);
          console.log('Transcript stream closed');
        },
        onerror: (err) => {
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
