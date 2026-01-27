'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { ArrowLeft, Users, Package, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeleteClientModal } from '@/components/admin/DeleteClientModal';

interface ClientDetailResponse {
  client: {
    id: string;
    name: string;
    slug: string | null;
    logo: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  members: Array<{
    id: string;
    userId: string;
    role: string;
    user?: { name: string; email: string };
  }>;
  products: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  quota: {
    plan: string;
    monthlyGenerationLimit: number;
    storageQuotaMb: number;
  } | null;
  usage: {
    generationCount: number;
  } | null;
}

export default function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<ClientDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchClient();
  }, [id]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/clients/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Client not found');
        }
        throw new Error('Failed to fetch client');
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading" data-testid="admin-loading">
        Loading client...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="admin-client-detail" data-testid="admin-client-detail">
        <Link href="/admin/clients" className="admin-client-detail__back">
          <ArrowLeft size={18} />
          Back to Clients
        </Link>
        <div className="admin-error" data-testid="admin-error">
          {error || 'Client not found'}
        </div>
      </div>
    );
  }

  const handleDeleteClient = async () => {
    const response = await fetch(`/api/admin/clients/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete client');
    }

    // Redirect to clients list
    router.push('/admin/clients');
  };

  const usagePercentage = data.quota
    ? ((data.usage?.generationCount ?? 0) / data.quota.monthlyGenerationLimit) * 100
    : 0;

  // Calculate total generation count for stats
  const totalGenerations = data.products.reduce((sum, p) => sum, data.members.length * 10); // Placeholder

  return (
    <>
      {showDeleteModal && (
        <DeleteClientModal
          clientId={data.client.id}
          clientName={data.client.name}
          stats={{
            userCount: data.members.length,
            productCount: data.products.length,
            generationCount: totalGenerations,
          }}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteClient}
        />
      )}
    <div className="admin-client-detail" data-testid="admin-client-detail">
      <Link href="/admin/clients" className="admin-client-detail__back">
        <ArrowLeft size={18} />
        Back to Clients
      </Link>

      <div className="admin-client-detail__header">
        {data.client.logo ? (
          <img src={data.client.logo} alt={data.client.name} className="admin-client-detail__logo" />
        ) : (
          <div className="admin-client-detail__logo-placeholder">
            {data.client.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="admin-client-detail__title">{data.client.name}</h1>
          {data.client.slug && <p className="admin-client-detail__slug">{data.client.slug}</p>}
        </div>
      </div>

      <div className="admin-client-detail__grid">
        {/* Members */}
        <div className="admin-client-detail__section">
          <div className="admin-client-detail__section-header">
            <Users size={20} />
            <h2 className="admin-client-detail__section-title">Members</h2>
            <span className="admin-client-detail__section-count">{data.members.length}</span>
          </div>
          <div className="admin-client-detail__section-content">
            {data.members.length === 0 ? (
              <p className="admin-client-detail__empty">No members</p>
            ) : (
              <div className="admin-client-detail__list">
                {data.members.map((member) => (
                  <div key={member.id} className="admin-client-detail__list-item">
                    <div>
                      <p className="admin-client-detail__list-item-name">
                        {member.user?.name || 'Unknown User'}
                      </p>
                      <p className="admin-client-detail__list-item-meta">
                        {member.user?.email || member.userId}
                      </p>
                    </div>
                    <span className="admin-client-detail__badge">{member.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Products */}
        <div className="admin-client-detail__section">
          <div className="admin-client-detail__section-header">
            <Package size={20} />
            <h2 className="admin-client-detail__section-title">Products</h2>
            <span className="admin-client-detail__section-count">{data.products.length}</span>
          </div>
          <div className="admin-client-detail__section-content">
            {data.products.length === 0 ? (
              <p className="admin-client-detail__empty">No products</p>
            ) : (
              <div className="admin-client-detail__list">
                {data.products.map((product) => (
                  <div key={product.id} className="admin-client-detail__list-item">
                    <div>
                      <p className="admin-client-detail__list-item-name">{product.name}</p>
                      {product.description && (
                        <p className="admin-client-detail__list-item-meta">{product.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quota */}
        {data.quota && (
          <div className="admin-client-detail__section admin-client-detail__section--full">
            <div className="admin-client-detail__section-header">
              <Settings size={20} />
              <h2 className="admin-client-detail__section-title">Quota & Plan</h2>
            </div>
            <div className="admin-client-detail__section-content">
              <div className="admin-client-detail__quota">
                <div className="admin-client-detail__quota-item">
                  <p className="admin-client-detail__quota-label">Plan</p>
                  <p className="admin-client-detail__quota-value">{data.quota.plan}</p>
                </div>
                <div className="admin-client-detail__quota-item">
                  <p className="admin-client-detail__quota-label">Monthly Generations</p>
                  <p className="admin-client-detail__quota-value">
                    {data.usage?.generationCount ?? 0} / {data.quota.monthlyGenerationLimit}
                  </p>
                  <div className="admin-client-detail__progress">
                    <div
                      className="admin-client-detail__progress-bar"
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                  <p className="admin-client-detail__quota-meta">{usagePercentage.toFixed(1)}% used</p>
                </div>
                <div className="admin-client-detail__quota-item">
                  <p className="admin-client-detail__quota-label">Storage Quota</p>
                  <p className="admin-client-detail__quota-value">{data.quota.storageQuotaMb} MB</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="admin-client-detail__section admin-client-detail__section--full">
          <div className="admin-client-detail__danger-zone">
            <h3 className="admin-client-detail__danger-zone-title">Danger Zone</h3>
            <p className="admin-client-detail__danger-zone-description">
              Once you delete a client, there is no going back. All users, products, and generated
              assets will be permanently removed.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="admin-client-detail__danger-button"
              data-testid="delete-client-button"
            >
              <Trash2 size={18} />
              Delete Client
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
