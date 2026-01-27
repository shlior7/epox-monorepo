import { ClientSessionsViewPlugin } from '../views/client-sessions/config';
import { ClientsViewPlugin } from '../views/clients/config';
import { ProductsViewPlugin } from '../views/products/config';
import { SessionsViewPlugin } from '../views/sessions/config';
import { StudioProductsViewPlugin } from '../views/studio-products/config';
import type { NavViewId, ViewPlugin } from './types';

const registry = new Map<NavViewId, ViewPlugin>([
  [ClientsViewPlugin.id, ClientsViewPlugin],
  [ProductsViewPlugin.id, ProductsViewPlugin],
  [SessionsViewPlugin.id, SessionsViewPlugin],
  [ClientSessionsViewPlugin.id, ClientSessionsViewPlugin],
  [StudioProductsViewPlugin.id, StudioProductsViewPlugin],
]);

export function registerView(view: ViewPlugin) {
  registry.set(view.id, view);
}

export function getView(id: NavViewId): ViewPlugin {
  const view = registry.get(id);
  if (!view) {
    throw new Error(`Navigation view not registered: ${id}`);
  }
  return view;
}

export function listViews(): ViewPlugin[] {
  return Array.from(registry.values());
}

export function clearRegistry() {
  registry.clear();
}
