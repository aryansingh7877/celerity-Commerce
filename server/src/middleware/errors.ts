import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details ?? null });
    return;
  }
  console.error(err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  // Surface real cause in non-production so Merchant Admin is debuggable
  const expose = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    error: expose ? message : 'Internal server error',
    details: expose && err instanceof Error ? { name: err.name, stack: err.stack?.split('\n').slice(0, 6) } : null,
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
