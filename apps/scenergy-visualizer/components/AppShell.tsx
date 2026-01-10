'use client';

/**
 * AppShell - Main application layout with navigation
 * Handles routing, navigation state, and modals
 */

import React, { useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User } from 'lucide-react';
import { useData } from '@/lib/contexts/DataContext';
import { ModalProvider } from '@/lib/contexts/ModalContext';
import { useAuthInfo } from '@/lib/auth/use-auth-info';
import { NavigationDrawer } from './NavigationDrawer';
import { Breadcrumb } from './Breadcrumb';
import { ThemeToggle } from './common/ThemeToggle';
import { AccountSettingsModal, AddClientModal, AddProductModal, EditProductModal, EditSessionModal, ImageModal, SignOutModal } from './modals';
import { BulkAddProductsModal } from './modals/BulkAddProductsModal';
import { ImportProductsFromProviderModal } from './modals/ImportProductsFromProviderModal';
import styles from './AppShell.module.scss';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { addSession, deleteProduct, updateSession, clients } = useData();
  const { session, role, isLoading: isAuthLoading } = useAuthInfo();
  const isLoginRoute = pathname.startsWith('/admin/login');

  // Extract route params from pathname
  // Format: /[clientId]/[productId]/[sessionId] or /[clientId]/client-session/[sessionId]
  const pathSegments = pathname.split('/').filter(Boolean);
  const clientId = pathSegments[0] || null;
  const productId = pathSegments[1] === 'client-session' || pathSegments[1] === 'settings' ? null : pathSegments[1] || null;
  const sessionId = pathSegments[1] === 'client-session' || pathSegments[2] === 'settings' ? null : pathSegments[2] || null;
  const clientSessionId = pathSegments[1] === 'client-session' ? pathSegments[2] || null : null;

  // Build breadcrumb items from current route
  const breadcrumbItems = useMemo(() => {
    if (!clientId) return [];

    const items = [];
    const client = clients.find((c) => c.id === clientId);

    if (client) {
      items.push({
        label: client.name,
        href: `/${clientId}/settings`,
      });

      // Handle client session route
      if (clientSessionId) {
        const clientSession = client.clientSessions?.find((cs) => cs.id === clientSessionId);
        if (clientSession) {
          items.push({
            label: clientSession.name,
            href: `/${clientId}/client-session/${clientSessionId}`,
          });
        }
      } else if (productId && productId !== 'settings') {
        const product = client.products.find((p) => p.id === productId);
        if (product) {
          items.push({
            label: product.name,
            href: `/${clientId}/${productId}/settings`,
          });

          if (sessionId && sessionId !== 'settings') {
            const session = product.sessions.find((s) => s.id === sessionId);
            if (session) {
              items.push({
                label: session.name,
                href: `/${clientId}/${productId}/${sessionId}`,
              });
            }
          }
        }
      }
    }

    return items;
  }, [clientId, productId, sessionId, clientSessionId, clients]);

  // Modal states
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [addProductClientId, setAddProductClientId] = useState<string | null>(null);
  const [isBulkAddProductsModalOpen, setIsBulkAddProductsModalOpen] = useState(false);
  const [bulkAddProductsClientId, setBulkAddProductsClientId] = useState<string | null>(null);
  const [isImportFromProviderModalOpen, setIsImportFromProviderModalOpen] = useState(false);
  const [importFromProviderClientId, setImportFromProviderClientId] = useState<string | null>(null);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editProductInfo, setEditProductInfo] = useState<{ clientId: string; productId: string } | null>(null);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [sessionModalInfo, setSessionModalInfo] = useState<{
    clientId: string;
    productId: string;
    sessionId: string;
    name: string;
  } | null>(null);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  const activeOrgId = session ? 'All Clients' : null;

  const displayName = session?.name || session?.email || 'Account';
  const displayEmail = session?.email || null;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const roleLabel = session
    ? role
      ? role.charAt(0).toUpperCase() + role.slice(1)
      : isAuthLoading
        ? 'Loading...'
        : 'Unknown'
    : 'Signed out';

  const handleAccountAction = () => {
    if (session) {
      setIsAccountSettingsOpen(true);
      return;
    }
    router.push('/admin/login');
  };

  // Handle session selection - navigate to route
  const handleSessionSelect = (clientId: string, productId: string, sessionId: string) => {
    router.push(`/${clientId}/${productId}/${sessionId}`);
  };

  // Handle add client
  const handleAddClient = () => {
    setIsAddClientModalOpen(true);
  };

  // Handle add product
  const handleAddProductModal = (clientId: string) => {
    setAddProductClientId(clientId);
    setIsAddProductModalOpen(true);
  };

  // Handle bulk add products
  const handleOpenBulkAddProductsModal = (clientId: string) => {
    setBulkAddProductsClientId(clientId);
    setIsBulkAddProductsModalOpen(true);
  };

  // Handle import from provider
  const handleOpenImportFromProviderModal = (clientId: string) => {
    setImportFromProviderClientId(clientId);
    setIsImportFromProviderModalOpen(true);
  };

  // Handle edit product
  const handleEditProduct = (clientId: string, productId: string) => {
    setEditProductInfo({ clientId, productId });
    setIsEditProductModalOpen(true);
  };

  const handleDeleteProduct = async (clientId: string, productId: string) => {
    try {
      // Check if we need to navigate BEFORE deleting to avoid race condition
      const shouldNavigate = pathname.startsWith(`/${clientId}/${productId}`);

      if (shouldNavigate) {
        // Navigate first to prevent notFound() from being called
        console.log('Navigating away before delete to avoid race condition');
        router.push('/');
        // Wait a bit for navigation to start
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      await deleteProduct(clientId, productId);
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  const handleEditSession = (clientId: string, productId: string, sessionId: string, sessionName: string) => {
    console.log('Editing session:', { clientId, productId, sessionId, sessionName });
    setSessionModalInfo({ clientId, productId, sessionId, name: sessionName });
  };

  const handleSaveSessionName = async (name: string) => {
    if (!sessionModalInfo) return;
    try {
      await updateSession(sessionModalInfo.clientId, sessionModalInfo.productId, sessionModalInfo.sessionId, {
        name,
      });
      setSessionModalInfo(null);
    } catch (error) {
      console.error('Failed to update session name:', error);
      alert('Failed to update session name. Please try again.');
    }
  };
  // Handle product added - automatically create first session and navigate to it
  const handleClientAdded = async (clientId: string) => {
    try {
      // Wait a tick for state to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Navigate to the new session with view transition
      router.push(`/${clientId}`);
    } catch (error) {
      console.error('Failed to create initial session:', error);
      alert('Product created but failed to create initial session. Please try creating a new session manually.');
    }
  };
  // Handle product added - automatically create first session and navigate to it
  const handleProductAdded = async (productId: string) => {
    if (!addProductClientId) return;

    try {
      // Wait a tick for state to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      const session = await addSession(addProductClientId, productId, 'First Session');

      // Navigate to the new session with view transition
      router.push(`/${addProductClientId}/${productId}/${session.id}`);
    } catch (error) {
      console.error('Failed to create initial session:', error);
      alert('Product created but failed to create initial session. Please try creating a new session manually.');
    }
  };

  // Modal handlers exposed via context
  const modalHandlers = {
    openBulkAddProductsModal: handleOpenBulkAddProductsModal,
    openAddProductsModal: handleAddProductModal,
    openImportFromProviderModal: handleOpenImportFromProviderModal,
  };

  if (isLoginRoute) {
    return <>{children}</>;
  }

  return (
    <ModalProvider handlers={modalHandlers}>
      <div className={styles.root}>
        {/* Navigation Drawer */}
        <NavigationDrawer
          activeClientId={clientId || null}
          activeProductId={productId || null}
          activeSessionId={sessionId || null}
          activeClientSessionId={clientSessionId || null}
          authRole={role ?? null}
          onSessionSelect={handleSessionSelect}
          onAddClient={handleAddClient}
          onAddProduct={handleAddProductModal}
          onAddProducts={handleOpenBulkAddProductsModal}
          onEditProduct={handleEditProduct}
          onDeleteProduct={handleDeleteProduct}
          onEditSession={handleEditSession}
        />

        {/* Main Content */}
        <div className={styles.mainContent}>
          {/* Breadcrumb Navigation with Theme Toggle */}
          <div className={styles.breadcrumbWrapper}>
            {breadcrumbItems.length > 0 && <Breadcrumb items={breadcrumbItems} />}
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.accountButton}
                onClick={handleAccountAction}
                aria-label={session ? 'Open account settings' : 'Sign in'}
                data-testid="account-button"
              >
                <span className={styles.accountAvatar}>{session ? initials || <User size={14} /> : <User size={14} />}</span>
                <span className={styles.accountMeta}>
                  <span className={styles.accountName}>{session ? displayName : 'Sign in'}</span>
                  <span className={styles.accountRole}>{roleLabel}</span>
                </span>
              </button>
              <ThemeToggle size="sm" />
            </div>
          </div>

          {children}
        </div>

        {/* Modals */}
        <AddClientModal isOpen={isAddClientModalOpen} onClose={() => setIsAddClientModalOpen(false)} onClientAdded={handleClientAdded} />

        <AddProductModal
          isOpen={isAddProductModalOpen}
          clientId={addProductClientId}
          onClose={() => {
            setIsAddProductModalOpen(false);
            setAddProductClientId(null);
          }}
          onProductAdded={handleProductAdded}
        />

        <EditProductModal
          isOpen={isEditProductModalOpen}
          onClose={() => {
            setIsEditProductModalOpen(false);
            setEditProductInfo(null);
          }}
          productInfo={editProductInfo}
        />

        <EditSessionModal
          isOpen={sessionModalInfo !== null}
          initialName={sessionModalInfo?.name || ''}
          onClose={() => setSessionModalInfo(null)}
          onSave={handleSaveSessionName}
        />

        <BulkAddProductsModal
          isOpen={isBulkAddProductsModalOpen}
          clientId={bulkAddProductsClientId || ''}
          onClose={() => {
            setIsBulkAddProductsModalOpen(false);
            setBulkAddProductsClientId(null);
          }}
        />

        <ImportProductsFromProviderModal
          isOpen={isImportFromProviderModalOpen}
          clientId={importFromProviderClientId || ''}
          onClose={() => {
            setIsImportFromProviderModalOpen(false);
            setImportFromProviderClientId(null);
          }}
        />

        <ImageModal isOpen={imageModalUrl !== null} imageUrl={imageModalUrl} onClose={() => setImageModalUrl(null)} />

        <AccountSettingsModal
          isOpen={isAccountSettingsOpen}
          onClose={() => setIsAccountSettingsOpen(false)}
          onSignOut={() => setIsSignOutModalOpen(true)}
          name={displayName}
          email={displayEmail}
          role={role ?? undefined}
          organizationId={activeOrgId}
        />

        <SignOutModal
          isOpen={isSignOutModalOpen}
          onClose={() => setIsSignOutModalOpen(false)}
          onSignedOut={() => {
            setIsSignOutModalOpen(false);
            setIsAccountSettingsOpen(false);
            router.push('/admin/login');
          }}
        />
      </div>
    </ModalProvider>
  );
}

// Export image modal opener for use in child components
export function useImageModal() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  return {
    openImage: setImageUrl,
    imageModal: imageUrl ? <ImageModal isOpen={true} imageUrl={imageUrl} onClose={() => setImageUrl(null)} /> : null,
  };
}
