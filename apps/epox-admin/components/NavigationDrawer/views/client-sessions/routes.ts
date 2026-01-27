export const clientSessionsRoutes = {
  session: (clientId: string, sessionId: string) => `/${clientId}/client-session/${sessionId}`,
};
