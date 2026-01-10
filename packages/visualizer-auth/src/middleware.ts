import { auth } from './server';

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

interface HandlerContext<TParams = any> {
  session: Session | null;
  params?: TParams;
}

interface AuthedContext<TParams = any> {
  session: NonNullable<Session>;
  params?: TParams;
}

export function withAuth<TParams = any>(handler: (req: Request, ctx: HandlerContext<TParams>) => Promise<Response>) {
  return async (req: Request, ctx: { params?: TParams }) => {
    const session = await auth.api.getSession({ headers: req.headers });
    return handler(req, { ...ctx, session });
  };
}

export function requireAuth<TParams = any>(handler: (req: Request, ctx: AuthedContext<TParams>) => Promise<Response>) {
  return async (req: Request, ctx: { params?: TParams }) => {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }
    return handler(req, { ...ctx, session });
  };
}
