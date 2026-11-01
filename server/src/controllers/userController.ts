import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';

export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await User.find()
      .populate('assignedLocations', 'name code isActive')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const user = await User.findById(id).populate('assignedLocations', 'name code isActive');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, role, assignedLocations, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError(`User with email '${email}' already exists.`, 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      assignedLocations: assignedLocations || [],
      phone,
      isActive: true
    });

    const populatedUser = await User.findById(user._id).populate('assignedLocations', 'name code isActive');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: populatedUser
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, email, password, role, assignedLocations, phone, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ email, _id: { $ne: id } });
      if (existing) {
        throw new AppError(`Email '${email}' is already taken by another account.`, 409);
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (assignedLocations !== undefined) user.assignedLocations = assignedLocations;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;

    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();

    const populatedUser = await User.findById(user._id).populate('assignedLocations', 'name code isActive');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: populatedUser
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (req.user?.id === id && !isActive) {
      throw new AppError('You cannot deactivate your own account.', 400);
    }

    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    next(error);
  }
}
