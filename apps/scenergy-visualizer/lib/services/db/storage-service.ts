import { type ClientMetadata, type GeneratedAssetCreate } from 'visualizer-types';
import type { FlowGenerationSettings as DbFlowGenerationSettings } from 'visualizer-types';
import { db } from 'visualizer-db';
import { chatSession, collectionSession, generationFlow, generatedAsset, message, product } from 'visualizer-db/schema';
import {
  DEFAULT_FLOW_SETTINGS,
  type Client,
  type CreateFlowPayload,
  type CreateProductPayload,
  type CreateSessionPayload,
  type CreateStudioSessionPayload,
  type Flow,
  type FlowGeneratedImage,
  type FlowGenerationSettings,
  type Message,
  type Product,
  type Session,
  type ClientSession,
  type CommerceConfig,
  type AIModelConfig,
} from '@/lib/types/app-types';

type DbGenerationFlow = typeof generationFlow.$inferSelect;
type DbGeneratedAsset = typeof generatedAsset.$inferSelect;
type DbMessage = typeof message.$inferSelect;
type DbChatSession = typeof chatSession.$inferSelect;
type DbCollectionSession = typeof collectionSession.$inferSelect;
type DbProduct = typeof product.$inferSelect;

const normalizeCategoryValue = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  return trimmed || undefined;
};

const deriveClientCategories = (products: Product[]): string[] => {
  const categories = new Set<string>();

  products.forEach((productItem) => {
    const legacyCategory = (productItem as { productType?: string }).productType;
    const category = normalizeCategoryValue(productItem.category ?? legacyCategory);
    if (category) {
      categories.add(category);
    }
  });

  return Array.from(categories).sort((a, b) => a.localeCompare(b));
};

const toDate = (value?: string | Date | null, fallback = new Date()): Date => {
  if (!value) return fallback;
  return value instanceof Date ? value : new Date(value);
};

const toIsoString = (value?: Date | string | null): string => {
  return toDate(value).toISOString();
};

const getFilenameFromKey = (key: string): string => {
  const parts = key.split('/');
  return parts[parts.length - 1] || key;
};

const stripExtension = (filename: string): string => filename.replace(/\.[^/.]+$/, '');

const getImageIdFromKey = (key: string): string => stripExtension(getFilenameFromKey(key));

const resolveGeneratedImageFilename = (image: { imageId: string; imageFilename?: string }): string => image.imageFilename ?? image.imageId;

const buildGeneratedAssetUrl = (clientId: string, sessionId: string, imageId: string, imageFilename?: string): string =>
  `clients/${clientId}/sessions/${sessionId}/media/${imageFilename ?? imageId}`;

async function withTransaction<T>(fn: Parameters<typeof db.transaction>[0]): Promise<T> {
  return (await db.transaction(fn)) as T;
}

function mapMessage(row: DbMessage): Message {
  return {
    id: row.id,
    role: row.role,
    parts: row.parts as Message['parts'],
    timestamp: toIsoString(row.createdAt),
    inspirationImageId: row.inspirationImageId ?? undefined,
    baseImageIds: row.baseImageIds ?? undefined,
  };
}

function mapChatSession(row: DbChatSession, messages: DbMessage[]): Session {
  return {
    id: row.id,
    name: row.name,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    messages: messages.map(mapMessage),
    productId: row.productId,
    selectedBaseImageId: row.selectedBaseImageId ?? undefined,
  };
}

function mapGeneratedAsset(row: DbGeneratedAsset, fallbackSettings: Flow['settings']): FlowGeneratedImage {
  const filename = getFilenameFromKey(row.assetUrl);
  return {
    id: row.id,
    imageId: stripExtension(filename),
    imageFilename: filename,
    timestamp: toIsoString(row.createdAt),
    productIds: row.productIds ?? [],
    settings: (row.settings ?? fallbackSettings) as unknown as FlowGenerationSettings,
    prompt: row.prompt ?? undefined,
    jobId: row.jobId ?? undefined,
    error: row.error ?? undefined,
  };
}

