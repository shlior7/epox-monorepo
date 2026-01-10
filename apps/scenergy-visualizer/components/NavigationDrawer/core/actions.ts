import type { ActionDef, NavContext } from './types';

export function isActionVisible(action: ActionDef, ctx: NavContext): boolean {
  return action.visible ? action.visible(ctx) : true;
}

export function isActionEnabled(action: ActionDef, ctx: NavContext): boolean {
  return action.enabled ? action.enabled(ctx) : true;
}

export async function runAction(action: ActionDef, ctx: NavContext, payload?: unknown) {
  await action.run(ctx, payload);
}

export function filterActions(actions: ActionDef[], ctx: NavContext) {
  return actions.filter((action) => isActionVisible(action, ctx));
}
