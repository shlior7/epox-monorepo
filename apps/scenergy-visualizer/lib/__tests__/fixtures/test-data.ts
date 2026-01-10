/**
 * Test Fixtures - Reusable test data
 */

import type { Client, Product, Session, Message, MessagePart } from '@/lib/types/app-types';

/**
 * Create a test message
 */
export function createTestMessage(overrides?: Partial<Message>): Message {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role: 'user',
    parts: [
      {
        type: 'text',
        content: 'Test message content',
      },
    ],
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a test message part
 */
export function createTestMessagePart(type: 'text' | 'image', overrides?: Partial<MessagePart>): MessagePart {
  if (type === 'text') {
    return {
      type: 'text',
      content: 'Test text content',
      ...overrides,
    } as MessagePart;
  } else {
    return {
      type: 'image',
      imageIds: ['test-image.jpg'],
      status: 'completed',
      progress: 100,
      ...overrides,
    } as MessagePart;
  }
}

/**
 * Create a test session
 */
export function createTestSession(overrides?: Partial<Session>): Session {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id: sessionId,
    name: 'Test Session',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    productId: 'test-product-id',
    ...overrides,
  };
}

/**
 * Create a test product
 */
export function createTestProduct(overrides?: Partial<Product>): Product {
  const productId = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id: productId,
    name: 'Test Product',
    description: 'Test product description',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    productImageIds: ['test-product-image.jpg'],
    clientId: 'client_test',
    sessions: [],
    ...overrides,
  };
}

/**
 * Create a test client
 */
export function createTestClient(overrides?: Partial<Client>): Client {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id: clientId,
    name: 'Test Client',
    description: 'Test client description',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    products: [],
    ...overrides,
  };
}

/**
 * Create a full test hierarchy (client with products and sessions)
 */
export function createTestHierarchy(): {
  client: Client;
  product: Product;
  session: Session;
  message: Message;
} {
  const message = createTestMessage();
  const session = createTestSession({ messages: [message] });
  const product = createTestProduct({ sessions: [session] });
  const client = createTestClient({ products: [product] });

  // Update references
  session.productId = product.id;

  return { client, product, session, message };
}

/**
 * Create multiple test clients
 */
export function createTestClients(count: number): Client[] {
  return Array.from({ length: count }, (_, i) => {
    const client = createTestClient({
      name: `Test Client ${i + 1}`,
    });

    // Add a product with a session to each client
    const product = createTestProduct({
      name: `Product ${i + 1}`,
    });
    const session = createTestSession({
      name: `Session ${i + 1}`,
      productId: product.id,
    });
    product.sessions = [session];
    client.products = [product];

    return client;
  });
}

/**
 * Clone test data (deep copy)
 */
export function cloneTestData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Create a test message with image generation
 */
export function createTestImageGenerationMessage(overrides?: Partial<Message>): Message {
  return createTestMessage({
    role: 'assistant',
    parts: [
      {
        type: 'image',
        imageIds: ['img_test_123.jpg'],
        jobId: 'job_test_123',
        status: 'pending',
        progress: 0,
        metadata: {
          prompt: 'Test prompt',
          settings: {},
        },
      },
    ],
    ...overrides,
  });
}

/**
 * Create a session with message history
 */
export function createTestSessionWithHistory(messageCount: number): Session {
  const messages: Message[] = [];
  
  for (let i = 0; i < messageCount; i++) {
    const isUser = i % 2 === 0;
    messages.push(createTestMessage({
      role: isUser ? 'user' : 'assistant',
      parts: [
        {
          type: 'text',
          content: `${isUser ? 'User' : 'Assistant'} message ${i + 1}`,
        },
      ],
    }));
  }

  return createTestSession({ messages });
}

/**
 * Wait for a condition with timeout
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 50
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Wait for a specific amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
