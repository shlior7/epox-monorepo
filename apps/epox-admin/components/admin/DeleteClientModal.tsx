'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteClientModalProps {
  clientId: string;
  clientName: string;
  stats: {
    userCount: number;
    productCount: number;
    generationCount: number;
  };
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteClientModal({
  clientId,
  clientName,
  stats,
  onClose,
  onConfirm,
}: DeleteClientModalProps) {
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmName === clientName;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete client');
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" data-testid="delete-client-modal">
      <div className="modal-content modal-content--danger">
        <div className="modal-header">
          <div className="modal-icon modal-icon--danger">
            <AlertTriangle size={24} />
          </div>
          <button
            onClick={onClose}
            className="modal-close"
            disabled={isDeleting}
            data-testid="modal-close-button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <h2 className="modal-title">Delete Client</h2>
          <p className="modal-description">
            You are about to permanently delete <strong>{clientName}</strong> and all associated data.
            This action cannot be undone.
          </p>

          <div className="modal-stats">
            <div className="modal-stat">
              <span className="modal-stat-value">{stats.userCount}</span>
              <span className="modal-stat-label">Users</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-value">{stats.productCount}</span>
              <span className="modal-stat-label">Products</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-value">{stats.generationCount}</span>
              <span className="modal-stat-label">Generations</span>
            </div>
          </div>

          <div className="modal-warning">
            <AlertTriangle size={16} />
            <p>
              All users, products, generations, and associated data will be permanently deleted.
              Users with no other client memberships will also be removed.
            </p>
          </div>

          <div className="modal-confirm">
            <label htmlFor="confirm-name" className="modal-confirm-label">
              Type <strong>{clientName}</strong> to confirm:
            </label>
            <input
              id="confirm-name"
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={clientName}
              className="modal-confirm-input"
              disabled={isDeleting}
              autoComplete="off"
              data-testid="confirm-name-input"
            />
          </div>

          {error && (
            <div className="modal-error" data-testid="modal-error">
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            onClick={onClose}
            className="modal-button modal-button--secondary"
            disabled={isDeleting}
            data-testid="modal-cancel-button"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="modal-button modal-button--danger"
            disabled={!isConfirmed || isDeleting}
            data-testid="modal-delete-button"
          >
            <Trash2 size={18} />
            {isDeleting ? 'Deleting...' : 'Delete Client'}
          </button>
        </div>
      </div>
    </div>
  );
}
