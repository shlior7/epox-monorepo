/**
 * API Client for app storage operations.
 * Requests are proxied through API routes to keep credentials server-side.
 */

import type {
  Client,
  Flow,
  Product,
  Session,
  StudioSession,
  ClientSession,
  CreateClientPayload,
  CreateFlowPayload,
  CreateProductPayload,
  CreateSessionPayload,
  CreateStudioSessionPayload,
} from '@/lib/types/app-types';

class ApiClient {
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `Request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Client operations
  async listClients(): Promise<Client[]> {
    const data = await this.request<{ clients: Client[] }>('/api/clients');
    return data.clients;
  }

  async getClient(clientId: string): Promise<Client> {
    const data = await this.request<{ client: Client }>(`/api/clients/${clientId}`);
    return data.client;
  }

  async createClient(payload: { client: Client; commerce?: CreateClientPayload['commerce'] }): Promise<Client> {
    const data = await this.request<{ client: Client }>('/api/clients/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return data.client;
  }

  async updateClient(clientId: string, updates: Partial<Client>): Promise<Client> {
    const data = await this.request<{ client: Client }>(`/api/clients/${clientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return data.client;
  }

  async deleteClient(clientId: string): Promise<void> {
    await this.request(`/api/clients/${clientId}`, { method: 'DELETE' });
  }

  // Product operations
  async addProduct(clientId: string, payload: CreateProductPayload): Promise<Product> {
    const data = await this.request<{ product: Product }>(`/api/clients/${clientId}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return data.product;
  }

  async deleteProduct(clientId: string, productId: string): Promise<void> {
    await this.request(`/api/clients/${clientId}/products/${productId}`, { method: 'DELETE' });
  }

  async updateProduct(clientId: string, productId: string, updates: Partial<Product>): Promise<void> {
    await this.request(`/api/clients/${clientId}/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  }

  async uploadProductImage(clientId: string, productId: string, imageId: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('imageId', imageId);

    await this.request(`/api/clients/${clientId}/products/${productId}/images`, {
      method: 'POST',
      body: formData,
    });
  }

  async uploadProductImagePreview(clientId: string, productId: string, imageId: string, dataUrl: string): Promise<void> {
    // Convert data URL to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append('file', blob);
    formData.append('imageId', imageId);

    await this.request(`/api/clients/${clientId}/products/${productId}/images?type=preview`, {
      method: 'POST',
      body: formData,
    });
  }

  async uploadProductModel(clientId: string, productId: string, filename: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', filename);

    await this.request(`/api/clients/${clientId}/products/${productId}/model`, {
      method: 'POST',
      body: formData,
    });
  }

  async deleteProductImages(
    clientId: string,
    productId: string,
    imageIds: string[]
  ): Promise<{ deletedIds: string[]; errors: Array<{ imageId: string; error: string }> }> {
    const data = await this.request<{ deletedIds: string[]; errors: Array<{ imageId: string; error: string }> }>(
      `/api/clients/${clientId}/products/${productId}/images`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds }),
      }
    );
    return data;
  }

  async uploadInspirationImage(clientId: string, sessionId: string, imageId: string, file: File, productId?: string): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('imageId', imageId);
    if (productId) {
      formData.append('productId', productId);
    }

    await this.request(`/api/clients/${clientId}/sessions/${sessionId}/inspiration`, {
      method: 'POST',
      body: formData,
    });
  }

  // Session operations
  async createSession(clientId: string, productId: string, payload: CreateSessionPayload): Promise<Session> {
    const data = await this.request<{ session: Session }>(`/api/clients/${clientId}/products/${productId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return data.session;
  }

  async updateSession(clientId: string, productId: string, session: Session): Promise<void> {
    await this.request(`/api/clients/${clientId}/products/${productId}/sessions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session }),
    });
  }

  async deleteSession(clientId: string, productId: string, sessionId: string): Promise<void> {
    await this.request(`/api/clients/${clientId}/products/${productId}/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // Client session operations
  async createStudioSession(clientId: string, payload: CreateStudioSessionPayload): Promise<StudioSession> {
    const data = await this.request<{ session: StudioSession }>(`/api/clients/${clientId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return data.session;
  }

  async updateStudioSession(clientId: string, session: StudioSession): Promise<void> {
    await this.request(`/api/clients/${clientId}/sessions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session }),
    });
  }

  async deleteStudioSession(clientId: string, sessionId: string): Promise<void> {
    await this.request(`/api/clients/${clientId}/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async createFlow(clientId: string, sessionId: string, payload: CreateFlowPayload): Promise<Flow> {
    const data = await this.request<{ flow: Flow }>(`/api/clients/${clientId}/sessions/${sessionId}/flows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return data.flow;
  }

  async saveClientSession(clientId: string, session: ClientSession): Promise<void> {
    await this.updateStudioSession(clientId, session);
  }

  async updateClientSession(clientId: string, session: ClientSession): Promise<void> {
    await this.updateStudioSession(clientId, session);
  }

  async deleteClientSession(clientId: string, sessionId: string): Promise<void> {
    await this.deleteStudioSession(clientId, sessionId);
  }
}

export const apiClient = new ApiClient();
