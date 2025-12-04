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

    const result = await AdminService.login(email, password);

    return res.json({
      success: true,
      data: {
        token: result.token,
        admin: result.admin,
      },
    });
  } catch (err: any) {
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
  const userId = req.user.id;
  const { name, description, price, image, stock, categoryName, isActive = true } = req.body;

  if (!name || !price || !image) {
    return res.status(400).json({ success: false, message: 'Name, price, and image required' });
  }

  try {
    const category = await ensureCategory(categoryName);
    let slug = slugify(name) || `product-${Date.now()}`;
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price: new Prisma.Decimal(price),
        image,
        stock: stock ?? 0,
        isActive,
        categoryId: category.id,
        createdById: userId,
      },
      include: { category: true },
    });

    return res.status(201).json({ success: true, data: product });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Failed to create product' });
  }
};

const updateProduct = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const updates: any = { ...req.body };
  if (updates.price) updates.price = new Prisma.Decimal(updates.price);
  if (updates.categoryName) {
    const category = await ensureCategory(updates.categoryName);
    updates.categoryId = category.id;
    delete updates.categoryName;
  }

  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: updates,
      include: { category: true },
    });
    return res.json({ success: true, data: product });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Failed to update product' });
  }
};

const deleteProduct = async (req: Request, res: Response) => {
  const { productId } = req.params;
  try {
    await prisma.product.delete({ where: { id: productId } });
    return res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Failed to delete product' });
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