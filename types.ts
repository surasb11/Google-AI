
export interface ChangeRecord {
  id: string;
  timestamp: number;
  leftContent: string;
  rightContent: string;
  summary: string;
  type: 'manual' | 'auto';
}

export interface DiffPart {
  type: 'added' | 'removed' | 'equal';
  value: string;
}

declare global {
  interface Window {
    JSZip: any;
    diff_match_patch: any;
  }
}
