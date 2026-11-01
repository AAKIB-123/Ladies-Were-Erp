import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env';
import { User, IUser } from '../models/User';
import { AppError } from './errorHandler';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  assignedLocations: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Missing or malformed token.', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('Authentication token missing.', 401);
    }

    const decoded = jwt.verify(token, getJwtSecret()) as { id: string };
    const user = await User.findById(decoded.id).populate('assignedLocations', 'name code isActive');

    if (!user) {
      throw new AppError('User belonging to this token no longer exists.', 401);
    }

    if (!user.isActive) {
      throw new AppError('User account has been deactivated. Please contact the administrator.', 401);
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      assignedLocations: user.assignedLocations.map((loc: any) => loc._id ? loc._id.toString() : loc.toString())
    };

    next();
  } catch (error) {
    next(error);
  }
}