function mapGenerationFlow(row: DbGenerationFlow, images: DbGeneratedAsset[]): Flow {
  const settings = (row.settings ?? DEFAULT_FLOW_SETTINGS) as unknown as FlowGenerationSettings;
  return {
    id: row.id,
    name: row.name ?? undefined,
    productIds: row.productIds ?? [],
    selectedBaseImages: row.selectedBaseImages ?? {},
    status: row.status,
    settings,
    generatedImages: images.map((image) => mapGeneratedAsset(image, settings)),
    currentImageIndex: row.currentImageIndex,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function mapCollectionSession(row: DbCollectionSession, flows: Flow[], messages: DbMessage[]): ClientSession {
  return {
    id: row.id,
    name: row.name,
    clientId: row.clientId,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    messages: messages.map(mapMessage),
    flows,
    productIds: row.productIds ?? [],
    selectedBaseImages: row.selectedBaseImages ?? {},
  };
}

function mapProduct(row: DbProduct, imageIds: string[], sessions: Session[]): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    category: normalizeCategoryValue(row.category),
    sceneTypes: row.sceneTypes ?? undefined,
    productImageIds: imageIds,
    modelFilename: row.modelFilename ?? undefined,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    sessions,
    clientId: row.clientId,
  };
}

function mapClient(
  row: { id: string; name: string; createdAt: Date; updatedAt: Date; metadata: ClientMetadata | null },
  products: Product[],
  studioSessions: ClientSession[]
): Client {
  const metadata = row.metadata ?? {};
  return {
    id: row.id,
    name: row.name,
    description: metadata.description,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    products,
    categories: deriveClientCategories(products),
    studioSessions,
    clientSessions: studioSessions,
    commerce: metadata.commerce as CommerceConfig | undefined,
    aiModelConfig: metadata.aiModelConfig as AIModelConfig | undefined,
  };
}

