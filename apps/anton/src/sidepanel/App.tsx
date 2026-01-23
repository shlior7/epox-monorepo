import { useEffect, useState } from 'react';
import { PageList } from './PageList';
import { ImportExport } from './ImportExport';

export function App() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'pages' | 'import-export'>('pages');

  useEffect(() => {
    // Get current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        setCurrentUrl(tabs[0].url);
      }
    });
  }, []);

  return (
    <div className="h-screen flex flex-col bg-dark-bg text-dark-text" data-testid="anton-sidepanel">
      {/* Header */}
      <div className="p-4 border-b border-dark-border">
        <h1 className="text-xl font-bold">Anton</h1>
        <p className="text-sm text-dark-muted">Website Annotation Tool</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-border">
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium transition ${
            activeTab === 'pages'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-dark-muted hover:text-dark-text'
          }`}
          onClick={() => setActiveTab('pages')}
          data-testid="tab-pages"
        >
          Pages
        </button>
        <button
          className={`flex-1 px-4 py-2 text-sm font-medium transition ${
            activeTab === 'import-export'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-dark-muted hover:text-dark-text'
          }`}
          onClick={() => setActiveTab('import-export')}
          data-testid="tab-import-export"
        >
          Import/Export
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'pages' && <PageList currentUrl={currentUrl} />}
        {activeTab === 'import-export' && <ImportExport />}
      </div>
    </div>
  );
}
