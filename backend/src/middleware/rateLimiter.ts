import { NextFunction, Request, Response } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiterInstance = new RateLimiterMemory({
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10) / 1000
});

export const rateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const identifier = req.ip || 'anonymous';
    await rateLimiterInstance.consume(identifier);
    next();
  } catch (error) {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later'
    });
  }
};
