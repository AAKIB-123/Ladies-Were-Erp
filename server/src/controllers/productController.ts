import { Request, Response, NextFunction } from 'express';
import { Product, IProduct } from '../models/Product';
import { AppError } from '../middleware/errorHandler';

function sanitizeProductForStaff(product: any) {
  const p = product.toObject ? product.toObject() : { ...product };
  delete p.currentWeightedAverageCost;
  if (Array.isArray(p.variants)) {
    p.variants = p.variants.map((v: any) => {
      const { currentCost, ...rest } = v;
      return rest;
    });
  }
  return p;
}

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const includeInactive = req.query.includeInactive === 'true';

    const filter: any = {};

    if (!includeInactive) {
      filter.isActive = true;
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter).sort({ name: 1 });

    const sanitizedProducts =
      user.role === 'staff'
        ? products.map(sanitizeProductForStaff)
        : products;

    res.status(200).json({
      success: true,
      count: sanitizedProducts.length,
      products: sanitizedProducts
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const result = user.role === 'staff' ? sanitizeProductForStaff(product) : product;

    res.status(200).json({
      success: true,
      product: result
    });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      sku,
      name,
      category,
      description,
      unit,
      defaultPrice,
      currentWeightedAverageCost,
      variants
    } = req.body;

    const existing = await Product.findOne({ sku: sku.toUpperCase() });
    if (existing) {
      throw new AppError(`Product with SKU '${sku}' already exists.`, 409);
    }

    const product = await Product.create({
      sku: sku.toUpperCase(),
      name,
      category,
      description,
      unit,
      defaultPrice,
      currentWeightedAverageCost: currentWeightedAverageCost || 0,
      variants: variants || [],
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, category, description, unit, defaultPrice, isActive, variants } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (name) product.name = name;
    if (category) product.category = category;
    if (description !== undefined) product.description = description;
    if (unit) product.unit = unit;
    if (defaultPrice !== undefined) product.defaultPrice = defaultPrice;
    if (isActive !== undefined) product.isActive = isActive;
    if (variants !== undefined) product.variants = variants;

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleProductStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    product.isActive = isActive;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product ${isActive ? 'activated' : 'deactivated'} successfully`,
      product
    });
  } catch (error) {
    next(error);
  }
}
