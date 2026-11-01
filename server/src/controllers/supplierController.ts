import { Request, Response, NextFunction } from 'express';
import { Supplier } from '../models/Supplier';
import { AppError } from '../middleware/errorHandler';

export async function getSuppliers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = req.query.search as string;
    const includeInactive = req.query.includeInactive === 'true';

    const filter: any = {};
    if (!includeInactive) {
      filter.isActive = true;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const suppliers = await Supplier.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: suppliers.length,
      suppliers
    });
  } catch (error) {
    next(error);
  }
}

export async function getSupplierById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    res.status(200).json({
      success: true,
      supplier
    });
  } catch (error) {
    next(error);
  }
}

export async function createSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, contactPerson, phone, email, address, notes } = req.body;

    const supplier = await Supplier.create({
      name: name.trim(),
      contactPerson: contactPerson?.trim(),
      phone: phone?.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      address: address?.trim(),
      notes: notes?.trim(),
      outstandingPayable: 0,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      supplier
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, contactPerson, phone, email, address, notes, isActive } = req.body;

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      throw new AppError('Supplier not found', 404);
    }

    if (name) supplier.name = name.trim();
    if (contactPerson !== undefined) supplier.contactPerson = contactPerson.trim();
    if (phone !== undefined) supplier.phone = phone.trim();
    if (email !== undefined) supplier.email = email ? email.trim().toLowerCase() : undefined;
    if (address !== undefined) supplier.address = address.trim();
    if (notes !== undefined) supplier.notes = notes.trim();
    if (isActive !== undefined) supplier.isActive = isActive;

    await supplier.save();

    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      supplier
    });
  } catch (error) {
    next(error);
  }
}
