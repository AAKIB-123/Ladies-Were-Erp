import { Request, Response, NextFunction } from 'express';
import { Customer } from '../models/Customer';
import { AppError } from '../middleware/errorHandler';

export async function getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = req.query.search as string;
    const filter: any = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await Customer.find(filter).sort({ name: 1 }).limit(100);

    res.status(200).json({
      success: true,
      count: customers.length,
      customers
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const customer = await Customer.findById(id);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    res.status(200).json({
      success: true,
      customer
    });
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, phone, address, notes } = req.body;

    const customer = await Customer.create({
      name: name.trim(),
      phone: phone?.trim(),
      address: address?.trim(),
      notes: notes?.trim(),
      outstandingBalance: 0,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, phone, address, notes, isActive } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    if (name) customer.name = name.trim();
    if (phone !== undefined) customer.phone = phone.trim();
    if (address !== undefined) customer.address = address.trim();
    if (notes !== undefined) customer.notes = notes.trim();
    if (isActive !== undefined) customer.isActive = isActive;

    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      customer
    });
  } catch (error) {
    next(error);
  }
}
