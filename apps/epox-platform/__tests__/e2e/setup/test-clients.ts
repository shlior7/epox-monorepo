/**
 * Test client configuration data
 * Uses real client created via signup flow
 */

export const TEST_CLIENTS = [
  {
    id: 'cf1114ed-9349-41a7-9e6e-7c4843b9499b', // Real client created via signup
    name: "test-client's Workspace",
    slug: 'test-client-1768999316105',
    email: 'hello@epox.ai',
    password: 'testtest',
    userName: 'test-client',
    products: [
      {
        id: 'prod-001',
        name: 'Modern Sofa',
        description: 'A comfortable modern sofa',
        category: 'Furniture',
        baseImages: ['modern sofa.webp'],
      },
      {
        id: 'prod-002',
        name: 'Oak Dining Table',
        description: 'Solid oak dining table',
        category: 'Furniture',
      },
      {
        id: 'prod-003',
        name: 'LED Floor Lamp',
        description: 'Adjustable LED floor lamp',
        category: 'Lighting',
      },
    ],
    collections: [
      { name: 'Living Room Collection', products: ['prod-001', 'prod-003'], status: 'pending' },
    ],
  },
] as const;
