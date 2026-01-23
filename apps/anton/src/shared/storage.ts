import type { Annotation, UrlAnnotationStore, Project } from './types';

const STORAGE_KEYS = {
  URL_ANNOTATIONS: 'anton_url_annotations',
  CURRENT_PROJECT: 'anton_current_project',
  EXTENSION_STATE: 'anton_extension_state',
} as const;

export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove trailing slash, keep path and hash, strip query params for now
    return `${urlObj.origin}${urlObj.pathname.replace(/\/$/, '')}${urlObj.hash}`;
  } catch {
    return url;
  }
}

export async function getAnnotationsForUrl(url: string): Promise<Annotation[]> {
  const normalized = normalizeUrl(url);
  const result = await chrome.storage.local.get(STORAGE_KEYS.URL_ANNOTATIONS);
  const store: UrlAnnotationStore = result[STORAGE_KEYS.URL_ANNOTATIONS] || {};
  return store[normalized]?.annotations || [];
}

export async function saveAnnotationsForUrl(url: string, annotations: Annotation[]): Promise<void> {
  const normalized = normalizeUrl(url);
  const result = await chrome.storage.local.get(STORAGE_KEYS.URL_ANNOTATIONS);
  const store: UrlAnnotationStore = result[STORAGE_KEYS.URL_ANNOTATIONS] || {};

  store[normalized] = {
    annotations,
    lastVisited: new Date().toISOString(),
    title: document.title,
  };

  await chrome.storage.local.set({ [STORAGE_KEYS.URL_ANNOTATIONS]: store });
}

export async function addAnnotation(url: string, annotation: Annotation): Promise<void> {
  const annotations = await getAnnotationsForUrl(url);
  annotations.push(annotation);
  await saveAnnotationsForUrl(url, annotations);
}

export async function updateAnnotation(url: string, annotationId: string, updates: Partial<Annotation>): Promise<void> {
  const annotations = await getAnnotationsForUrl(url);
  const index = annotations.findIndex(a => a.id === annotationId);
  if (index !== -1) {
    annotations[index] = { ...annotations[index], ...updates };
    await saveAnnotationsForUrl(url, annotations);
  }
}

export async function deleteAnnotation(url: string, annotationId: string): Promise<void> {
  const annotations = await getAnnotationsForUrl(url);
  const filtered = annotations.filter(a => a.id !== annotationId);
  await saveAnnotationsForUrl(url, filtered);
}

export async function getAllAnnotatedUrls(): Promise<UrlAnnotationStore> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.URL_ANNOTATIONS);
  return result[STORAGE_KEYS.URL_ANNOTATIONS] || {};
}

export async function getCurrentProject(): Promise<Project | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_PROJECT);
  return result[STORAGE_KEYS.CURRENT_PROJECT] || null;
}

export async function saveCurrentProject(project: Project): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_PROJECT]: project });
}

export async function exportProject(): Promise<string> {
  const project = await getCurrentProject();
  return JSON.stringify(project, null, 2);
}

export async function importProject(jsonString: string): Promise<void> {
  const project: Project = JSON.parse(jsonString);

  // Merge pages into URL store
  const store = await getAllAnnotatedUrls();
  for (const page of project.pages) {
    const normalized = normalizeUrl(page.url);
    if (store[normalized]) {
      // Merge annotations
      const existingIds = new Set(store[normalized].annotations.map(a => a.id));
      const newAnnotations = page.annotations.filter(a => !existingIds.has(a.id));
      store[normalized].annotations.push(...newAnnotations);
    } else {
      store[normalized] = {
        annotations: page.annotations,
        lastVisited: page.visitedAt,
        title: page.title,
      };
    }
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.URL_ANNOTATIONS]: store });
  await saveCurrentProject(project);
}
