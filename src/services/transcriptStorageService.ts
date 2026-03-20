import { openDB, IDBPDatabase } from 'idb';
import { TranscriptSegment } from '../types/transcriptTypes';

const DB_NAME = 'MeetingAssistantDB';
const STORE_NAME = 'transcripts';
const DB_VERSION = 1;

interface MeetingData {
  meetingId: string;
  data: TranscriptSegment[];
}

class TranscriptStorageService {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'meetingId' });
        }
      },
    });
  }

  async saveToIndexedDB(meetingId: string, data: TranscriptSegment[]): Promise<void> {
    const db = await this.dbPromise;
    await db.put(STORE_NAME, { meetingId, data });
  }

  async getFromIndexedDB(meetingId: string): Promise<TranscriptSegment[] | null> {
    const db = await this.dbPromise;
    const result = await db.get(STORE_NAME, meetingId) as MeetingData | undefined;
    return result ? result.data : null;
  }

  saveToSessionStorage(data: TranscriptSegment[]): void {
    try {
      sessionStorage.setItem('meeting_transcript', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to session storage', e);
    }
  }

  getFromSessionStorage(): TranscriptSegment[] | null {
    try {
      const raw = sessionStorage.getItem('meeting_transcript');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Failed to get from session storage', e);
      return null;
    }
  }

  clearSessionStorage(): void {
    sessionStorage.removeItem('meeting_transcript');
  }
}

export const transcriptStorageService = new TranscriptStorageService();
