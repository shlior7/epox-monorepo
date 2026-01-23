import { useState } from 'react';
import { exportProject, importProject } from '@/shared/storage';

export function ImportExport() {
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState<string>('');

  const handleExport = async () => {
    try {
      const json = await exportProject();

      // Download as file
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anton-project-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Also copy to clipboard
      await navigator.clipboard.writeText(json);
      setStatus('✓ Exported and copied to clipboard');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus(`❌ Export failed: ${error}`);
    }
  };

  const handleImport = async () => {
    try {
      await importProject(importText);
      setStatus('✓ Project imported successfully');
      setImportText('');
      setTimeout(() => setStatus(''), 3000);

      // Reload the page list
      window.location.reload();
    } catch (error) {
      setStatus(`❌ Import failed: ${error}`);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setImportText(text);
    } catch (error) {
      setStatus(`❌ Failed to read file: ${error}`);
    }
  };

  return (
    <div className="p-4 space-y-4" data-testid="anton-import-export">
      <div>
        <h3 className="font-semibold mb-2 text-dark-text">Export Project</h3>
        <button
          className="w-full px-4 py-2 bg-accent-primary text-white rounded hover:bg-blue-600 transition"
          onClick={handleExport}
          data-testid="export-btn"
        >
          Export as JSON
        </button>
        <p className="text-xs text-dark-muted mt-2">
          Downloads JSON file and copies to clipboard
        </p>
      </div>

      <div className="border-t border-dark-border pt-4">
        <h3 className="font-semibold mb-2 text-dark-text">Import Project</h3>
        <div className="space-y-2">
          <input
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="text-sm text-dark-text"
            data-testid="import-file-input"
          />
          <textarea
            className="w-full h-32 p-2 bg-dark-surface border border-dark-border rounded text-dark-text text-sm font-mono"
            placeholder="Or paste JSON here..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            data-testid="import-textarea"
          />
          <button
            className="w-full px-4 py-2 bg-accent-secondary text-white rounded hover:bg-purple-600 transition disabled:opacity-50"
            onClick={handleImport}
            disabled={!importText.trim()}
            data-testid="import-btn"
          >
            Import
          </button>
        </div>
      </div>

      {status && (
        <div
          className={`p-2 rounded text-sm ${
            status.startsWith('✓')
              ? 'bg-accent-success/20 text-accent-success'
              : 'bg-accent-danger/20 text-accent-danger'
          }`}
          data-testid="import-export-status"
        >
          {status}
        </div>
      )}
    </div>
  );
}
