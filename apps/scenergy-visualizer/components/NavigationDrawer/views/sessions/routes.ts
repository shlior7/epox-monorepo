export const sessionsRoutes = {
  session: (clientId: string, productId: string, sessionId: string) => `/${clientId}/${productId}/${sessionId}`,
  settings: (clientId: string, productId: string) => `/${clientId}/${productId}/settings`,
};
