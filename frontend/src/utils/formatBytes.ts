/** e.g. ["txt","docx"] → ".txt, .docx" */
export function formatDocExtensions(extensions: string[]): string {
  return extensions.map((e) => (e.startsWith(".") ? e : `.${e}`)).join(", ");
}

/** Human-readable file size for plan limits (binary KB/MB). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return kb % 1 === 0 ? `${kb} KB` : `${kb.toFixed(1)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return mb % 1 === 0 ? `${mb} MB` : `${mb.toFixed(1)} MB`;
}
