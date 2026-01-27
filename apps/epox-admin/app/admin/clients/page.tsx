'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronRight } from 'lucide-react';

interface ClientStats {
  userCount: number;
  productCount: number;
  generationCount: number;
  currentMonthCostUsd: number;
}

interface ClientListItem {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  createdAt: Date;
  updatedAt: Date;
  stats: ClientStats;
}

interface ClientListResponse {
  clients: ClientListItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function AdminClientsPage() {
  const [data, setData] = useState<ClientListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchClients();
  }, [search, page]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('limit', String(pageSize));
      params.set('offset', String(page * pageSize));

      const response = await fetch(`/api/admin/clients?${params}`);
      if (!response.ok) throw new Error('Failed to fetch clients');

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0); // Reset to first page on new search
    setSearch(searchInput);
  };

  const handlePrevPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (data?.pagination.hasMore) {
      setPage(page + 1);
    }
  };

  return (
    <div className="admin-clients" data-testid="admin-clients">
      <div className="admin-clients__header">
        <div>
          <h1 className="admin-clients__title">Clients</h1>
          <p className="admin-clients__subtitle">Manage all client accounts</p>
        </div>

        <form onSubmit={handleSearch} className="admin-clients__search-form">
          <div className="admin-clients__search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="admin-clients__search-input"
              data-testid="client-search-input"
            />
          </div>
        </form>
      </div>

      {error && (
        <div className="admin-error" data-testid="admin-error">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="admin-loading" data-testid="admin-loading">
          Loading clients...
        </div>
      )}

      {data && (
        <>
          <div className="admin-clients__list">
            {data.clients.length === 0 ? (
              <div className="admin-clients__empty" data-testid="clients-empty">
                No clients found
              </div>
            ) : (
              data.clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/admin/clients/${client.id}`}
                  className="admin-clients__item"
                  data-testid={`client-item-${client.id}`}
                >
                  <div className="admin-clients__item-info">
                    {client.logo ? (
                      <img src={client.logo} alt={client.name} className="admin-clients__item-logo" />
                    ) : (
                      <div className="admin-clients__item-logo-placeholder">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="admin-clients__item-name">{client.name}</h3>
                      {client.slug && <p className="admin-clients__item-slug">{client.slug}</p>}
                    </div>
                  </div>

                  <div className="admin-clients__item-stats">
                    <div className="admin-clients__stat">
                      <span className="admin-clients__stat-value">{client.stats.userCount}</span>
                      <span className="admin-clients__stat-label">Users</span>
                    </div>
                    <div className="admin-clients__stat">
                      <span className="admin-clients__stat-value">{client.stats.productCount}</span>
                      <span className="admin-clients__stat-label">Products</span>
                    </div>
                    <div className="admin-clients__stat">
                      <span className="admin-clients__stat-value">{client.stats.generationCount}</span>
                      <span className="admin-clients__stat-label">Generations</span>
                    </div>
                    <div className="admin-clients__stat">
                      <span className="admin-clients__stat-value">
                        ${client.stats.currentMonthCostUsd.toFixed(2)}
                      </span>
                      <span className="admin-clients__stat-label">Cost (MTD)</span>
                    </div>
                  </div>

                  <ChevronRight size={20} className="admin-clients__item-arrow" />
                </Link>
              ))
            )}
          </div>

          <div className="admin-clients__pagination-container">
            <div className="admin-clients__pagination-info" data-testid="clients-pagination-info">
              Showing {data.pagination.offset + 1}-
              {Math.min(data.pagination.offset + data.pagination.limit, data.pagination.total)} of{' '}
              {data.pagination.total} clients
            </div>
            <div className="admin-clients__pagination-controls">
              <button
                onClick={handlePrevPage}
                disabled={page === 0 || loading}
                className="admin-clients__pagination-button"
                data-testid="pagination-prev"
              >
                Previous
              </button>
              <span className="admin-clients__pagination-page">
                Page {page + 1} of {Math.ceil(data.pagination.total / pageSize)}
              </span>
              <button
                onClick={handleNextPage}
                disabled={!data.pagination.hasMore || loading}
                className="admin-clients__pagination-button"
                data-testid="pagination-next"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
