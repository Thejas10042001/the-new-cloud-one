export interface TranscriptSegment {
  id: number;
  speaker: string;
  text: string;
  start?: number;
  end?: number;
  language?: string;
  created_at?: string;
}
