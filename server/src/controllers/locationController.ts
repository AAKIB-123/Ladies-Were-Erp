import { Request, Response, NextFunction } from 'express';
import { Location } from '../models/Location';
import { AppError } from '../middleware/errorHandler';

export async function getLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const includeInactive = req.query.includeInactive === 'true';

    const filter: any = {};

    if (!includeInactive) {
      filter.isActive = true;
    }

    // Staff can only view their assigned locations
    if (user.role === 'staff') {
      filter._id = { $in: user.assignedLocations };
    }

    const locations = await Location.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: locations.length,
      locations
    });
  } catch (error) {
    next(error);
  }
}

export async function getLocationById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;

    const location = await Location.findById(id);
    if (!location) {
      throw new AppError('Location not found', 404);
    }

    // If staff, verify assignment
    if (user.role === 'staff' && !user.assignedLocations.includes(location._id.toString())) {
      throw new AppError('Forbidden: You are not assigned to this location.', 403);
    }

    res.status(200).json({
      success: true,
      location
    });
  } catch (error) {
    next(error);
  }
}

export async function createLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, code, address, description } = req.body;

    const existing = await Location.findOne({ code: code.toUpperCase() });
    if (existing) {
      throw new AppError(`Location with code '${code}' already exists.`, 409);
    }

    const location = await Location.create({
      name,
      code: code.toUpperCase(),
      address,
      description,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Location created successfully',
      location
    });
  } catch (error) {
    next(error);
  }
}

export async function updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, code, address, description, isActive } = req.body;

    const location = await Location.findById(id);
    if (!location) {
      throw new AppError('Location not found', 404);
    }

    if (code && code.toUpperCase() !== location.code) {
      const existing = await Location.findOne({
        code: code.toUpperCase(),
        _id: { $ne: id }
      });
      if (existing) {
        throw new AppError(`Location code '${code}' is already used by another location.`, 409);
      }
      location.code = code.toUpperCase();
    }

    if (name) location.name = name;
    if (address !== undefined) location.address = address;
    if (description !== undefined) location.description = description;
    if (isActive !== undefined) location.isActive = isActive;

    await location.save();

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      location
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleLocationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const location = await Location.findById(id);
    if (!location) {
      throw new AppError('Location not found', 404);
    }

    location.isActive = isActive;
    await location.save();

    res.status(200).json({
      success: true,
      message: `Location ${isActive ? 'activated' : 'deactivated'} successfully`,
      location
    });
  } catch (error) {
    next(error);
  }
}
