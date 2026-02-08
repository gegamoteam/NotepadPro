export interface Note {
  path: string;
  name: string;
  content?: string; // Content loaded on demand
  lastModified?: number;
  isFolder: boolean;
  children?: Note[]; // For folder tree
  isNew?: boolean;
}

export interface SearchResult {
  file: Note;
  matchType: 'filename' | 'content';
  snippet?: string;
  score: number;
}
