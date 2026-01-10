import { NextRequest, NextResponse } from 'next/server';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query') || 'interior design';
  const perPage = searchParams.get('per_page') || '30';
  const page = searchParams.get('page') || '1';

  if (!UNSPLASH_ACCESS_KEY) {
    // Return mock data if no API key is configured
    return NextResponse.json({
      results: getMockUnsplashImages(query),
      total: 30,
      total_pages: 1,
    });
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Unsplash API error:', error);
    // Fallback to mock data on error
    return NextResponse.json({
      results: getMockUnsplashImages(query),
      total: 30,
      total_pages: 1,
    });
  }
}

// Mock Unsplash images for development/demo - organized by category
function getMockUnsplashImages(query: string) {
  const queryLower = query.toLowerCase();
  
  // Category-specific image collections
  const categoryImages: Record<string, typeof allImages> = {
    'living room': [
      { id: 'living-1', photoId: '1586023492125-27b2c045efd7', desc: 'Modern living room with white sofa' },
      { id: 'living-2', photoId: '1600585154340-be6161a56a0c', desc: 'Luxury living room with fireplace' },
      { id: 'living-3', photoId: '1617806118233-18e1de247200', desc: 'Industrial loft living space' },
      { id: 'living-4', photoId: '1600585154526-990dced4db0d', desc: 'Cozy living room corner' },
    ],
    'bedroom': [
      { id: 'bed-1', photoId: '1618221195710-dd6b41faaea6', desc: 'Minimalist bedroom interior' },
      { id: 'bed-2', photoId: '1560448204-e02f11c3d0e2', desc: 'Luxury hotel bedroom' },
      { id: 'bed-3', photoId: '1616594039964-ae9021a400a0', desc: 'Scandinavian bedroom design' },
      { id: 'bed-4', photoId: '1615874959474-d609969a20ed', desc: 'Modern master bedroom' },
    ],
    'kitchen': [
      { id: 'kitchen-1', photoId: '1600210492493-0946911123ea', desc: 'Contemporary kitchen design' },
      { id: 'kitchen-2', photoId: '1556909114-f6e7ad7d3136', desc: 'White modern kitchen' },
      { id: 'kitchen-3', photoId: '1600585154340-be6161a56a0c', desc: 'Open kitchen with island' },
      { id: 'kitchen-4', photoId: '1556909172-54557c7e4fb7', desc: 'Minimalist kitchen space' },
    ],
    'office': [
      { id: 'office-1', photoId: '1600607687939-ce8a6c25118c', desc: 'Modern home office space' },
      { id: 'office-2', photoId: '1593062096033-9a26b09da705', desc: 'Professional workspace' },
      { id: 'office-3', photoId: '1497366216548-37526070297c', desc: 'Creative studio office' },
      { id: 'office-4', photoId: '1524758631624-e2822e304c36', desc: 'Home office with view' },
    ],
    'outdoor': [
      { id: 'outdoor-1', photoId: '1600566753190-17f0baa2a6c3', desc: 'Outdoor patio with furniture' },
      { id: 'outdoor-2', photoId: '1600585154526-990dced4db0d', desc: 'Garden seating area' },
      { id: 'outdoor-3', photoId: '1558618666-fcd25c85cd64', desc: 'Backyard deck design' },
      { id: 'outdoor-4', photoId: '1600566752355-35792bedcfea', desc: 'Pool area with loungers' },
    ],
    'minimal': [
      { id: 'minimal-1', photoId: '1618221195710-dd6b41faaea6', desc: 'Minimalist interior' },
      { id: 'minimal-2', photoId: '1615529328331-f8917597711f', desc: 'Clean modern space' },
      { id: 'minimal-3', photoId: '1600210492493-0946911123ea', desc: 'Simple white room' },
      { id: 'minimal-4', photoId: '1600607687939-ce8a6c25118c', desc: 'Minimal workspace' },
    ],
    'luxury': [
      { id: 'luxury-1', photoId: '1600585154340-be6161a56a0c', desc: 'Luxury living room' },
      { id: 'luxury-2', photoId: '1560448204-e02f11c3d0e2', desc: 'High-end hotel suite' },
      { id: 'luxury-3', photoId: '1600566753376-12c8ab7fb75b', desc: 'Elegant dining room' },
      { id: 'luxury-4', photoId: '1617806118233-18e1de247200', desc: 'Premium loft space' },
    ],
    'modern': [
      { id: 'modern-1', photoId: '1586023492125-27b2c045efd7', desc: 'Modern living room design' },
      { id: 'modern-2', photoId: '1600210492493-0946911123ea', desc: 'Contemporary kitchen' },
      { id: 'modern-3', photoId: '1600607687939-ce8a6c25118c', desc: 'Modern office space' },
      { id: 'modern-4', photoId: '1615529328331-f8917597711f', desc: 'Modern entryway' },
    ],
    'industrial': [
      { id: 'industrial-1', photoId: '1617806118233-18e1de247200', desc: 'Industrial loft space' },
      { id: 'industrial-2', photoId: '1600573472550-8090b5e0745e', desc: 'Exposed brick interior' },
      { id: 'industrial-3', photoId: '1600585154526-990dced4db0d', desc: 'Factory-style living' },
      { id: 'industrial-4', photoId: '1600566753376-12c8ab7fb75b', desc: 'Industrial dining area' },
    ],
  };

  // All images for default/general queries
  const allImages = [
    { id: 'mock-1', photoId: '1586023492125-27b2c045efd7', desc: 'Modern living room with white sofa' },
    { id: 'mock-2', photoId: '1618221195710-dd6b41faaea6', desc: 'Minimalist bedroom interior' },
    { id: 'mock-3', photoId: '1600210492493-0946911123ea', desc: 'Contemporary kitchen design' },
    { id: 'mock-4', photoId: '1600585154340-be6161a56a0c', desc: 'Luxury living room with fireplace' },
    { id: 'mock-5', photoId: '1600607687939-ce8a6c25118c', desc: 'Modern home office space' },
    { id: 'mock-6', photoId: '1600566753376-12c8ab7fb75b', desc: 'Scandinavian style dining room' },
    { id: 'mock-7', photoId: '1617806118233-18e1de247200', desc: 'Industrial loft living space' },
    { id: 'mock-8', photoId: '1600585154526-990dced4db0d', desc: 'Cozy reading corner' },
    { id: 'mock-9', photoId: '1600573472550-8090b5e0745e', desc: 'Bright bathroom design' },
    { id: 'mock-10', photoId: '1600566753190-17f0baa2a6c3', desc: 'Outdoor patio with furniture' },
    { id: 'mock-11', photoId: '1615529328331-f8917597711f', desc: 'Modern entryway' },
    { id: 'mock-12', photoId: '1560448204-e02f11c3d0e2', desc: 'Luxury hotel room' },
  ];

  // Find matching category
  let selectedImages = allImages;
  for (const [category, images] of Object.entries(categoryImages)) {
    if (queryLower.includes(category)) {
      selectedImages = images;
      break;
    }
  }

  // Convert to full Unsplash format
  return selectedImages.map((img) => ({
    id: img.id,
    urls: {
      small: `https://images.unsplash.com/photo-${img.photoId}?w=400`,
      regular: `https://images.unsplash.com/photo-${img.photoId}?w=1080`,
      full: `https://images.unsplash.com/photo-${img.photoId}`,
    },
    alt_description: img.desc,
    user: { name: 'Unsplash', links: { html: 'https://unsplash.com' } },
    links: { html: `https://unsplash.com/photos/${img.id}` },
  }));
}
