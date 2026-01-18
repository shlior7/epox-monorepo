'use client';

/**
 * DataContext - Centralized state management for the entire application
 * Single source of truth for all Clients, Products, and Sessions
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import type {
  Client,
  Product,
  Session,
  ClientSession,
  Message,
  DataContextState,
  Flow,
  FlowGenerationSettings,
  CreateClientPayload,
  ClientUserCredentials,
} from '@/lib/types/app-types';
import { apiClient } from '@/lib/api-client';
import { uploadProductImages, deleteProductImages } from '@/lib/services/product-image-upload';
import { useAuthInfo } from '@/lib/auth/use-auth-info';

interface DataContextValue extends DataContextState {
  // Client operations
  loadClients: () => Promise<void>;
  addClient: (payload: CreateClientPayload) => Promise<{ client: Client; credentials?: ClientUserCredentials }>;
  updateClient: (clientId: string, updates: Partial<Pick<Client, 'name' | 'description' | 'aiModelConfig'>>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  getClient: (clientId: string) => Client | undefined;

  // Product operations
  addProduct: (
    clientId: string,
    name: string,
    description: string | undefined,
    productImageFiles: File[],
    category?: string,
    sceneTypes?: string[]
  ) => Promise<Product>;
  updateProduct: (
    clientId: string,
    productId: string,
    updates: Partial<Product>,
    newImages: File[] | null,
    jpegPreviews?: string[]
  ) => Promise<void>;
  deleteProduct: (clientId: string, productId: string) => Promise<void>;
  getProduct: (clientId: string, productId: string) => Product | undefined;
  toggleFavoriteGeneratedImage: (clientId: string, productId: string, imageId: string, sessionId: string) => Promise<void>;
  toggleSceneImage: (clientId: string, productId: string, imageId: string, sessionId: string) => Promise<void>;

  // Session operations
  addSession: (clientId: string, productId: string, name?: string) => Promise<Session>;
  deleteSession: (clientId: string, productId: string, sessionId: string) => Promise<void>;
  getSession: (clientId: string, productId: string, sessionId: string) => Session | undefined;
  updateSession: (clientId: string, productId: string, sessionId: string, updates: Partial<Session>) => Promise<void>;

  // Client Session operations (Multi-Product)
  addClientSession: (clientId: string, productIds: string[], name?: string) => Promise<ClientSession>;
  deleteClientSession: (clientId: string, sessionId: string) => Promise<void>;
  getClientSession: (clientId: string, sessionId: string) => ClientSession | undefined;
  updateClientSession: (clientId: string, sessionId: string, updates: Partial<ClientSession>) => Promise<void>;

  // Message operations
  addMessageToSession: (clientId: string, productId: string, sessionId: string, message: Message | Message[]) => Promise<void>;
  updateMessageInSession: (
    clientId: string,
    productId: string,
    sessionId: string,
    messageId: string,
    updates: Partial<Message>
  ) => Promise<void>;

  // Client Session Message operations
  addMessageToClientSession: (clientId: string, sessionId: string, message: Message | Message[]) => Promise<void>;
  updateMessageInClientSession: (clientId: string, sessionId: string, messageId: string, updates: Partial<Message>) => Promise<void>;

  // Flow operations (for Scene Studio)
  addFlowToClientSession: (clientId: string, sessionId: string, productIds?: string[]) => Promise<Flow>;
  updateFlowInClientSession: (clientId: string, sessionId: string, flowId: string, updates: Partial<Flow>) => Promise<void>;
  deleteFlowFromClientSession: (clientId: string, sessionId: string, flowId: string) => Promise<void>;
  addProductsToFlow: (clientId: string, sessionId: string, flowId: string, productIds: string[], baseImageIds?: { [productId: string]: string }) => Promise<void>;
  removeProductFromFlow: (clientId: string, sessionId: string, flowId: string, productId: string) => Promise<void>;
  updateFlowSettings: (clientId: string, sessionId: string, flowId: string, settings: Partial<FlowGenerationSettings>) => Promise<void>;

  // Utility
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

const normalizeCategoryValue = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  return trimmed || undefined;
};

const deriveClientCategories = (products: Product[]): string[] => {
  const categories = new Set<string>();

  products.forEach((product) => {
    const legacyCategory = (product as { productType?: string }).productType;
    const category = normalizeCategoryValue(product.category ?? legacyCategory);
    if (category) {
      categories.add(category);
    }
  });

  return Array.from(categories).sort((a, b) => a.localeCompare(b));
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataContextState>({
    clients: [],
    isLoading: true,
    error: null,
  });
  const { session, isLoading: isSessionPending } = useAuthInfo();

  // Track ongoing message updates to prevent race conditions
  const messageUpdateLocks = useRef<Map<string, Promise<void>>>(new Map());

  const normalizeProduct = useCallback((product: Product): Product => {
    const legacyCategory = (product as { productType?: string }).productType;
    const normalizedCategory = normalizeCategoryValue(product.category ?? legacyCategory);
    const normalizedsceneTypes = Array.isArray(product.sceneTypes)
      ? Array.from(new Set(product.sceneTypes.filter(Boolean)))
      : undefined;

    return {
      ...product,
      category: normalizedCategory,
      sceneTypes: normalizedsceneTypes,
      productImageIds: Array.isArray(product.productImageIds) ? Array.from(new Set(product.productImageIds.filter(Boolean))) : [],
    };
  }, []);

  const normalizeClient = useCallback(
    (client: Client): Client => {
      const normalizedProducts = client.products.map((product) => normalizeProduct(product));
      const normalizedStudioSessions = Array.isArray(client.studioSessions)
        ? client.studioSessions
        : Array.isArray(client.clientSessions)
          ? client.clientSessions
          : [];
      return {
        ...client,
        products: normalizedProducts,
        categories: deriveClientCategories(normalizedProducts),
        studioSessions: normalizedStudioSessions,
        clientSessions: normalizedStudioSessions,
      };
    },
    [normalizeProduct]
  );

  // Load all clients from S3
  const loadClients = useCallback(async () => {
    console.log('📦 DataContext: Starting to load clients from API...');
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch('/api/clients');
      if (response.status === 401) {
        setState({ clients: [], isLoading: false, error: 'Unauthorized' });
        return;
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch clients: ${response.statusText}`);
      }
      const data = await response.json();
      const clients: Client[] = data.clients;
      console.log(`📦 DataContext: Loaded ${clients.length} clients from API`);

      // Debug: Log product details for each client
      clients.forEach((client: Client) => {
        console.log(`📦 Client "${client.name}" has ${client.products.length} products:`);
        client.products.forEach((product: Product) => {
          console.log(`   - Product "${product.name}": ${product.productImageIds?.length || 0} images`, {
            productId: product.id,
            imageIds: product.productImageIds,
          });
        });
      });

      const normalizedClients = clients.map((client: Client) => normalizeClient(client));
      setState({ clients: normalizedClients, isLoading: false, error: null });
      console.log('✅ DataContext: Clients loaded successfully');
    } catch (error) {
      console.error('❌ DataContext: Failed to load clients:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load clients',
      }));
    }
  }, [normalizeClient]);

  // Initialize data on mount
  useEffect(() => {
    if (isSessionPending) {
      return;
    }

    if (!session) {
      setState({ clients: [], isLoading: false, error: null });
      return;
    }

    console.log('🚀 DataContext: Initializing - calling loadClients()');
    loadClients();
  }, [isSessionPending, session, loadClients]);

  // ===== CLIENT OPERATIONS =====

  const addClient = useCallback(async (payload: CreateClientPayload): Promise<{ client: Client; credentials?: ClientUserCredentials }> => {
    const trimmedClientId = payload.clientId.trim();
    if (!trimmedClientId) {
      throw new Error('Client ID is required');
    }
    const clientId = trimmedClientId;

    const newClient: Client = {
      id: clientId,
      name: payload.name,
      description: payload.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      products: [],
      categories: [],
      commerce: payload.commerce
        ? {
          provider: payload.commerce.provider,
          baseUrl: payload.commerce.baseUrl,
        }
        : undefined,
    };

    try {
      const response = await fetch('/api/clients/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: newClient,
          commerce: payload.commerce,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create client');
      }

      const data = await response.json();
      const createdClient = data.client ?? newClient;
      const credentials = data.clientUserCredentials ?? undefined;
      const normalizedClient = normalizeClient(createdClient);

      setState((prev) => ({
        ...prev,
        clients: [...prev.clients, normalizedClient],
      }));
      return { client: normalizedClient, credentials };
    } catch (error) {
      console.error('Failed to add client:', error);
      throw error;
    }
  }, [normalizeClient]);

  const updateClient = useCallback(
    async (clientId: string, updates: Partial<Pick<Client, 'name' | 'description' | 'aiModelConfig'>>) => {
      const client = state.clients.find((c) => c.id === clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      const updatedClient: Client = {
        ...client,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      try {
        const normalizedClient = normalizeClient(updatedClient);
        await apiClient.updateClient(clientId, normalizedClient);
        setState((prev) => ({
          ...prev,
          clients: prev.clients.map((c) => (c.id === clientId ? normalizedClient : c)),
        }));
      } catch (error) {
        console.error('Failed to update client:', error);
        throw error;
      }
    },
    [normalizeClient, state.clients]
  );

  const deleteClient = useCallback(async (clientId: string) => {
    try {
      await apiClient.deleteClient(clientId);
      setState((prev) => ({
        ...prev,
        clients: prev.clients.filter((c) => c.id !== clientId),
      }));
    } catch (error) {
      console.error('Failed to delete client:', error);
      throw error;
    }
  }, []);

  const getClient = useCallback(
    (clientId: string): Client | undefined => {
      return state.clients.find((c) => c.id === clientId);
    },
    [state.clients]
  );

  // ===== PRODUCT OPERATIONS =====

  const addProduct = useCallback(
    async (
      clientId: string,
      name: string,
      description: string | undefined,
      productImageFiles: File[],
      category?: string,
      sceneTypes?: string[]
    ): Promise<Product> => {
      console.log(`🆕 addProduct called:`, {
        clientId,
        name,
        description,
        category,
        sceneTypes,
        filesCount: productImageFiles.length,
        fileNames: productImageFiles.map((f) => f.name),
      });

      if (productImageFiles.length === 0) {
        console.warn('⚠️  WARNING: No image files provided to addProduct!');
      }

      const client = state.clients.find((c) => c.id === clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      const normalizedsceneTypes = Array.isArray(sceneTypes) ? Array.from(new Set(sceneTypes.filter(Boolean))) : undefined;
      const normalizedCategory = normalizeCategoryValue(category);

      // Extract image IDs from filenames (but don't upload yet)
      const imageIds = productImageFiles.map((file) => {
        // Extract UUID from filename (remove extension)
        return file.name.replace(/\.(png|jpg|jpeg|webp)$/i, '');
      });

      try {
        const createdProduct = await apiClient.addProduct(clientId, {
          name,
          description,
          category: normalizedCategory,
          sceneTypes: normalizedsceneTypes,
        });

        const newProduct: Product = {
          ...createdProduct,
          description: description ?? createdProduct.description,
          category: normalizedCategory ?? createdProduct.category,
          sceneTypes: normalizedsceneTypes ?? createdProduct.sceneTypes,
          productImageIds: imageIds,
          sessions: createdProduct.sessions ?? [],
          clientId,
        };

        console.log(`💾 Created new product:`, {
          productId: newProduct.id,
          name: newProduct.name,
          imageIdsCount: newProduct.productImageIds.length,
          imageIds: newProduct.productImageIds,
        });

        // 2. Now upload the images
        await Promise.all(
          productImageFiles.map(async (file, index) => {
            const imageId = imageIds[index];
            console.log(`📤 Uploading base image: ${imageId} (${file.size} bytes)`);
            await apiClient.uploadProductImage(clientId, newProduct.id, imageId, file);
          })
        );

        console.log(`✅ Uploaded ${imageIds.length} base images for product ${name}:`, imageIds);

        // Update local state
        const updatedClient = {
          ...client,
          products: [...client.products, normalizeProduct(newProduct)],
          updatedAt: new Date().toISOString(),
        };

        setState((prev) => ({
          ...prev,
          clients: prev.clients.map((c) => (c.id === clientId ? normalizeClient(updatedClient) : c)),
        }));

        return newProduct;
      } catch (error) {
        console.error('Failed to add product:', error);
        throw error;
      }
    },
    [state.clients, normalizeClient, normalizeProduct]
  );

  const getProduct = useCallback(
    (clientId: string, productId: string): Product | undefined => {
      const client = state.clients.find((c) => c.id === clientId);
      const product = client?.products.find((p) => p.id === productId);
      return product ? normalizeProduct(product) : undefined;
    },
    [state.clients, normalizeProduct]
  );

  const updateProduct = useCallback(
    async (clientId: string, productId: string, updates: Partial<Product>, newImages: File[] | null, jpegPreviews?: string[]) => {
      console.log(`🔄 updateProduct called:`, {
        productId,
        updates,
        newImagesCount: newImages?.length || 0,
        jpegPreviewsCount: jpegPreviews?.length || 0,
      });

      try {
        let finalUpdates = { ...updates };
        const existingProduct = getProduct(clientId, productId);

        console.log(`📦 Existing product from state:`, {
          productId: existingProduct?.id,
          name: existingProduct?.name,
          existingImageIds: existingProduct?.productImageIds,
        });

        const existingImageIds = existingProduct?.productImageIds || [];
        const providedImageIds = Array.isArray(updates.productImageIds) ? updates.productImageIds : existingImageIds;
        let normalizedImageIds = [...providedImageIds];

        console.log(`🖼️  Image IDs before processing:`, normalizedImageIds);

        // Detect and delete removed images from S3
        const removedImageIds = existingImageIds.filter((id) => !normalizedImageIds.includes(id));
        if (removedImageIds.length > 0) {
          await deleteProductImages({ clientId, productId, imageIds: removedImageIds });
        }

        if (newImages && newImages.length > 0) {
          const uploadResult = await uploadProductImages({
            clientId,
            productId,
            imageFiles: newImages,
            jpegPreviews,
          });

          normalizedImageIds = [...normalizedImageIds, ...uploadResult.imageIds];
          console.log(`✅ New product images uploaded.`);
        }

        finalUpdates.productImageIds = Array.from(new Set(normalizedImageIds.filter(Boolean)));

        console.log(`✅ Final updates being saved:`, {
          productId,
          imageIdsCount: finalUpdates.productImageIds.length,
          imageIds: finalUpdates.productImageIds,
          allUpdates: finalUpdates,
        });

        // --- 1. Update Local State (atomically) ---
        setState((prevState) => {
          const newClients = prevState.clients.map((client) => {
            if (client.id !== clientId) return client;

            const newProducts = client.products.map((product) => {
              if (product.id !== productId) return product;
              return normalizeProduct({
                ...product,
                ...finalUpdates,
                updatedAt: new Date().toISOString(),
              });
            });

            const updatedClient = {
              ...client,
              products: newProducts,
              categories: deriveClientCategories(newProducts),
              updatedAt: new Date().toISOString(),
            };

            // --- 2. Persist to DB ---
            // Intentionally not awaited to give instant UI feedback
            apiClient
              .updateProduct(clientId, productId, finalUpdates)
              .then(() => console.log('✅ Product updates saved to DB.'))
              .catch((err: any) => console.error('Failed to save product updates to DB:', err));

            return updatedClient;
          });
          return { ...prevState, clients: newClients };
        });
      } catch (error) {
        console.error('Failed to update product:', error);
        throw error;
      }
    },
    [getProduct, normalizeProduct]
  );

  const deleteProduct = useCallback(async (clientId: string, productId: string) => {
    try {
      await apiClient.deleteProduct(clientId, productId);

      setState((prev) => ({
        ...prev,
        clients: prev.clients.map((c) => {
          if (c.id !== clientId) return c;
          const remainingProducts = c.products.filter((p) => p.id !== productId);
          return {
            ...c,
            products: remainingProducts,
            categories: deriveClientCategories(remainingProducts),
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    } catch (error) {
      console.error('Failed to delete product:', error);
      throw error;
    }
  }, []);

  // ===== SESSION OPERATIONS =====

  const addSession = useCallback(
    async (clientId: string, productId: string, name?: string): Promise<Session> => {
      let client = state.clients.find((c) => c.id === clientId);

      // If client not found in state, try fetching from S3
      if (!client) {
        console.log('Client not found in state, fetching from S3...');
        const freshClient = await apiClient.getClient(clientId);
        if (!freshClient) {
          throw new Error('Client not found');
        }
        client = normalizeClient(freshClient);
      }

      let product = client.products.find((p) => p.id === productId);

      // If product not found, try fetching fresh client from S3
      if (!product) {
        console.log('Product not found in state, fetching from S3...');
        const freshClient = await apiClient.getClient(clientId);
        if (!freshClient) {
          throw new Error('Client not found');
        }
        client = normalizeClient(freshClient);
        product = client.products.find((p) => p.id === productId);

        if (!product) {
          throw new Error('Product not found');
        }
      }

      try {
        const createdSession = await apiClient.createSession(clientId, productId, {
          name: name || `Session ${new Date().toLocaleDateString()}`,
        });

        const updatedProduct = normalizeProduct({
          ...product,
          sessions: [...product.sessions, createdSession],
          updatedAt: createdSession.updatedAt,
        });

        const updatedClient = {
          ...client,
          products: client.products.map((p) => (p.id === productId ? updatedProduct : normalizeProduct(p))),
          updatedAt: createdSession.updatedAt,
        };

        // Update state first
        setState((prev) => ({
          ...prev,
          clients: prev.clients.map((c) => (c.id === clientId ? updatedClient : c)),
        }));
        return createdSession;
      } catch (error) {
        console.error('Failed to add session:', error);
        throw error;
      }
    },
    [state.clients, normalizeClient, normalizeProduct]
  );

  const deleteSession = useCallback(async (clientId: string, productId: string, sessionId: string) => {
    try {
      await apiClient.deleteSession(clientId, productId, sessionId);

      setState((prev) => ({
        ...prev,
        clients: prev.clients.map((c) =>
          c.id === clientId
            ? {
              ...c,
              products: c.products.map((p) =>
                p.id === productId
                  ? {
                    ...p,
                    sessions: p.sessions.filter((s) => s.id !== sessionId),
                    updatedAt: new Date().toISOString(),
                  }
                  : p
              ),
              updatedAt: new Date().toISOString(),
            }
            : c
        ),
      }));
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }, []);

  const updateSession = useCallback(
    async (clientId: string, productId: string, sessionId: string, updates: Partial<Session>) => {
      try {
        let sessionToPersist: Session | undefined;
        let clientToPersist: Client | undefined;
        setState((prevState) => {
          const newClients = prevState.clients.map((client) => {
            if (client.id !== clientId) return client;

            const newProducts = client.products.map((product) => {
              if (product.id !== productId) return product;

              const newSessions = product.sessions.map((session) => {
                if (session.id !== sessionId) return session;

                sessionToPersist = {
                  ...session,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                };
                return sessionToPersist;
              });

              return normalizeProduct({
                ...product,
                sessions: newSessions,
                updatedAt: new Date().toISOString(),
              });
            });

            clientToPersist = {
              ...client,
              products: newProducts,
              updatedAt: new Date().toISOString(),
            };
            return clientToPersist;
          });

          return { ...prevState, clients: newClients };
        });

        if (sessionToPersist && clientToPersist) {
          await apiClient.updateSession(clientToPersist.id, productId, sessionToPersist);
        } else {
          console.warn(`Session ${sessionId} not found for update.`);
        }
      } catch (error) {
        console.error('Failed to update session:', error);
        throw error;
      }
    },
    [normalizeProduct]
  );

  const getSession = useCallback(
    (clientId: string, productId: string, sessionId: string): Session | undefined => {
      const client = state.clients.find((c) => c.id === clientId);
      const product = client?.products.find((p) => p.id === productId);
      return product?.sessions.find((s) => s.id === sessionId);
    },
    [state.clients]
  );

  // ===== CLIENT SESSION OPERATIONS (Multi-Product) =====

  const addClientSession = useCallback(
    async (clientId: string, productIds: string[], name?: string): Promise<ClientSession> => {
      let client = state.clients.find((c) => c.id === clientId);

      // If client not found in state, try fetching from S3
      if (!client) {
        console.log('Client not found in state, fetching from S3...');
        const freshClient = await apiClient.getClient(clientId);
        if (!freshClient) {
          throw new Error('Client not found');
        }
        client = normalizeClient(freshClient);
      }

      try {
        const createdSession = await apiClient.createStudioSession(clientId, {
          name: name || `Studio Session ${new Date().toLocaleString()}`,
          productIds,
          selectedBaseImages: {},
        });

        const currentSessions = client.studioSessions ?? client.clientSessions ?? [];
        const nextSessions = [...currentSessions, createdSession];
        const updatedClient = {
          ...client,
          studioSessions: nextSessions,
          clientSessions: nextSessions,
          updatedAt: createdSession.updatedAt,
        };

        // Update state first
        setState((prev) => ({
          ...prev,
          clients: prev.clients.map((c) => (c.id === clientId ? updatedClient : c)),
        }));

        return createdSession;
      } catch (error) {
        console.error('Failed to add client session:', error);
        throw error;
      }
    },
    [state.clients, normalizeClient]
  );

  const deleteClientSession = useCallback(async (clientId: string, sessionId: string) => {
    try {
      // Delete from S3 first
      await apiClient.deleteClientSession(clientId, sessionId);

      // Then update state
      setState((prev) => ({
        ...prev,
        clients: prev.clients.map((c) =>
          c.id === clientId
            ? {
              ...c,
              studioSessions: (c.studioSessions ?? c.clientSessions ?? []).filter((s) => s.id !== sessionId),
              clientSessions: (c.studioSessions ?? c.clientSessions ?? []).filter((s) => s.id !== sessionId),
              updatedAt: new Date().toISOString(),
            }
            : c
        ),
      }));
    } catch (error) {
      console.error('Failed to delete client session:', error);
      throw error;
    }
  }, []);

  const getClientSession = useCallback(
    (clientId: string, sessionId: string): ClientSession | undefined => {
      const client = state.clients.find((c) => c.id === clientId);
      return (client?.studioSessions ?? client?.clientSessions)?.find((s) => s.id === sessionId);
    },
    [state.clients]
  );

  const updateClientSession = useCallback(async (clientId: string, sessionId: string, updates: Partial<ClientSession>) => {
    try {
      let sessionToPersist: ClientSession | undefined;
      let clientToPersist: Client | undefined;

      setState((prevState) => {
        const newClients = prevState.clients.map((client) => {
          if (client.id !== clientId) return client;

          const newClientSessions = (client.studioSessions ?? client.clientSessions ?? []).map((session) => {
            if (session.id !== sessionId) return session;

            sessionToPersist = {
              ...session,
              ...updates,
              updatedAt: new Date().toISOString(),
            };
            return sessionToPersist;
          });

          clientToPersist = {
            ...client,
            studioSessions: newClientSessions,
            clientSessions: newClientSessions,
            updatedAt: new Date().toISOString(),
          };
          return clientToPersist;
        });

        return { ...prevState, clients: newClients };
      });

      if (sessionToPersist && clientToPersist) {
        await apiClient.updateClientSession(clientToPersist.id, sessionToPersist);
      } else {
        console.warn(`Client session ${sessionId} not found for update.`);
      }
    } catch (error) {
      console.error('Failed to update client session:', error);
      throw error;
    }
  }, []);

  // ===== MESSAGE OPERATIONS =====

  const addMessageToSession = useCallback(async (clientId: string, productId: string, sessionId: string, message: Message | Message[]) => {
    const messagesToAdd = Array.isArray(message) ? message : [message];
    if (messagesToAdd.length === 0) return;

    console.log(`💬 Adding ${messagesToAdd.length} message(s) to session ${sessionId}`);

    try {
      // --- 1. Update Local State (atomically) ---
      let updatedSession: Session | undefined;
      let updatedClient: Client | undefined;
      setState((prevState) => {
        const newClients = prevState.clients.map((client) => {
          if (client.id !== clientId) return client;

          const newProducts = client.products.map((product) => {
            if (product.id !== productId) return product;

            const newSessions = product.sessions.map((session) => {
              if (session.id !== sessionId) return session;

              updatedSession = {
                ...session,
                messages: [...session.messages, ...messagesToAdd],
                updatedAt: new Date().toISOString(),
              };
              return updatedSession;
            });

            return { ...product, sessions: newSessions, updatedAt: new Date().toISOString() };
          });

          updatedClient = { ...client, products: newProducts, updatedAt: new Date().toISOString() };
          return updatedClient;
        });

        return { ...prevState, clients: newClients };
      });

      // --- 2. Persist to S3 (with client context to avoid reload) ---
      if (updatedSession && updatedClient) {
        // Use the API update to avoid an extra fetch.
        await apiClient.updateSession(clientId, productId, updatedSession);
        console.log(`✅ Message(s) saved to S3 successfully.`);
      } else {
        // This should not happen if the logic above is correct
        console.error('Could not find session or client to update for S3 persistence.');
        throw new Error('Session or client not found for S3 update.');
      }
    } catch (error) {
      console.error('Failed to add message to session:', error);
      // TODO: Implement rollback for UI state if S3 save fails
    }
  }, []);

  const updateMessageInSession = useCallback(
    async (clientId: string, productId: string, sessionId: string, messageId: string, updates: Partial<Message>) => {
      // Create a unique key for this message update
      const lockKey = `${clientId}:${productId}:${sessionId}:${messageId}`;

      // Wait for any ongoing update to the same message to complete
      const existingLock = messageUpdateLocks.current.get(lockKey);
      if (existingLock) {
        console.log(`⏳ Waiting for previous update to message ${messageId} to complete...`);
        await existingLock;
      }

      // Create a new promise for this update
      let resolveLock: () => void;
      const lockPromise = new Promise<void>((resolve) => {
        resolveLock = resolve;
      });
      messageUpdateLocks.current.set(lockKey, lockPromise);

      try {
        // --- 1. Update Local State (atomically) ---
        let sessionToPersist: Session | undefined;
        let clientToPersist: Client | undefined;
        let messageMissing = false;
        let clientFound = false;
        let productFound = false;
        let sessionFound = false;

        setState((prevState) => {
          const newClients = prevState.clients.map((client) => {
            if (client.id !== clientId) return client;

            clientFound = true;

            const newProducts = client.products.map((product) => {
              if (product.id !== productId) return product;

              productFound = true;

              const newSessions = product.sessions.map((session) => {
                if (session.id !== sessionId) return session;

                sessionFound = true;

                const messageIndex = session.messages.findIndex((m) => m.id === messageId);
                if (messageIndex === -1) {
                  console.warn(`Message ${messageId} not found in session ${sessionId} during state update.`);
                  messageMissing = true;
                  return session;
                }

                const updatedMessages = [...session.messages];
                updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...updates };

                sessionToPersist = {
                  ...session,
                  messages: updatedMessages,
                  updatedAt: new Date().toISOString(),
                };

                return sessionToPersist;
              });

              if (sessionToPersist) {
                return {
                  ...product,
                  sessions: newSessions,
                  updatedAt: sessionToPersist.updatedAt,
                };
              }

              return product;
            });

            if (sessionToPersist) {
              clientToPersist = {
                ...client,
                products: newProducts,
                updatedAt: sessionToPersist.updatedAt,
              };
              return clientToPersist;
            }

            return client;
          });

          return { ...prevState, clients: newClients };
        });

        const recoveryReasons: string[] = [];
        if (!clientFound) recoveryReasons.push('client missing in local state');
        if (!productFound) recoveryReasons.push('product missing in local state');
        if (!sessionFound) recoveryReasons.push('session missing in local state');
        if (messageMissing) recoveryReasons.push('message missing in session');

        const performRecoveryFromS3 = async (reason: string) => {
          const maxAttempts = 3;
          const baseDelayMs = 150;

          for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            const latestClient = await apiClient.getClient(clientId);
            if (!latestClient) {
              throw new Error(`Client ${clientId} not found while recovering message ${messageId}.`);
            }

            const normalizedClient = normalizeClient(latestClient);
            const targetProduct = normalizedClient.products.find((p) => p.id === productId);
            if (!targetProduct) {
              throw new Error(`Product ${productId} not found while recovering message ${messageId}.`);
            }

            const targetSession = targetProduct.sessions.find((s) => s.id === sessionId);
            if (!targetSession) {
              throw new Error(`Session ${sessionId} not found while recovering message ${messageId}.`);
            }

            const messageIndex = targetSession.messages.findIndex((m) => m.id === messageId);
            if (messageIndex === -1) {
              if (attempt === maxAttempts) {
                throw new Error(`Message ${messageId} still not found after refreshing from S3 (${reason}).`);
              }

              const delayMs = baseDelayMs * attempt;
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              continue;
            }

            const updatedMessages = [...targetSession.messages];
            updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...updates };

            const recoveryTimestamp = new Date().toISOString();

            const recoveredSession: Session = {
              ...targetSession,
              messages: updatedMessages,
              updatedAt: recoveryTimestamp,
            };

            const recoveredProduct: Product = {
              ...targetProduct,
              sessions: targetProduct.sessions.map((session) => (session.id === sessionId ? recoveredSession : session)),
              updatedAt: recoveryTimestamp,
            };

            const recoveredClient: Client = {
              ...normalizedClient,
              products: normalizedClient.products.map((product) => (product.id === productId ? recoveredProduct : product)),
              updatedAt: recoveryTimestamp,
            };

            setState((prevState) => {
              const hasClient = prevState.clients.some((c) => c.id === recoveredClient.id);
              const newClients = hasClient
                ? prevState.clients.map((c) => (c.id === recoveredClient.id ? recoveredClient : c))
                : [...prevState.clients, recoveredClient];

              return { ...prevState, clients: newClients };
            });

            await apiClient.updateSession(recoveredClient.id, productId, recoveredSession);
            console.log(`✅ Session ${sessionId} recovered from S3 after local mismatch (${reason}, attempt ${attempt}).`);
            return;
          }
        };

        // --- 2. Persist to S3 (with client context to avoid reload) ---
        if (sessionToPersist && clientToPersist) {
          console.log(`💾 Persisting session ${sessionId} to S3 after message update...`);
          await apiClient.updateSession(clientToPersist.id, productId, sessionToPersist);
          console.log(`✅ Session ${sessionId} persisted to S3 successfully`);
        } else if (recoveryReasons.length > 0 || !sessionToPersist || !clientToPersist) {
          const reason = recoveryReasons.length > 0 ? recoveryReasons.join(', ') : 'unable to build payload';
          console.warn(
            `⚠️ Local state was missing required data while updating message ${messageId} (reason: ${reason}). Fetching fresh data from S3.`
          );
          await performRecoveryFromS3(reason);
        } else {
          const errorMsg = `Session for message ${messageId} was not found for S3 persistence. The UI might be out of sync.`;
          console.error(`❌ ${errorMsg}`);
          throw new Error(errorMsg);
        }
      } catch (error) {
        console.error('❌ Failed to update message in session:', error);
        if (error instanceof Error) {
          console.error('   Error details:', error.message);
          console.error('   Stack:', error.stack);
        }
        throw error;
      } finally {
        // Release the lock
        resolveLock!();
        messageUpdateLocks.current.delete(lockKey);
      }
    },
    [normalizeClient]
  );

  // ===== FAVORITE OPERATIONS =====

  const toggleFavoriteGeneratedImage = useCallback(
    async (_clientId: string, _productId: string, _imageId: string, _sessionId: string) => {
      // TODO: Implement using pinned field on generated_asset table instead
      console.warn('toggleFavoriteGeneratedImage: Not implemented - use pinned on generated_asset');
    },
    []
  );

  // ===== SCENE IMAGES OPERATIONS =====

  const toggleSceneImage = useCallback(
    async (_clientId: string, _productId: string, _imageId: string, _sessionId: string) => {
      // TODO: Implement using pinned field on generated_asset table instead
      console.warn('toggleSceneImage: Not implemented - use pinned on generated_asset');
    },
    []
  );

  // ===== CLIENT SESSION MESSAGE OPERATIONS =====

  const addMessageToClientSession = useCallback(async (clientId: string, sessionId: string, message: Message | Message[]) => {
    const messagesToAdd = Array.isArray(message) ? message : [message];
    if (messagesToAdd.length === 0) return;

    console.log(`💬 Adding ${messagesToAdd.length} message(s) to client session ${sessionId}`);

    try {
      let clientToPersist: Client | undefined;
      let sessionToPersist: ClientSession | undefined;

      setState((prevState) => {
        const newClients = prevState.clients.map((client) => {
          if (client.id !== clientId) return client;

          const newClientSessions = (client.studioSessions ?? client.clientSessions ?? []).map((session) => {
            if (session.id !== sessionId) return session;

            sessionToPersist = {
              ...session,
              messages: [...session.messages, ...messagesToAdd],
              updatedAt: new Date().toISOString(),
            };
            return sessionToPersist;
          });

          clientToPersist = {
            ...client,
            studioSessions: newClientSessions,
            clientSessions: newClientSessions,
            updatedAt: new Date().toISOString(),
          };
          return clientToPersist;
        });

        return { ...prevState, clients: newClients };
      });

      if (clientToPersist && sessionToPersist) {
        await apiClient.updateClientSession(clientToPersist.id, sessionToPersist);
      }
    } catch (error) {
      console.error('Failed to add message to client session:', error);
      throw error;
    }
  }, []);

  const updateMessageInClientSession = useCallback(
    async (clientId: string, sessionId: string, messageId: string, updates: Partial<Message>) => {
      const lockKey = `client:${clientId}:${sessionId}:${messageId}`;

      const existingLock = messageUpdateLocks.current.get(lockKey);
      if (existingLock) {
        console.log(`⏳ Waiting for previous update to message ${messageId} to complete...`);
        await existingLock;
      }

      let resolveLock: () => void;
      const lockPromise = new Promise<void>((resolve) => {
        resolveLock = resolve;
      });
      messageUpdateLocks.current.set(lockKey, lockPromise);

      try {
        let clientToPersist: Client | undefined;
        let sessionToPersist: ClientSession | undefined;
        let messageMissing = false;

        setState((prevState) => {
          const newClients = prevState.clients.map((client) => {
            if (client.id !== clientId) return client;

            const newClientSessions = (client.studioSessions ?? client.clientSessions ?? []).map((session) => {
              if (session.id !== sessionId) return session;

              const messageIndex = session.messages.findIndex((m) => m.id === messageId);
              if (messageIndex === -1) {
                console.warn(`Message ${messageId} not found in client session ${sessionId} during state update.`);
                messageMissing = true;
                return session;
              }

              const updatedMessages = [...session.messages];
              updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...updates };

              sessionToPersist = {
                ...session,
                messages: updatedMessages,
                updatedAt: new Date().toISOString(),
              };
              return sessionToPersist;
            });

            clientToPersist = {
              ...client,
              studioSessions: newClientSessions,
              clientSessions: newClientSessions,
              updatedAt: new Date().toISOString(),
            };
            return clientToPersist;
          });

          return { ...prevState, clients: newClients };
        });

        if (!messageMissing && clientToPersist && sessionToPersist) {
          await apiClient.updateClientSession(clientToPersist.id, sessionToPersist);
        }
      } catch (error) {
        console.error('Failed to update message in client session:', error);
        throw error;
      } finally {
        messageUpdateLocks.current.delete(lockKey);
        resolveLock!();
      }
    },
    []
  );

  // ===== FLOW OPERATIONS (Scene Studio) =====

  const addFlowToClientSession = useCallback(
    async (clientId: string, sessionId: string, productIds: string[] = []): Promise<Flow> => {
      const createdFlow = await apiClient.createFlow(clientId, sessionId, {
        productIds,
      });

      setState((prevState) => {
        const newClients = prevState.clients.map((client) => {
          if (client.id !== clientId) return client;

          const newClientSessions = (client.studioSessions ?? client.clientSessions ?? []).map((session) => {
            if (session.id !== sessionId) return session;

            return {
              ...session,
              flows: [...(session.flows || []), createdFlow],
              updatedAt: new Date().toISOString(),
            };
          });

          return {
            ...client,
            studioSessions: newClientSessions,
            clientSessions: newClientSessions,
            updatedAt: new Date().toISOString(),
          };
        });

        return { ...prevState, clients: newClients };
      });

      console.log(`✅ Flow ${createdFlow.id} added to client session ${sessionId}`);
      return createdFlow;
    },
    []
  );

  const updateFlowInClientSession = useCallback(
    async (clientId: string, sessionId: string, flowId: string, updates: Partial<Flow>): Promise<void> => {
      let clientToPersist: Client | undefined;
      let sessionToPersist: ClientSession | undefined;

      setState((prevState) => {
        const newClients = prevState.clients.map((client) => {
          if (client.id !== clientId) return client;

          const newClientSessions = (client.studioSessions ?? client.clientSessions ?? []).map((session) => {
            if (session.id !== sessionId) return session;

            const newFlows = (session.flows || []).map((flow) => {
              if (flow.id !== flowId) return flow;
              return {
                ...flow,
                ...updates,
                updatedAt: new Date().toISOString(),
              };
            });

            sessionToPersist = {
              ...session,
              flows: newFlows,
              updatedAt: new Date().toISOString(),
            };
            return sessionToPersist;
          });

          clientToPersist = {
            ...client,
            studioSessions: newClientSessions,
            clientSessions: newClientSessions,
            updatedAt: new Date().toISOString(),
          };
          return clientToPersist;
        });

        return { ...prevState, clients: newClients };
      });

      if (clientToPersist && sessionToPersist) {
        await apiClient.updateClientSession(clientToPersist.id, sessionToPersist);
      }

      console.log(`✅ Flow ${flowId} updated in client session ${sessionId}`);
    },
    []
  );

  const deleteFlowFromClientSession = useCallback(
    async (clientId: string, sessionId: string, flowId: string): Promise<void> => {
      let clientToPersist: Client | undefined;
      let sessionToPersist: ClientSession | undefined;

      setState((prevState) => {
        const newClients = prevState.clients.map((client) => {
          if (client.id !== clientId) return client;

          const newClientSessions = (client.studioSessions ?? client.clientSessions ?? []).map((session) => {
            if (session.id !== sessionId) return session;

            sessionToPersist = {
              ...session,
              flows: (session.flows || []).filter((flow) => flow.id !== flowId),
              updatedAt: new Date().toISOString(),
            };
            return sessionToPersist;
          });

          clientToPersist = {
            ...client,
            studioSessions: newClientSessions,
            clientSessions: newClientSessions,
            updatedAt: new Date().toISOString(),
          };
          return clientToPersist;
        });

        return { ...prevState, clients: newClients };
      });

      if (clientToPersist && sessionToPersist) {
        await apiClient.updateClientSession(clientToPersist.id, sessionToPersist);
      }

      console.log(`✅ Flow ${flowId} deleted from client session ${sessionId}`);
    },
    []
  );

  const addProductsToFlow = useCallback(
    async (
      clientId: string,
      sessionId: string,
      flowId: string,
      productIds: string[],
      baseImageIds?: { [productId: string]: string }
    ): Promise<void> => {
      let clientToPersist: Client | undefined;
      let sessionToPersist: ClientSession | undefined;

      setState((prevState) => {
        const newClients = prevState.clients.map((client) => {
          if (client.id !== clientId) return client;

          const newClientSessions = (client.studioSessions ?? client.clientSessions ?? []).map((session) => {
            if (session.id !== sessionId) return session;

            const newFlows = (session.flows || []).map((flow) => {
              if (flow.id !== flowId) return flow;

              // Merge new product IDs (avoid duplicates)
              const mergedProductIds = [...new Set([...flow.productIds, ...productIds])];
              const mergedBaseImages = {
                ...flow.selectedBaseImages,
                ...(baseImageIds || {}),
              };

              return {
                ...flow,
                productIds: mergedProductIds,
                selectedBaseImages: mergedBaseImages,
                status: mergedProductIds.length > 0 ? ('configured' as const) : flow.status,
                updatedAt: new Date().toISOString(),
              };
            });

            sessionToPersist = {
              ...session,
              flows: newFlows,
              updatedAt: new Date().toISOString(),
            };
            return sessionToPersist;
          });

          clientToPersist = {
            ...client,
            studioSessions: newClientSessions,
            clientSessions: newClientSessions,
            updatedAt: new Date().toISOString(),
          };
          return clientToPersist;
        });

        return { ...prevState, clients: newClients };
      });

      if (clientToPersist && sessionToPersist) {
        await apiClient.updateClientSession(clientToPersist.id, sessionToPersist);
      }

      console.log(`✅ Products ${productIds.join(', ')} added to flow ${flowId}`);
    },
    []
  );

  const removeProductFromFlow = useCallback(
    async (clientId: string, sessionId: string, flowId: string, productId: string): Promise<void> => {
      let clientToPersist: Client | undefined;
      let sessionToPersist: ClientSession | undefined;

      setState((prevState) => {
        const newClients = prevState.clients.map((client) => {
          if (client.id !== clientId) return client;

          const newClientSessions = (client.studioSessions ?? client.clientSessions ?? []).map((session) => {
            if (session.id !== sessionId) return session;

            const newFlows = (session.flows || []).map((flow) => {
              if (flow.id !== flowId) return flow;

              const updatedProductIds = flow.productIds.filter((id) => id !== productId);
              const { [productId]: _, ...remainingBaseImages } = flow.selectedBaseImages;

              return {
                ...flow,
                productIds: updatedProductIds,
                selectedBaseImages: remainingBaseImages,
                status: updatedProductIds.length === 0 ? ('empty' as const) : flow.status,
                updatedAt: new Date().toISOString(),
              };
            });

            sessionToPersist = {
              ...session,
              flows: newFlows,
              updatedAt: new Date().toISOString(),
            };
            return sessionToPersist;
          });

          clientToPersist = {
            ...client,
            studioSessions: newClientSessions,
            clientSessions: newClientSessions,
            updatedAt: new Date().toISOString(),
          };
          return clientToPersist;
        });

        return { ...prevState, clients: newClients };
      });

      if (clientToPersist && sessionToPersist) {
        await apiClient.updateClientSession(clientToPersist.id, sessionToPersist);
      }

      console.log(`✅ Product ${productId} removed from flow ${flowId}`);
    },
    []
  );

  const updateFlowSettings = useCallback(
    async (clientId: string, sessionId: string, flowId: string, settings: Partial<FlowGenerationSettings>): Promise<void> => {
      let clientToPersist: Client | undefined;
      let sessionToPersist: ClientSession | undefined;

      setState((prevState) => {
        const newClients = prevState.clients.map((client) => {
          if (client.id !== clientId) return client;

          const newClientSessions = (client.studioSessions ?? client.clientSessions ?? []).map((session) => {
            if (session.id !== sessionId) return session;

            const newFlows = (session.flows || []).map((flow) => {
              if (flow.id !== flowId) return flow;

              return {
                ...flow,
                settings: {
                  ...flow.settings,
                  ...settings,
                },
                updatedAt: new Date().toISOString(),
              };
            });

            sessionToPersist = {
              ...session,
              flows: newFlows,
              updatedAt: new Date().toISOString(),
            };
            return sessionToPersist;
          });

          clientToPersist = {
            ...client,
            studioSessions: newClientSessions,
            clientSessions: newClientSessions,
            updatedAt: new Date().toISOString(),
          };
          return clientToPersist;
        });

        return { ...prevState, clients: newClients };
      });

      if (clientToPersist && sessionToPersist) {
        await apiClient.updateClientSession(clientToPersist.id, sessionToPersist);
      }

      console.log(`✅ Flow ${flowId} settings updated`);
    },
    []
  );

  // ===== UTILITY =====

  const refreshData = useCallback(async () => {
    await loadClients();
  }, [loadClients]);

  const value: DataContextValue = {
    ...state,
    loadClients,
    addClient,
    updateClient,
    deleteClient,
    getClient,
    addProduct,
    updateProduct,
    deleteProduct,
    getProduct,
    toggleFavoriteGeneratedImage,
    toggleSceneImage,
    addSession,
    deleteSession,
    getSession,
    updateSession,
    addClientSession,
    deleteClientSession,
    getClientSession,
    updateClientSession,
    addMessageToSession,
    updateMessageInSession,
    addMessageToClientSession,
    updateMessageInClientSession,
    addFlowToClientSession,
    updateFlowInClientSession,
    deleteFlowFromClientSession,
    addProductsToFlow,
    removeProductFromFlow,
    updateFlowSettings,
    refreshData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
