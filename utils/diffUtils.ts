
import { DiffPart, ChangeRecord } from '../types';

export const computeDiff = (text1: string, text2: string): DiffPart[] => {
  if (!window.diff_match_patch) return [];
  const dmp = new window.diff_match_patch();
  const diffs = dmp.diff_main(text1, text2);
  dmp.diff_cleanupSemantic(diffs);
  
  return diffs.map(([type, value]: [number, string]) => ({
    type: type === 1 ? 'added' : type === -1 ? 'removed' : 'equal',
    value
  }));
};

export const downloadZip = async (left: string, right: string, history: ChangeRecord[]) => {
  if (!window.JSZip) return;
  const zip = new window.JSZip();
  
  zip.file("original_version.txt", left);
  zip.file("modified_version.txt", right);
  
  const historyContent = history.map(h => {
    return `[${new Date(h.timestamp).toLocaleString()}]\nSummary: ${h.summary}\n-------------------\n`;
  }).join('\n');
  
  zip.file("change_history.txt", historyContent || "No history records found.");
  
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = `diff-master-export-${Date.now()}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
