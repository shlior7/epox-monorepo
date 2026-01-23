import { useEffect, useState } from 'react';
import { getAllAnnotatedUrls, normalizeUrl } from '@/shared/storage';
import type { UrlAnnotationStore } from '@/shared/types';

interface PageListProps {
  currentUrl: string;
}

export function PageList({ currentUrl }: PageListProps) {
  const [store, setStore] = useState<UrlAnnotationStore>({});
  const [filter, setFilter] = useState<'all' | 'hasComments' | 'unresolved'>('all');

  useEffect(() => {
    loadPages();

    // Listen for storage changes
    const handleStorageChange = () => {
      loadPages();
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const loadPages = async () => {
    const data = await getAllAnnotatedUrls();
    setStore(data);
  };

  const pages = Object.entries(store)
    .map(([url, data]) => ({
      url,
      ...data,
      commentCount: data.annotations.filter((a) => a.type === 'comment').length,
      unresolvedCount: data.annotations.filter((a) => a.type === 'comment' && !a.resolved).length,
    }))
    .filter((page) => {
      if (filter === 'hasComments') return page.commentCount > 0;
      if (filter === 'unresolved') return page.unresolvedCount > 0;
      return true;
    })
    .sort((a, b) => new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime());

  const handleNavigate = (url: string) => {
    chrome.tabs.update({ url });
  };

  const normalizedCurrentUrl = normalizeUrl(currentUrl);

  return (
    <div className="flex flex-col h-full" data-testid="anton-page-list">
      {/* Filter buttons */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded text-sm ${filter === 'all' ? 'bg-accent-primary text-white' : 'bg-dark-surface text-dark-text'}`}
            onClick={() => setFilter('all')}
            data-testid="filter-all"
          >
            All ({Object.keys(store).length})
          </button>
          <button
            className={`px-3 py-1 rounded text-sm ${filter === 'hasComments' ? 'bg-accent-primary text-white' : 'bg-dark-surface text-dark-text'}`}
            onClick={() => setFilter('hasComments')}
            data-testid="filter-comments"
          >
            Has Comments
          </button>
          <button
            className={`px-3 py-1 rounded text-sm ${filter === 'unresolved' ? 'bg-accent-primary text-white' : 'bg-dark-surface text-dark-text'}`}
            onClick={() => setFilter('unresolved')}
            data-testid="filter-unresolved"
          >
            Unresolved
          </button>
        </div>
      </div>

      {/* Page list */}
      <div className="flex-1 overflow-y-auto">
        {pages.length === 0 ? (
          <div className="p-8 text-center text-dark-muted" data-testid="empty-state">
            <p>No annotated pages yet</p>
            <p className="text-sm mt-2">Start adding annotations to see them here</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {pages.map((page) => {
              const isCurrentPage = normalizeUrl(page.url) === normalizedCurrentUrl;
              return (
                <div
                  key={page.url}
                  className={`p-3 rounded border cursor-pointer transition ${
                    isCurrentPage
                      ? 'bg-accent-primary/10 border-accent-primary'
                      : 'bg-dark-surface border-dark-border hover:border-dark-text'
                  }`}
                  onClick={() => handleNavigate(page.url)}
                  data-testid={`page-item-${page.url}`}
                >
                  {/* Thumbnail placeholder */}
                  {page.thumbnail ? (
                    <img
                      src={page.thumbnail}
                      alt={page.title}
                      className="w-full h-24 object-cover rounded mb-2"
                    />
                  ) : (
                    <div className="w-full h-24 bg-dark-border rounded mb-2 flex items-center justify-center text-dark-muted">
                      📄
                    </div>
                  )}

                  {/* Title */}
                  <h3 className="font-medium text-sm text-dark-text truncate mb-1">
                    {page.title || 'Untitled'}
                  </h3>

                  {/* URL */}
                  <p className="text-xs text-dark-muted truncate mb-2">{page.url}</p>

                  {/* Stats */}
                  <div className="flex gap-3 text-xs">
                    <span className="text-dark-muted">
                      {page.annotations.length} annotation{page.annotations.length !== 1 ? 's' : ''}
                    </span>
                    {page.commentCount > 0 && (
                      <span className="text-accent-primary">
                        {page.commentCount} comment{page.commentCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {page.unresolvedCount > 0 && (
                      <span className="text-accent-warning">
                        {page.unresolvedCount} unresolved
                      </span>
                    )}
                  </div>

                  {/* Last visited */}
                  <p className="text-xs text-dark-muted mt-1">
                    {new Date(page.lastVisited).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
