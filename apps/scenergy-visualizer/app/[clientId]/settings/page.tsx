'use client';

/**
 * Client Settings Page
 * Route: /[clientId]/settings
 */

import { Accordion, ActionsMenu } from '@/components/common';
import { SafeNextImage } from '@/components/common/SafeImage';
import { CopyButton } from '@/components/CopyButton';
import { DangerZone } from '@/components/DangerZone';
import { AllClientGeneratedImagesModal } from '@/components/modals/AllClientGeneratedImagesModal';
import { EditProviderCredentialsModal } from '@/components/modals/EditProviderCredentialsModal';
import { ImageModal } from '@/components/modals/ImageModal';
import { useData } from '@/lib/contexts/DataContext';
import { useModalHandlers } from '@/lib/contexts/ModalContext';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { useToast } from '@/lib/hooks/useToast';
import { getImageUrl, getPreviewImageUrl, S3Paths } from '@/lib/services/s3/browser';
import { DEFAULT_AI_MODEL_CONFIG } from '@/lib/services/shared/constants';
import type { AIModelConfig, Product } from '@/lib/types/app-types';
import { buildTestId } from '@/lib/utils/test-ids';
import clsx from 'clsx';
import {
  CheckCircle,
  Download,
  Edit2,
  Eye,
  EyeOff,
  FolderOpen,
  Image,
  Key,
  Layers,
  Save,
  Settings,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  Upload,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { notFound, useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import styles from './page.module.scss';

const DEFAULT_CLIENT_EMAIL_DOMAIN = 'scene.studio';

const buildDefaultClientEmail = (clientId: string) => `${clientId}@${DEFAULT_CLIENT_EMAIL_DOMAIN}`;

type ClientLoginUser = {
  id: string;
  email: string;
  name: string;
};

export default function ClientSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { clients, isLoading, updateClient, addClientSession, deleteClientSession, deleteClient, toggleFavoriteGeneratedImage } = useData();
  const { openBulkAddProductsModal, openAddProductsModal, openImportFromProviderModal } = useModalHandlers();
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [clientName, setClientName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [openProductMenu, setOpenProductMenu] = useState<string | null>(null);
  const [openClientSessionMenu, setOpenClientSessionMenu] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isProductsActionMenuOpen, setIsProductsActionMenuOpen] = useState(false);
  const [downloadingProductId, setDownloadingProductId] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isGeneratingForAll, setIsGeneratingForAll] = useState(false);
  const [isCreatingScene, setIsCreatingScene] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [isAllImagesModalOpen, setIsAllImagesModalOpen] = useState(false);
  const [selectedImageModel, setSelectedImageModel] = useState<string>(DEFAULT_AI_MODEL_CONFIG.imageModel);
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [clientUser, setClientUser] = useState<ClientLoginUser | null>(null);
  const [clientUserEmail, setClientUserEmail] = useState('');
  const [clientUserPassword, setClientUserPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [isLoadingClientUser, setIsLoadingClientUser] = useState(false);
  const [isSavingClientUser, setIsSavingClientUser] = useState(false);
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);
  const [clientUserError, setClientUserError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showGeneratedPassword, setShowGeneratedPassword] = useState(false);

  const clientId = params.clientId as string;
  const client = clients.find((c) => c.id === clientId);
  const clientProductsCount = client?.products.length ?? 0;
  const defaultClientEmail = buildDefaultClientEmail(clientId);

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isLoading && !client) {
      notFound();
    }
  }, [isLoading, client]);

  useEffect(() => {
    if (client) {
      setClientName(client.name);
      setSelectedImageModel(client.aiModelConfig?.imageModel || DEFAULT_AI_MODEL_CONFIG.imageModel);
    }
  }, [client]);

  useEffect(() => {
    if (isLoading || !client) {
      return;
    }

    let isMounted = true;

    const loadClientUser = async () => {
      setIsLoadingClientUser(true);
      setClientUserError(null);
      setGeneratedPassword(null);
      setClientUserPassword('');
      setShowGeneratedPassword(false);

      try {
        const response = await fetch(`/api/clients/${clientId}/user`);

        if (response.status === 404) {
          if (isMounted) {
            setClientUser(null);
            setClientUserEmail(defaultClientEmail);
          }
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error ?? 'Failed to load client login');
        }

        if (isMounted) {
          setClientUser(data.user);
          setClientUserEmail(data.user.email);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to load client login:', err);
        setClientUserError(err?.message ?? 'Failed to load client login');
      } finally {
        if (isMounted) {
          setIsLoadingClientUser(false);
        }
      }
    };

    loadClientUser();

    return () => {
      isMounted = false;
    };
  }, [clientId, client, isLoading, defaultClientEmail]);

  useEffect(() => {
    if (clientProductsCount === 0) {
      setIsProductsActionMenuOpen(false);
      setOpenProductMenu(null);
    }
  }, [clientProductsCount]);

  // Handler for removing an image from favorites
  const handleRemoveFromFavorites = useCallback(
    async (productId: string, imageId: string, sessionId: string) => {
      try {
        await toggleFavoriteGeneratedImage(clientId, productId, imageId, sessionId);
      } catch (err) {
        console.error('Failed to remove from favorites:', err);
        error('Failed to remove from favorites');
      }
    },
    [clientId, toggleFavoriteGeneratedImage, error]
  );

  // Handler for toggling favorites in the all images modal
  const handleToggleFavoriteFromModal = useCallback(
    async (productId: string, imageId: string, sessionId: string) => {
      try {
        await toggleFavoriteGeneratedImage(clientId, productId, imageId, sessionId);
      } catch (err) {
        console.error('Failed to toggle favorite:', err);
        error('Failed to toggle favorite');
      }
    },
    [clientId, toggleFavoriteGeneratedImage, error]
  );

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading client settings...</div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  const normalizedEmail = clientUserEmail.trim().toLowerCase();
  const emailChanged = normalizedEmail !== (clientUser?.email ?? '').toLowerCase();
  const hasPasswordInput = clientUserPassword.trim().length > 0;
  const canSaveClientUser =
    !isLoadingClientUser && !isSavingClientUser && normalizedEmail.length > 0 && (hasPasswordInput || (clientUser ? emailChanged : false));
  const canGeneratePassword = !isLoadingClientUser && !isGeneratingPassword && normalizedEmail.length > 0;

  const handleSaveClientName = async () => {
    if (!clientName.trim()) {
      error('Client name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      await updateClient(clientId, { name: clientName.trim() });
      success('Client name updated successfully');
    } catch (err) {
      console.error('Failed to update client name:', err);
      error('Failed to update client name');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClientUser = async () => {
    const trimmedEmail = clientUserEmail.trim().toLowerCase();
    const trimmedPassword = clientUserPassword.trim();
    const hasPassword = trimmedPassword.length > 0;
    const isNewUser = !clientUser;

    if (!trimmedEmail) {
      error('Client login email is required');
      return;
    }

    if (isNewUser && !hasPassword) {
      error('Set a password or generate one to create a new login');
      return;
    }

    const hasEmailChange = trimmedEmail !== (clientUser?.email ?? '').toLowerCase();
    if (!hasEmailChange && !hasPassword && !isNewUser) {
      error('No changes to save');
      return;
    }

    setIsSavingClientUser(true);
    setClientUserError(null);

    try {
      const response = await fetch(`/api/clients/${clientId}/user`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          ...(hasPassword ? { password: trimmedPassword } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to update client login');
      }

      setClientUser(data.user);
      setClientUserEmail(data.user.email);
      setClientUserPassword('');
      setGeneratedPassword(null);
      setShowPassword(false);
      setShowGeneratedPassword(false);
      success(isNewUser ? 'Client login created' : 'Client login updated');
    } catch (err: any) {
      console.error('Failed to update client login:', err);
      const message = err?.message ?? 'Failed to update client login';
      setClientUserError(message);
      error(message);
    } finally {
      setIsSavingClientUser(false);
    }
  };

  const handleGeneratePassword = async () => {
    const trimmedEmail = clientUserEmail.trim().toLowerCase();

    if (!trimmedEmail) {
      error('Client login email is required');
      return;
    }

    setIsGeneratingPassword(true);
    setClientUserError(null);

    try {
      const response = await fetch(`/api/clients/${clientId}/user`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          generatePassword: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to generate password');
      }

      setClientUser(data.user);
      setClientUserEmail(data.user.email);
      setClientUserPassword('');
      setGeneratedPassword(data.generatedPassword ?? null);
      setShowGeneratedPassword(true);
      setShowPassword(false);
      success(clientUser ? 'Password generated' : 'Client login created with a new password');
    } catch (err: any) {
      console.error('Failed to generate client password:', err);
      const message = err?.message ?? 'Failed to generate password';
      setClientUserError(message);
      error(message);
    } finally {
      setIsGeneratingPassword(false);
    }
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedImageModel(modelId);
    setIsSavingModel(true);
    try {
      const newConfig: AIModelConfig = {
        imageModel: modelId,
        fallbackImageModel: DEFAULT_AI_MODEL_CONFIG.fallbackImageModel,
        textModel: DEFAULT_AI_MODEL_CONFIG.textModel,
        fallbackTextModel: DEFAULT_AI_MODEL_CONFIG.fallbackTextModel,
      };
      await updateClient(clientId, { aiModelConfig: newConfig });
      success('AI model updated successfully');
    } catch (err) {
      console.error('Failed to update AI model:', err);
      error('Failed to update AI model');
      // Revert to previous selection
      setSelectedImageModel(client?.aiModelConfig?.imageModel || DEFAULT_AI_MODEL_CONFIG.imageModel);
    } finally {
      setIsSavingModel(false);
    }
  };

  const handleDownloadProductImages = async (productId: string) => {
    const product = client.products.find((p) => p.id === productId);
    if (!product || !product.productImageIds || product.productImageIds.length === 0) {
      error('No images to download');
      return;
    }

    setDownloadingProductId(productId);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const imageId of product.productImageIds) {
        const imageUrl = getPreviewImageUrl(clientId, productId, imageId);
        // Use proxy to avoid CORS issues
        const proxyUrl = `/api/download-image?url=${encodeURIComponent(imageUrl)}`;
        const response = await fetch(proxyUrl);
        const blob = await response.blob();
        zip.file(`${imageId}.jpg`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${product.name}-images.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      success('Images downloaded successfully');
    } catch (err) {
      console.error('Failed to download images:', err);
      error('Failed to download images');
    } finally {
      setDownloadingProductId(null);
    }
  };

  const handleGoToProductSessions = (productId: string) => {
    const product = client.products.find((p) => p.id === productId);
    if (!product) return;

    if (product.sessions.length > 0) {
      router.push(`/${clientId}/${productId}/${product.sessions[0].id}`);
    } else {
      router.push(`/${clientId}/${productId}`);
    }
  };

  const handleDownloadAllProducts = async () => {
    setIsDownloadingAll(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const product of client.products) {
        if (product.productImageIds && product.productImageIds.length > 0) {
          const productFolder = zip.folder(product.name);
          if (!productFolder) continue;

          for (const imageId of product.productImageIds) {
            const imageUrl = getPreviewImageUrl(clientId, product.id, imageId);
            // Use proxy to avoid CORS issues
            const proxyUrl = `/api/download-image?url=${encodeURIComponent(imageUrl)}`;
            const response = await fetch(proxyUrl);
            const blob = await response.blob();
            productFolder.file(`${imageId}.jpg`, blob);
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${client.name}-all-products.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      success('All products downloaded successfully');
    } catch (err) {
      console.error('Failed to download all products:', err);
      error('Failed to download all products');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handleGenerateForAllProducts = async () => {
    setIsGeneratingForAll(true);
    try {
      const allProductIds = client.products.map((p) => p.id);

      if (allProductIds.length === 0) {
        error('No products available to generate images for.');
        return;
      }

      const newSession = await addClientSession(clientId, allProductIds);
      router.push(`/${clientId}/client-session/${newSession.id}`);
      success('Studio session created successfully');
    } catch (err) {
      console.error('Failed to create studio session:', err);
      error('Failed to create studio session. Please try again.');
    } finally {
      setIsGeneratingForAll(false);
    }
  };

  const handleDeleteClientSessionWithConfirm = async (sessionId: string, sessionName: string) => {
    await confirm({
      title: 'Delete Studio Session?',
      message: `Are you sure you want to delete "${sessionName}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          // Check if we need to navigate away from the session being deleted
          // Client session route: /[clientId]/client-session/[sessionId]
          const isOnSessionBeingDeleted = window.location.pathname.includes(`/client-session/${sessionId}`);

          if (isOnSessionBeingDeleted) {
            // Navigate to client settings first to prevent 404
            console.log('Navigating to client settings before delete to avoid 404');
            router.push(`/${clientId}/settings`);
            // Wait a bit for navigation to start
            await new Promise((resolve) => setTimeout(resolve, 150));
          }

          await deleteClientSession(clientId, sessionId);
          success('Studio session deleted successfully');
        } catch (err) {
          console.error('Failed to delete studio session:', err);
          error('Failed to delete studio session. Please try again.');
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const handleClientSessionMenuToggle = (event: React.MouseEvent, sessionId: string) => {
    event.stopPropagation();
    setOpenClientSessionMenu(openClientSessionMenu === sessionId ? null : sessionId);
  };

  const handleCreateScene = async () => {
    setIsCreatingScene(true);
    try {
      // TODO: Implement addSceneStudio in DataContext
      // For now, navigate to a new scene with a generated ID
      const newSceneId = `scene-${Date.now()}`;
      router.push(`/${clientId}/scene-studio/${newSceneId}`);
      success('Scene created successfully');
    } catch (err) {
      console.error('Failed to create scene:', err);
      error('Failed to create scene. Please try again.');
    } finally {
      setIsCreatingScene(false);
    }
  };

  const handleDeleteClient = async () => {
    await confirm({
      title: 'Delete Client?',
      message: `Are you sure you want to delete "${client.name}"? This will permanently delete all client data, products, images, and sessions. This action cannot be undone.`,
      confirmLabel: 'Delete Client',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          // Navigate to home screen first to prevent 404
          console.log('Navigating to home before deleting client to avoid 404');
          router.push('/');

          // Wait longer for navigation to complete before deleting
          await new Promise((resolve) => setTimeout(resolve, 500));

          await deleteClient(clientId);
          success('Client deleted successfully');
        } catch (err) {
          console.error('Failed to delete client:', err);
          error('Failed to delete client. Please try again.');
        }
      },
    });
  };

  const hasWooCommerce = client?.commerce?.provider === 'woocommerce';

  const productHeaderMenuItems = [
    {
      label: 'Add Product',
      icon: <Upload size={16} />,
      onClick: (event: React.MouseEvent) => {
        event.stopPropagation();
        openAddProductsModal(clientId);
      },
    },
    {
      label: 'Bulk Add Products',
      icon: <Upload size={16} />,
      onClick: (event: React.MouseEvent) => {
        event.stopPropagation();
        openBulkAddProductsModal(clientId);
      },
    },
    ...(hasWooCommerce
      ? [
          {
            label: 'Import from WooCommerce',
            icon: <ShoppingCart size={16} />,
            onClick: (event: React.MouseEvent) => {
              event.stopPropagation();
              openImportFromProviderModal(clientId);
            },
          },
        ]
      : []),
    {
      label: isGeneratingForAll ? 'Generating...' : 'Generate Images for All Products',
      icon: <Sparkles size={16} />,
      onClick: (event: React.MouseEvent) => {
        event.stopPropagation();
        handleGenerateForAllProducts();
      },
      disabled: clientProductsCount === 0 || isGeneratingForAll,
    },
    {
      label: isDownloadingAll ? 'Downloading...' : 'Download All Products',
      icon: <Download size={16} />,
      onClick: (event: React.MouseEvent) => {
        event.stopPropagation();
        handleDownloadAllProducts();
      },
      disabled: clientProductsCount === 0 || isDownloadingAll,
    },
    {
      label: 'View All Generated Images',
      icon: <Image size={16} />,
      onClick: (event: React.MouseEvent) => {
        event.stopPropagation();
        setIsAllImagesModalOpen(true);
      },
      disabled: clientProductsCount === 0,
    },
  ];

  // Render inline favorites gallery for a product
  // TODO: Implement using pinned field on generated_asset
  const renderProductFavoritesGallery = (_product: Product) => {
    // favoriteGeneratedImages removed - use pinned on generated_asset instead
    const favoriteImages: { imageId: string; sessionId: string }[] = [];

    if (favoriteImages.length === 0) {
      return <div className={styles.inlineFavoritesEmpty}>No favorites yet. Star images in sessions to add them here.</div>;
    }

    return (
      <div className={styles.inlineFavoritesGallery}>
        {favoriteImages.map(({ imageId, sessionId }) => {
          // Check if this session belongs to the product or is a client session
          const isProductSession = _product.sessions.some((s) => s.id === sessionId);

          // Use the correct path based on session type
          const primaryUrl = isProductSession
            ? getImageUrl(S3Paths.getMediaFilePath(clientId, _product.id, sessionId, imageId))
            : getImageUrl(S3Paths.getClientSessionMediaFilePath(clientId, sessionId, imageId));

          const fallbackUrl = isProductSession
            ? getImageUrl(S3Paths.getClientSessionMediaFilePath(clientId, sessionId, imageId))
            : getImageUrl(S3Paths.getMediaFilePath(clientId, _product.id, sessionId, imageId));

          return (
            <div
              key={`${imageId}-${sessionId}`}
              className={styles.inlineFavoriteCard}
              data-testid={buildTestId('client-settings', 'inline-favorite', imageId)}
            >
              <SafeNextImage
                src={primaryUrl}
                fallbackSrc={fallbackUrl}
                alt="Favorite"
                onSafeClick={(url) => setPreviewImageUrl(url as string)}
                width={120}
                height={120}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                type="button"
                className={styles.removeFavoriteButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFromFavorites(_product.id, imageId, sessionId);
                }}
                aria-label="Remove from favorites"
                title="Remove from favorites"
                data-testid={buildTestId('client-settings', 'remove-favorite-button', imageId)}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // Per-product accordion sections
  const productAccordionSections = client.products.map((product) => {
    const hasImages = product.productImageIds.length > 0;
    // TODO: Count pinned assets from generated_asset table
    const favoriteCount: number = 0;

    return {
      value: product.id,
      title: (
        <div className={styles.productAccordionTitle}>
          <span className={styles.productAccordionName}>{product.name}</span>
          <span className={styles.productAccordionMeta}>
            {product.productImageIds.length} image{product.productImageIds.length !== 1 ? 's' : ''} • {favoriteCount} favorite
            {favoriteCount !== 1 ? 's' : ''} • {product.sessions.length} session{product.sessions.length !== 1 ? 's' : ''}
          </span>
        </div>
      ),
      defaultExpanded: false,
      headerSuffix: (
        <div className={styles.productAccordionActions} onClick={(e) => e.stopPropagation()}>
          <ActionsMenu
            items={[
              {
                label: 'Settings',
                icon: <Settings size={16} />,
                onClick: (event: React.MouseEvent) => {
                  event.stopPropagation();
                  router.push(`/${clientId}/${product.id}/settings`);
                },
              },
              {
                label: downloadingProductId === product.id ? 'Downloading...' : 'Download All Images',
                icon: <Download size={16} />,
                onClick: (event: React.MouseEvent) => {
                  event.stopPropagation();
                  handleDownloadProductImages(product.id);
                },
                disabled: !hasImages || downloadingProductId === product.id,
              },
              {
                label: 'Go to Sessions',
                icon: <FolderOpen size={16} />,
                onClick: (event: React.MouseEvent) => {
                  event.stopPropagation();
                  handleGoToProductSessions(product.id);
                },
              },
            ]}
            isOpen={openProductMenu === product.id}
            onToggle={(event) => {
              event.stopPropagation();
              setOpenProductMenu(openProductMenu === product.id ? null : product.id);
            }}
            onClose={() => setOpenProductMenu(null)}
            ariaLabel={`Actions for ${product.name}`}
          />
        </div>
      ),
      children: (
        <div className={styles.productAccordionContent}>
          <div className={styles.productAccordionSection}>
            <div className={styles.productAccordionSectionHeader}>
              <Star size={16} className={styles.favoriteSectionIcon} />
              <span>Favorites ({favoriteCount})</span>
            </div>
            {renderProductFavoritesGallery(product)}
          </div>
        </div>
      ),
    };
  });

  const productsAccordionSections = [
    {
      value: 'products',
      title: `Products (${clientProductsCount})`,
      defaultExpanded: true,
      headerSuffix: (
        <div className={styles.sectionActions}>
          <ActionsMenu
            items={productHeaderMenuItems}
            isOpen={isProductsActionMenuOpen}
            onToggle={(event) => {
              event.stopPropagation();
              setIsProductsActionMenuOpen((prev) => !prev);
            }}
            onClose={() => setIsProductsActionMenuOpen(false)}
            ariaLabel="Product actions"
          />
        </div>
      ),
      children: (
        <>
          {clientProductsCount === 0 ? (
            <p className={styles.emptyState}>No products yet.</p>
          ) : (
            <div className={styles.productAccordionList}>
              <Accordion isMobile={isMobile} sections={productAccordionSections} type="multiple" variant="minimal" />
            </div>
          )}
        </>
      ),
    },
  ];

  const clientSessionsAccordionSections =
    client.clientSessions && client.clientSessions.length > 0
      ? [
          {
            value: 'client-sessions',
            title: `Studio Sessions (${client.clientSessions.length})`,
            defaultExpanded: true,
            children: (
              <div className={styles.productList}>
                {client.clientSessions.map((session) => {
                  const sessionProducts = client.products.filter((p) => session.productIds.includes(p.id));
                  return (
                    <div
                      key={session.id}
                      className={clsx(styles.productRow, styles.productRowInteractive)}
                      onClick={() => router.push(`/${clientId}/client-session/${session.id}`)}
                      data-testid={buildTestId('client-settings', 'client-session-row', session.id)}
                    >
                      <div className={styles.productInfo}>
                        <div className={styles.sessionTitleRow}>
                          <Sparkles size={16} className={styles.sessionIcon} />
                          <span className={styles.productName}>{session.name}</span>
                        </div>
                        <div className={styles.productMeta}>
                          {sessionProducts.length} product{sessionProducts.length !== 1 ? 's' : ''} • {session.messages.length} message
                          {session.messages.length !== 1 ? 's' : ''}
                        </div>
                        <div className={clsx(styles.productMeta, styles.sessionMeta)}>
                          Created {new Date(session.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <ActionsMenu
                        items={[
                          {
                            label: 'Delete',
                            icon: <Trash2 size={16} />,
                            onClick: (event: React.MouseEvent) => {
                              event.stopPropagation();
                              setOpenClientSessionMenu(null);
                              handleDeleteClientSessionWithConfirm(session.id, session.name);
                            },
                            variant: 'danger' as const,
                          },
                        ]}
                        isOpen={openClientSessionMenu === session.id}
                        onToggle={(event) => handleClientSessionMenuToggle(event, session.id)}
                        onClose={() => setOpenClientSessionMenu(null)}
                      />
                    </div>
                  );
                })}
              </div>
            ),
          },
        ]
      : [];

  return (
    <div className={styles.container} data-testid={buildTestId('client-settings-page')}>
      <div className={styles.header}>
        <h1 className={styles.title}>{client.name} Settings</h1>
        <p className={styles.subtitle}>Manage client information and products</p>
      </div>

      <div className={styles.content}>
        <section className={clsx(styles.section, styles.clientInfoSection)}>
          <label className={styles.label}>Client Name</label>
          <div className={styles.clientInputRow}>
            <input
              type="text"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              className={styles.input}
              placeholder="Enter client name"
              data-testid={buildTestId('client-settings', 'name-input')}
            />
            <button
              type="button"
              onClick={handleSaveClientName}
              disabled={isSaving || clientName === client.name}
              className={styles.saveIconButton}
              aria-label={isSaving ? 'Saving client name' : 'Save client name'}
              aria-busy={isSaving}
              data-testid={buildTestId('client-settings', 'save-name-button')}
            >
              <Save size={18} />
            </button>
          </div>
        </section>

        <section className={clsx(styles.section, styles.clientLoginSection)} data-testid={buildTestId('client-settings', 'login-section')}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleRow}>
              <User size={20} className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Client Login</h2>
            </div>
            <span className={clsx(styles.statusPill, clientUser ? styles.statusPillActive : styles.statusPillInactive)}>
              {clientUser ? 'Active' : 'Not created'}
            </span>
          </div>
          <p className={styles.sectionDescription}>
            Credentials for the client app. Reset or generate a password to share with the client.
          </p>

          {clientUserError && (
            <div className={styles.inlineError} role="alert">
              {clientUserError}
            </div>
          )}

          {isLoadingClientUser ? (
            <div className={styles.inlineLoading}>Loading client login...</div>
          ) : (
            <>
              <div className={styles.credentialsGrid}>
                <div className={styles.credentialField}>
                  <label className={styles.credentialLabel}>Login email</label>
                  <div className={styles.credentialInputRow}>
                    <input
                      type="email"
                      value={clientUserEmail}
                      onChange={(event) => {
                        setClientUserEmail(event.target.value);
                        setGeneratedPassword(null);
                        setClientUserError(null);
                      }}
                      className={styles.input}
                      placeholder={defaultClientEmail}
                      data-testid={buildTestId('client-settings', 'login-email-input')}
                    />
                    {clientUserEmail && (
                      <CopyButton
                        text={clientUserEmail}
                        label="Copy login email"
                        variant="icon"
                        size="small"
                        testId={buildTestId('client-settings', 'login-email-copy')}
                      />
                    )}
                  </div>
                  {!clientUser && <p className={styles.credentialHint}>No login exists yet. Save or generate a password to create one.</p>}
                </div>

                <div className={styles.credentialField}>
                  <label className={styles.credentialLabel}>Password</label>
                  <div className={styles.passwordRow}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={clientUserPassword}
                      onChange={(event) => {
                        setClientUserPassword(event.target.value);
                        setGeneratedPassword(null);
                        setClientUserError(null);
                      }}
                      className={styles.input}
                      placeholder="Set a new password"
                      data-testid={buildTestId('client-settings', 'login-password-input')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className={styles.iconButton}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className={styles.credentialHint}>Passwords are stored hashed. Set a new one to rotate access.</p>
                </div>
              </div>

              <div className={styles.credentialsActions}>
                <button
                  type="button"
                  onClick={handleSaveClientUser}
                  disabled={!canSaveClientUser}
                  className={styles.button}
                  aria-busy={isSavingClientUser}
                  data-testid={buildTestId('client-settings', 'login-save-button')}
                >
                  {isSavingClientUser ? 'Saving...' : 'Save Credentials'}
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  disabled={!canGeneratePassword}
                  className={clsx(styles.button, styles.secondaryButton)}
                  aria-busy={isGeneratingPassword}
                  data-testid={buildTestId('client-settings', 'login-generate-button')}
                >
                  {isGeneratingPassword ? 'Generating...' : 'Generate Password'}
                </button>
              </div>

              {generatedPassword && (
                <div className={styles.generatedPasswordCard}>
                  <div className={styles.generatedPasswordHeader}>
                    <Key size={16} />
                    <span>Generated password (copy now)</span>
                  </div>
                  <div className={styles.generatedPasswordRow}>
                    <input
                      type={showGeneratedPassword ? 'text' : 'password'}
                      value={generatedPassword}
                      readOnly
                      className={styles.input}
                      data-testid={buildTestId('client-settings', 'login-generated-password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeneratedPassword((prev) => !prev)}
                      className={styles.iconButton}
                      aria-label={showGeneratedPassword ? 'Hide generated password' : 'Show generated password'}
                    >
                      {showGeneratedPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <CopyButton
                      text={generatedPassword}
                      label="Copy generated password"
                      variant="icon"
                      size="small"
                      testId={buildTestId('client-settings', 'login-generated-copy')}
                    />
                  </div>
                  <p className={styles.credentialHint}>This password is only shown once. Copy it now.</p>
                </div>
              )}
            </>
          )}
        </section>

        <Accordion isMobile={isMobile} sections={productsAccordionSections} />

        <Accordion
          isMobile={isMobile}
          sections={[
            {
              value: 'scenes',
              title: `Scenes (${client.sceneStudios?.length || 0})`,
              defaultExpanded: true,
              headerSuffix: (
                <div className={styles.sectionActions}>
                  <ActionsMenu
                    items={[
                      {
                        label: isCreatingScene ? 'Creating...' : 'Create Scene',
                        icon: <Layers size={16} />,
                        onClick: (event: React.MouseEvent) => {
                          event.stopPropagation();
                          handleCreateScene();
                        },
                        disabled: isCreatingScene,
                      },
                    ]}
                    isOpen={false}
                    onToggle={(event) => {
                      event.stopPropagation();
                    }}
                    onClose={() => {}}
                    ariaLabel="Scene actions"
                  />
                </div>
              ),
              children: (
                <>
                  {!client.sceneStudios || client.sceneStudios.length === 0 ? (
                    <p className={styles.emptyState}>No scenes yet. Create your first scene to get started.</p>
                  ) : (
                    <div className={styles.productList}>
                      {client.sceneStudios.map((scene) => (
                        <div
                          key={scene.id}
                          className={clsx(styles.productRow, styles.productRowClickable)}
                          onClick={() => router.push(`/${clientId}/scene-studio/${scene.id}`)}
                          data-testid={buildTestId('client-settings', 'scene-row', scene.id)}
                        >
                          <div className={styles.productInfo}>
                            <div className={styles.productName}>
                              <Layers size={16} className={styles.sceneIcon} style={{ marginRight: '8px' }} />
                              {scene.name}
                            </div>
                            <div className={styles.productMeta}>
                              {scene.outputSlots?.length || 0} slot{scene.outputSlots?.length !== 1 ? 's' : ''} • Created{' '}
                              {new Date(scene.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <ActionsMenu
                            items={[
                              {
                                label: 'Open Scene',
                                icon: <Layers size={16} />,
                                onClick: (event: React.MouseEvent) => {
                                  event.stopPropagation();
                                  router.push(`/${clientId}/scene-studio/${scene.id}`);
                                },
                              },
                              {
                                label: 'Delete',
                                icon: <Trash2 size={16} />,
                                onClick: (event: React.MouseEvent) => {
                                  event.stopPropagation();
                                  // TODO: Implement delete scene
                                  confirm({
                                    title: 'Delete Scene?',
                                    message: `Are you sure you want to delete "${scene.name}"? This will delete all output slots and generated images.`,
                                    confirmLabel: 'Delete Scene',
                                    cancelLabel: 'Cancel',
                                    variant: 'danger',
                                    onConfirm: async () => {
                                      // TODO: deleteSceneStudio(clientId, scene.id)
                                      error('Delete scene not yet implemented');
                                    },
                                  });
                                },
                                variant: 'danger' as const,
                              },
                            ]}
                            isOpen={false}
                            onToggle={(event) => {
                              event.stopPropagation();
                            }}
                            onClose={() => {}}
                            ariaLabel={`Actions for ${scene.name}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ),
            },
          ]}
        />

        {/* Commerce Provider Section */}
        <section className={clsx(styles.section, styles.commerceSection)}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleRow}>
              <ShoppingCart size={20} className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Commerce Provider</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsCredentialsModalOpen(true)}
              className={styles.editButton}
              aria-label="Edit provider credentials"
              data-testid={buildTestId('client-settings', 'edit-credentials-button')}
            >
              <Edit2 size={16} />
              <span>{hasWooCommerce ? 'Edit' : 'Configure'}</span>
            </button>
          </div>

          {hasWooCommerce ? (
            <div className={styles.providerInfo}>
              <div className={styles.providerRow}>
                <span className={styles.providerLabel}>Provider:</span>
                <span className={styles.providerValue}>WooCommerce</span>
                <CheckCircle size={16} className={styles.connectedIcon} />
              </div>
              {client.commerce?.baseUrl && (
                <div className={styles.providerRow}>
                  <span className={styles.providerLabel}>Store URL:</span>
                  <a href={client.commerce.baseUrl} target="_blank" rel="noopener noreferrer" className={styles.providerLink}>
                    {client.commerce.baseUrl}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.noProvider}>
              <XCircle size={20} className={styles.noProviderIcon} />
              <p>No commerce provider configured. Configure a provider to import products directly from your store.</p>
            </div>
          )}
        </section>

        <DangerZone
          title="Danger Zone"
          description="Once you delete a client, there is no going back. All client data, products, images, and sessions will be permanently deleted."
          buttonLabel="Delete Client"
          onDelete={handleDeleteClient}
          ariaLabel="Delete client"
        />
      </div>

      {/* All Client Generated Images Modal */}
      <AllClientGeneratedImagesModal
        isOpen={isAllImagesModalOpen}
        client={client}
        onClose={() => setIsAllImagesModalOpen(false)}
        onToggleFavorite={handleToggleFavoriteFromModal}
      />

      {/* Image Preview Modal */}
      <ImageModal isOpen={previewImageUrl !== null} imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />

      <EditProviderCredentialsModal
        isOpen={isCredentialsModalOpen}
        clientId={clientId}
        currentProvider={client.commerce?.provider}
        currentBaseUrl={client.commerce?.baseUrl}
        onClose={() => setIsCredentialsModalOpen(false)}
        onSave={() => {
          success('Provider credentials saved successfully');
        }}
      />
    </div>
  );
}
