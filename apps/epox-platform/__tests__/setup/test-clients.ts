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
      { name: 'Modern Sofa', description: 'A comfortable modern sofa', category: 'Furniture' },
      { name: 'Oak Dining Table', description: 'Solid oak dining table', category: 'Furniture' },
      { name: 'LED Floor Lamp', description: 'Adjustable LED floor lamp', category: 'Lighting' },
    ],
    collections: [
      { name: 'Living Room Collection', status: 'draft' },
      { name: 'Dining Room Set', status: 'completed' },
    ],
  },
] as const;
