import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Request validation middleware
 */
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      logger.warn('Request validation failed', {
        path: req.path,
        errors: error.errors
      });
      
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors || error.message
      });
    }
  };
};

/**
 * Sanitize user input to prevent injection attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    sanitizeObject(req.body);
  }
  next();
};

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Remove potential script tags and dangerous characters
      obj[key] = obj[key]
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

/**
 * Check if user owns the resource
 */
export const authorizeResource = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.userId;
  const resourceUserId = req.body.userId || req.params.userId;

  if (!userId || userId !== resourceUserId) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this resource'
    });
  }

  next();
};