async function loadClient(clientId: string): Promise<Client | null> {
  const clientRow = await db.clients.getById(clientId);
  if (!clientRow) return null;

  const productsWithImages = await db.products.listWithImages(clientId);
  const productIds = productsWithImages.map((productRow) => productRow.id);
  const chatSessions = await db.chatSessions.listByProductIds(productIds);
  const chatSessionIds = chatSessions.map((sessionRow) => sessionRow.id);
  const chatMessages = await db.messages.listBySessionIds(chatSessionIds, 'chat');

  const chatSessionsByProduct = new Map<string, DbChatSession[]>();
  chatSessions.forEach((sessionRow) => {
    const list = chatSessionsByProduct.get(sessionRow.productId) ?? [];
    list.push(sessionRow as DbChatSession);
    chatSessionsByProduct.set(sessionRow.productId, list);
  });

  const chatMessagesBySession = new Map<string, DbMessage[]>();
  chatMessages.forEach((messageRow) => {
    const sessionId = messageRow.chatSessionId;
    if (!sessionId) return;
    const list = chatMessagesBySession.get(sessionId) ?? [];
    list.push(messageRow as DbMessage);
    chatMessagesBySession.set(sessionId, list);
  });

  const products: Product[] = productsWithImages.map((productRow) => {
    const sessions = chatSessionsByProduct.get(productRow.id) ?? [];
    const mappedSessions = sessions.map((sessionRow) => {
      const messages = chatMessagesBySession.get(sessionRow.id) ?? [];
      return mapChatSession(sessionRow, messages);
    });

    const images = Array.isArray(productRow.images) ? [...productRow.images] : [];
    images.sort((a, b) => a.sortOrder - b.sortOrder);
    const imageIds = images.map((image) => getImageIdFromKey(image.r2KeyBase));

    return mapProduct(productRow as unknown as DbProduct, imageIds, mappedSessions);
  });

  const collectionSessions = await db.collectionSessions.list(clientId);
  const collectionSessionIds = collectionSessions.map((sessionRow) => sessionRow.id);
  const flows = await db.generationFlows.listByCollectionSessionIds(collectionSessionIds);
  const flowIds = flows.map((flowRow) => flowRow.id);
  const generatedAssets = await db.generatedAssets.listByGenerationFlowIds(flowIds);
  const collectionMessages = await db.messages.listBySessionIds(collectionSessionIds, 'collection');

  const flowsBySession = new Map<string, DbGenerationFlow[]>();
  flows.forEach((flowRow) => {
    if (!flowRow.collectionSessionId) return;
    const list = flowsBySession.get(flowRow.collectionSessionId) ?? [];
    list.push(flowRow as DbGenerationFlow);
    flowsBySession.set(flowRow.collectionSessionId, list);
  });

  const assetsByFlow = new Map<string, DbGeneratedAsset[]>();
  generatedAssets.forEach((assetRow) => {
    const flowId = assetRow.generationFlowId;
    if (!flowId) return;
    const list = assetsByFlow.get(flowId) ?? [];
    list.push(assetRow as DbGeneratedAsset);
    assetsByFlow.set(flowId, list);
  });

  const collectionMessagesBySession = new Map<string, DbMessage[]>();
  collectionMessages.forEach((messageRow) => {
    const sessionId = messageRow.collectionSessionId;
    if (!sessionId) return;
    const list = collectionMessagesBySession.get(sessionId) ?? [];
    list.push(messageRow as DbMessage);
    collectionMessagesBySession.set(sessionId, list);
  });

  const mappedCollectionSessions: ClientSession[] = collectionSessions.map((sessionRow) => {
    const flowsForSession = flowsBySession.get(sessionRow.id) ?? [];
    const mappedFlows = flowsForSession.map((flowRow) => {
      const images = assetsByFlow.get(flowRow.id) ?? [];
      return mapGenerationFlow(flowRow, images);
    });
    const messages = collectionMessagesBySession.get(sessionRow.id) ?? [];
    return mapCollectionSession(sessionRow as DbCollectionSession, mappedFlows, messages);
  });

  return mapClient(clientRow, products, mappedCollectionSessions);
}

export async function listClients(): Promise<Client[]> {
  const clients = await db.clients.list();
  const mapped = await Promise.all(clients.map((clientRow) => loadClient(clientRow.id)));
  return mapped.filter((client): client is Client => Boolean(client));
}

export async function getClient(clientId: string): Promise<Client | null> {
  return loadClient(clientId);
}

export async function createClientRecord(params: {
  id: string;
  name: string;
  description?: string;
  commerce?: CommerceConfig;
  aiModelConfig?: AIModelConfig;
}): Promise<void> {
  const existing = await db.clients.getById(params.id);
  if (existing) {
    return;
  }

  const commerceMetadata =
    params.commerce && params.commerce.provider !== 'none'
      ? {
          provider: params.commerce.provider,
          baseUrl: params.commerce.baseUrl,
          secretName: params.commerce.secretName,
        }
      : undefined;

  const metadata: ClientMetadata = {
    ...(params.description ? { description: params.description } : {}),
    ...(commerceMetadata ? { commerce: commerceMetadata } : {}),
    ...(params.aiModelConfig ? { aiModelConfig: params.aiModelConfig } : {}),
  };

  await db.clients.createWithId(params.id, {
    name: params.name,
    slug: params.id,
    metadata,
  });
}

