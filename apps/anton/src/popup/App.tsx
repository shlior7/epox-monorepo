import { sendMessageToTab } from '@/shared/messaging';

export function App() {
  const handleToggle = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      await sendMessageToTab(tab.id, { type: 'TOGGLE_EXTENSION' });
      window.close();
    }
  };

  const handleOpenSidePanel = () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
    window.close();
  };

  return (
    <div className="w-64 p-4 bg-dark-bg text-dark-text" data-testid="anton-popup">
      <h1 className="text-lg font-bold mb-4">Anton</h1>
      <div className="space-y-2">
        <button
          className="w-full px-4 py-2 bg-accent-primary text-white rounded hover:bg-blue-600 transition"
          onClick={handleToggle}
          data-testid="anton-toggle-btn"
        >
          Toggle Annotations
        </button>
        <button
          className="w-full px-4 py-2 bg-dark-surface border border-dark-border text-dark-text rounded hover:bg-dark-border transition"
          onClick={handleOpenSidePanel}
          data-testid="anton-sidepanel-btn"
        >
          Open Side Panel
        </button>
      </div>
      <div className="mt-4 text-xs text-dark-muted">
        <p>Click anywhere to add annotations</p>
        <ul className="mt-2 space-y-1">
          <li>💬 Comment</li>
          <li>T - Text label</li>
          <li>✓ Highlight</li>
          <li>→ Arrow</li>
        </ul>
      </div>
    </div>
  );
}
