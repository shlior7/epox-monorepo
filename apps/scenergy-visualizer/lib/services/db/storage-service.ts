import { DEFAULT_FLOW_SETTINGS, type ClientMetadata } from 'visualizer-types';
import { db } from 'visualizer-db';
import { chatSession, flow, generatedImage, message, product, studioSession } from 'visualizer-db/schema';
import type {
  Client,
  CreateFlowPayload,
  CreateProductPayload,
  CreateSessionPayload,
  CreateStudioSessionPayload,
  Flow,
  FlowGeneratedImage,
  Message,
  Product,
  Session,
  ClientSession,
  CommerceConfig,
  AIModelConfig,
} from '@/lib/types/app-types';

type DbFlow = typeof flow.$inferSelect;
type DbGeneratedImage = typeof generatedImage.$inferSelect;
type DbMessage = typeof message.$inferSelect;
type DbChatSession = typeof chatSession.$inferSelect;
type DbStudioSession = typeof studioSession.$inferSelect;
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

const buildGeneratedImageKey = (clientId: string, sessionId: string, imageId: string): string =>
  `clients/${clientId}/sessions/${sessionId}/media/${imageId}`;

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
    baseImageId: row.baseImageId ?? undefined,
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

function mapGeneratedImage(row: DbGeneratedImage, fallbackSettings: Flow['settings']): FlowGeneratedImage {
  return {
    id: row.id,
    imageId: getFilenameFromKey(row.r2Key),
    timestamp: toIsoString(row.createdAt),
    productIds: row.productIds ?? [],
    settings: row.settings ?? fallbackSettings,
    prompt: row.prompt ?? undefined,
    jobId: row.jobId ?? undefined,
    error: row.error ?? undefined,
  };
}