export async function updateClientRecord(
  clientId: string,
  updates: {
    name?: string;
    description?: string;
    commerce?: CommerceConfig;
    aiModelConfig?: AIModelConfig;
  }
): Promise<Client> {
  const current = await db.clients.getById(clientId);
  if (!current) {
    throw new Error('Client not found');
  }

  const commerceMetadata =
    updates.commerce === undefined
      ? undefined
      : updates.commerce.provider === 'none'
        ? undefined
        : {
            provider: updates.commerce.provider,
            baseUrl: updates.commerce.baseUrl,
            secretName: updates.commerce.secretName,
          };

  const metadata: ClientMetadata = {
    ...(current.metadata ?? {}),
    ...(updates.description !== undefined ? { description: updates.description } : {}),
    ...(updates.commerce !== undefined ? { commerce: commerceMetadata } : {}),
    ...(updates.aiModelConfig ? { aiModelConfig: updates.aiModelConfig } : {}),
  };

  await db.clients.update(clientId, {
    ...(updates.name ? { name: updates.name } : {}),
    metadata,
  });

  const updated = await loadClient(clientId);
  if (!updated) {
    throw new Error('Failed to load updated client');
  }

  return updated;
}

export async function deleteClientRecord(clientId: string): Promise<void> {
  await db.clients.delete(clientId);
}

export async function createProductRecord(clientId: string, payload: CreateProductPayload): Promise<Product> {
  const created = await db.products.create(clientId, payload);
  return mapProduct(created as unknown as DbProduct, [], []);
}

export async function createChatSessionRecord(_clientId: string, productId: string, payload: CreateSessionPayload): Promise<Session> {
  const name = payload.name ?? `Session ${new Date().toLocaleDateString()}`;
  const created = await db.chatSessions.create(productId, {
    name,
    selectedBaseImageId: payload.selectedBaseImageId,
  });
  return mapChatSession(created as DbChatSession, []);
}

export async function createStudioSessionRecord(clientId: string, payload: CreateStudioSessionPayload): Promise<ClientSession> {
  const name = payload.name ?? `Studio Session ${new Date().toLocaleString()}`;
  const created = await db.collectionSessions.create(clientId, {
    name,
    productIds: payload.productIds ?? [],
    selectedBaseImages: payload.selectedBaseImages ?? {},
  });
  return mapCollectionSession(created as DbCollectionSession, [], []);
}

export async function createFlowRecord(clientId: string, sessionId: string, payload: CreateFlowPayload): Promise<Flow> {
  const created = await db.generationFlows.create(clientId, {
    collectionSessionId: sessionId,
    name: payload.name,
    productIds: payload.productIds ?? [],
    selectedBaseImages: payload.selectedBaseImages ?? {},
    settings: payload.settings as unknown as DbFlowGenerationSettings,
  });
  return mapGenerationFlow(created as DbGenerationFlow, []);
}

export async function updateProductRecord(_clientId: string, productId: string, updates: Partial<Product>): Promise<void> {
  const updatePayload: Partial<DbProduct> = {};
  if (updates.name !== undefined) updatePayload.name = updates.name;
  if (updates.description !== undefined) updatePayload.description = updates.description ?? null;
  if (updates.category !== undefined) updatePayload.category = updates.category ?? null;
  if (updates.sceneTypes !== undefined) updatePayload.sceneTypes = updates.sceneTypes ?? null;
  if (updates.modelFilename !== undefined) updatePayload.modelFilename = updates.modelFilename ?? null;
  // NOTE: favoriteGeneratedImages and sceneImages columns removed - use pinned on generated_asset

  await withTransaction(async (tx) => {
    if (Object.keys(updatePayload).length > 0) {
      await tx.products.update(productId, updatePayload);
    }

    if (updates.productImageIds) {
      await tx.productImages.reorderByImageIds(productId, updates.productImageIds);
    }
  });
}

export async function deleteProductRecord(productId: string): Promise<void> {
  await db.products.delete(productId);
}

