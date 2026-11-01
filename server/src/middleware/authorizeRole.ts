import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export function authorizeRole(roles: ('admin' | 'staff')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Access restricted. Requires one of [${roles.join(', ')}] role.`,
          403
        )
      );
    }

    next();
  };
}