function mapFlow(row: DbFlow, images: DbGeneratedImage[]): Flow {
  const settings = row.settings ?? DEFAULT_FLOW_SETTINGS;
  return {
    id: row.id,
    name: row.name ?? undefined,
    productIds: row.productIds ?? [],
    selectedBaseImages: row.selectedBaseImages ?? {},
    status: row.status,
    settings,
    generatedImages: images.map((image) => mapGeneratedImage(image, settings)),
    currentImageIndex: row.currentImageIndex,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function mapStudioSession(row: DbStudioSession, flows: Flow[], messages: DbMessage[]): ClientSession {
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
    roomTypes: row.roomTypes ?? undefined,
    productImageIds: imageIds,
    modelFilename: row.modelFilename ?? undefined,
    favoriteGeneratedImages: row.favoriteGeneratedImages ?? [],
    sceneImages: row.sceneImages ?? [],
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

    return mapProduct(productRow as DbProduct, imageIds, mappedSessions);
  });

  const studioSessions = await db.studioSessions.list(clientId);
  const studioSessionIds = studioSessions.map((sessionRow) => sessionRow.id);
  const flows = await db.flows.listByStudioSessionIds(studioSessionIds);
  const flowIds = flows.map((flowRow) => flowRow.id);
  const generatedImages = await db.generatedImages.listByFlowIds(flowIds);
  const studioMessages = await db.messages.listBySessionIds(studioSessionIds, 'studio');

  const flowsBySession = new Map<string, DbFlow[]>();
  flows.forEach((flowRow) => {
    const list = flowsBySession.get(flowRow.studioSessionId) ?? [];
    list.push(flowRow as DbFlow);
    flowsBySession.set(flowRow.studioSessionId, list);
  });

  const imagesByFlow = new Map<string, DbGeneratedImage[]>();
  generatedImages.forEach((imageRow) => {
    const flowId = imageRow.flowId;
    if (!flowId) return;
    const list = imagesByFlow.get(flowId) ?? [];
    list.push(imageRow as DbGeneratedImage);
    imagesByFlow.set(flowId, list);
  });

  const studioMessagesBySession = new Map<string, DbMessage[]>();
  studioMessages.forEach((messageRow) => {
    const sessionId = messageRow.studioSessionId;
    if (!sessionId) return;
    const list = studioMessagesBySession.get(sessionId) ?? [];
    list.push(messageRow as DbMessage);
    studioMessagesBySession.set(sessionId, list);
  });

  const mappedStudioSessions: ClientSession[] = studioSessions.map((sessionRow) => {
    const flowsForSession = flowsBySession.get(sessionRow.id) ?? [];
    const mappedFlows = flowsForSession.map((flowRow) => {
      const images = imagesByFlow.get(flowRow.id) ?? [];
      return mapFlow(flowRow, images);
    });
    const messages = studioMessagesBySession.get(sessionRow.id) ?? [];
    return mapStudioSession(sessionRow as DbStudioSession, mappedFlows, messages);
  });

  return mapClient(clientRow, products, mappedStudioSessions);
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

  const metadata: ClientMetadata = {
    ...(params.description ? { description: params.description } : {}),
    ...(params.commerce ? { commerce: params.commerce } : {}),
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

  const metadata: ClientMetadata = {
    ...(current.metadata ?? {}),
    ...(updates.description !== undefined ? { description: updates.description } : {}),
    ...(updates.commerce ? { commerce: updates.commerce } : {}),
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
  return mapProduct(created as DbProduct, [], []);
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
  const created = await db.studioSessions.create(clientId, {
    name,
    productIds: payload.productIds ?? [],
    selectedBaseImages: payload.selectedBaseImages ?? {},
  });
  return mapStudioSession(created as DbStudioSession, [], []);
}

export async function createFlowRecord(_clientId: string, sessionId: string, payload: CreateFlowPayload): Promise<Flow> {
  const created = await db.flows.create(sessionId, {
    name: payload.name,
    productIds: payload.productIds ?? [],
    selectedBaseImages: payload.selectedBaseImages ?? {},
    settings: payload.settings,
  });
  return mapFlow(created as DbFlow, []);
}

export async function updateProductRecord(_clientId: string, productId: string, updates: Partial<Product>): Promise<void> {
  const updatePayload: Partial<DbProduct> = {};
  if (updates.name !== undefined) updatePayload.name = updates.name;
  if (updates.description !== undefined) updatePayload.description = updates.description ?? null;
  if (updates.category !== undefined) updatePayload.category = updates.category ?? null;
  if (updates.roomTypes !== undefined) updatePayload.roomTypes = updates.roomTypes ?? null;
  if (updates.modelFilename !== undefined) updatePayload.modelFilename = updates.modelFilename ?? null;
  if (updates.favoriteGeneratedImages !== undefined) {
    updatePayload.favoriteGeneratedImages = updates.favoriteGeneratedImages ?? [];
  }
  if (updates.sceneImages !== undefined) {
    updatePayload.sceneImages = updates.sceneImages ?? [];
  }

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
    await tx.studioSessions.upsertWithId(session.id, clientId, {
      name: session.name,
      productIds: session.productIds ?? [],
      selectedBaseImages: session.selectedBaseImages ?? {},
      createdAt: toDate(session.createdAt, now),
      updatedAt: toDate(session.updatedAt, now),
    });

    const messages = session.messages ?? [];
    await tx.messages.replaceForSession(
      session.id,
      'studio',
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

    const existingFlows = await tx.flows.list(session.id);
    const existingFlowIds = existingFlows.map((entry) => entry.id);
    await tx.generatedImages.deleteByFlowIds(existingFlowIds);
    await tx.flows.deleteByStudioSession(session.id);

    const flows = session.flows ?? [];
    if (flows.length > 0) {
      await tx.flows.createBatchWithIds(
        session.id,
        flows.map((entry) => ({
          id: entry.id,
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

      const generatedImages = flows.flatMap((flowEntry) =>
        flowEntry.generatedImages.map((image) => ({
          id: image.id,
          clientId,
          flowId: flowEntry.id,
          chatSessionId: null,
          r2Key: buildGeneratedImageKey(clientId, session.id, image.imageId),
          prompt: image.prompt ?? null,
          settings: image.settings ?? flowEntry.settings ?? DEFAULT_FLOW_SETTINGS,
          productIds: image.productIds ?? flowEntry.productIds ?? [],
          jobId: image.jobId ?? null,
          error: image.error ?? null,
          createdAt: toDate(image.timestamp, now),
          updatedAt: toDate(image.timestamp, now),
        }))
      );

      await tx.generatedImages.createBatchWithIds(generatedImages);
    }
  });
}

export async function deleteStudioSession(sessionId: string): Promise<void> {
  await db.studioSessions.delete(sessionId);
}
