// src/controllers/admin-controller.ts
import { Request, Response } from 'express';
import { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AdminService } from '../services/admin-service';
import { slugify } from '../utils/slugify';

const defaultCategorySlug = 'general';

async function ensureCategory(name?: string) {
  const categoryName = name?.trim() || 'General';
  const slug = slugify(categoryName) || defaultCategorySlug;
  return prisma.category.upsert({
    where: { slug },
    update: { name: categoryName },
    create: { name: categoryName, slug },
  });
}

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    console.log(`[Admin Login] Attempting login for: ${email}`);
    const result = await AdminService.login(email, password);
    console.log(`[Admin Login] Success for: ${email}`);

    return res.json({
      success: true,
      data: {
        token: result.token,
        admin: result.admin,
      },
    });
  } catch (err: any) {
    console.error(`[Admin Login] Error:`, err.message);
    return res.status(401).json({
      success: false,
      message: err.message || 'Invalid credentials',
    });
  }
};

const me = async (req: any, res: Response) => {
  return res.json({ success: true, data: req.user });
};

const overview = async (_req: Request, res: Response) => {
  try {
    const [productCount, orderCount, userCount, pendingOrders] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.order.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
    ]);

    return res.json({
      success: true,
      data: { productCount, orderCount, userCount, pendingOrders },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load overview' });
  }
};

const listAdmins = async (_req: Request, res: Response) => {
  const admins = await prisma.admin.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ success: true, data: admins });
};

const listProducts = async (_req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ success: true, data: products });
};

const createProduct = async (req: any, res: Response) => {
  const { name, description, price, image, stock, categoryName, isActive = true } = req.body;

  if (!name || !price || !image) {
    return res.status(400).json({ success: false, message: 'Name, price, and image are required' });
  }

  try {
    const category = await ensureCategory(categoryName);
    let slug = slugify(name) || `product-${Date.now()}`;
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    // Note: createdById references User table, but admins are in Admin table
    // Since createdById is optional, we set it to null for admin-created products
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || null,
        price: new Prisma.Decimal(price),
        image,
        stock: stock ?? 0,
        isActive,
        categoryId: category.id,
        createdById: null, // Admin-created products don't have a user creator
      },
      include: { category: true },
    });

    console.log(`[Create Product] Product created: ${product.name} by admin`);
    return res.status(201).json({ success: true, data: product });
  } catch (err: any) {
    console.error('[Create Product] Error:', err);
    return res.status(400).json({ 
      success: false, 
      message: err.message || 'Failed to create product' 
    });
  }
};

const updateProduct = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { name, description, price, image, stock, categoryName, isActive } = req.body;

  try {
    // Build update data object with only provided fields
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = new Prisma.Decimal(price);
    if (image !== undefined) updateData.image = image;
    if (stock !== undefined) updateData.stock = stock;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Handle category
    if (categoryName !== undefined) {
      const category = await ensureCategory(categoryName);
      updateData.categoryId = category.id;
    }

    // Generate slug if name is being updated
    if (name !== undefined) {
      let slug = slugify(name) || `product-${Date.now()}`;
      const existing = await prisma.product.findFirst({ 
        where: { slug, id: { not: productId } } 
      });
      if (existing) slug = `${slug}-${Date.now()}`;
      updateData.slug = slug;
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: { category: true },
    });
    
    return res.json({ success: true, data: product });
  } catch (err: any) {
    console.error('[Update Product] Error:', err);
    return res.status(400).json({ 
      success: false, 
      message: err.message || 'Failed to update product' 
    });
  }
};

const deleteProduct = async (req: Request, res: Response) => {
  const { productId } = req.params;
  try {
    await prisma.product.delete({ where: { id: productId } });
    console.log(`[Delete Product] Product deleted: ${productId}`);
    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err: any) {
    console.error('[Delete Product] Error:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    return res.status(400).json({ 
      success: false, 
      message: err.message || 'Failed to delete product' 
    });
  }
};

const listOrders = async (_req: Request, res: Response) => {
  const orders = await prisma.order.findMany({
    include: { items: true, user: true },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ success: true, data: orders });
};

const updateOrderStatus = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status, trackingNumber } = req.body;

  if (!status || !Object.values(OrderStatus).includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status, trackingNumber, statusUpdatedAt: new Date() },
      include: { items: true, user: true },
    });
    return res.json({ success: true, data: order });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Failed to update order' });
  }
};

const listBuyers = async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ success: true, data: users });
};

const toggleBlock = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { isBlocked, reason } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isBlocked, blockedReason: reason },
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Failed to update user' });
  }
};

export default {
  login,
  me,
  overview,
  listAdmins,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  listOrders,
  updateOrderStatus,
  listBuyers,
  toggleBlock,
};