export async function saveChatSession(_clientId: string, productId: string, session: Session): Promise<void> {
  await withTransaction(async (tx) => {
    const now = new Date();
    await tx.chatSessions.upsertWithId(session.id, productId, {
      name: session.name,
      selectedBaseImageId: session.selectedBaseImageId ?? null,
      createdAt: toDate(session.createdAt, now),
      updatedAt: toDate(session.updatedAt, now),
    });

    const messages = session.messages ?? [];
    await tx.messages.replaceForSession(
      session.id,
      'chat',
      messages.map((entry) => ({
        id: entry.id,
        role: entry.role,
        parts: entry.parts,
        baseImageId: entry.baseImageId ?? undefined,
        baseImageIds: entry.baseImageIds ?? undefined,
        inspirationImageId: entry.inspirationImageId ?? undefined,
        createdAt: toDate(entry.timestamp, now),
        updatedAt: toDate(entry.timestamp, now),
      }))
    );
  });
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await db.chatSessions.delete(sessionId);
}

export async function saveStudioSession(clientId: string, session: ClientSession): Promise<void> {
  await withTransaction(async (tx) => {
    const now = new Date();
    await tx.collectionSessions.upsertWithId(session.id, clientId, {
      name: session.name,
      productIds: session.productIds ?? [],
      selectedBaseImages: session.selectedBaseImages ?? {},
      createdAt: toDate(session.createdAt, now),
      updatedAt: toDate(session.updatedAt, now),
    });

    const messages = session.messages ?? [];
    await tx.messages.replaceForSession(
      session.id,
      'collection',
      messages.map((entry) => ({
        id: entry.id,
        role: entry.role,
        parts: entry.parts,
        baseImageId: entry.baseImageId ?? undefined,
        baseImageIds: entry.baseImageIds ?? undefined,
        inspirationImageId: entry.inspirationImageId ?? undefined,
        createdAt: toDate(entry.timestamp, now),
        updatedAt: toDate(entry.timestamp, now),
      }))
    );

    const existingFlows = await tx.generationFlows.listByCollectionSession(session.id);
    const existingFlowIds = existingFlows.map((entry) => entry.id);
    await tx.generatedAssets.deleteByGenerationFlowIds(existingFlowIds);
    await tx.generationFlows.deleteByCollectionSession(session.id);

    const flows = session.flows ?? [];
    if (flows.length > 0) {
      await tx.generationFlows.createBatchWithIds(
        clientId,
        flows.map((entry) => ({
          id: entry.id,
          clientId,
          collectionSessionId: session.id,
          name: entry.name,
          productIds: entry.productIds ?? [],
          selectedBaseImages: entry.selectedBaseImages ?? {},
          status: entry.status,
          settings: entry.settings ?? DEFAULT_FLOW_SETTINGS,
          currentImageIndex: entry.currentImageIndex ?? 0,
          createdAt: toDate(entry.createdAt, now),
          updatedAt: toDate(entry.updatedAt, now),
        }))
      );

      const generatedAssets: Array<GeneratedAssetCreate & { id: string; createdAt: Date; updatedAt: Date }> = flows.flatMap((flowEntry) =>
        flowEntry.generatedImages.map((image) => ({
          id: image.id,
          clientId,
          generationFlowId: flowEntry.id,
          chatSessionId: null,
          assetUrl: buildGeneratedAssetUrl(clientId, session.id, image.imageId, resolveGeneratedImageFilename(image)),
          assetType: 'image' as const,
          status: (image.error ? 'error' : 'completed') as 'error' | 'completed',
          prompt: image.prompt ?? null,
          settings: (image.settings ?? flowEntry.settings ?? DEFAULT_FLOW_SETTINGS) as unknown as DbFlowGenerationSettings,
          productIds: image.productIds ?? flowEntry.productIds ?? [],
          jobId: image.jobId ?? null,
          error: image.error ?? null,
          createdAt: toDate(image.timestamp, now),
          updatedAt: toDate(image.timestamp, now),
        }))
      );

      await tx.generatedAssets.createBatchWithIds(generatedAssets);
    }
  });
}

export async function deleteStudioSession(sessionId: string): Promise<void> {
  await db.collectionSessions.delete(sessionId);
}
