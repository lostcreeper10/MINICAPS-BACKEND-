import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { UserRepository } from '../repositories/user-repository';

export class OrderController {
  static async list(req: Request, res: Response) {
    const userId = req.user!.id;
    try {
      const orders = await prisma.order.findMany({
        where: { userId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: orders });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Unable to fetch orders' });
    }
  }

  static async detail(req: Request, res: Response) {
    const userId = req.user!.id;
    const { orderId } = req.params;

    try {
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        include: { items: true },
      });

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      res.json({ success: true, data: order });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Unable to fetch order' });
    }
  }

  static async create(req: Request, res: Response) {
    const userId = req.user!.id;
    const { items, shippingName, shippingPhone, shippingAddress } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ success: false, message: 'Order items are required' });
    }
    if (!shippingName || !shippingPhone || !shippingAddress) {
      return res.status(400).json({ success: false, message: 'Shipping details are required' });
    }

    try {
      const user = await UserRepository.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      if (user.isBlocked) {
        return res.status(403).json({ success: false, message: 'Account is blocked' });
      }

      const productIds = items.map((item: any) => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
      });

      if (products.length !== productIds.length) {
        return res.status(400).json({ success: false, message: 'Some products are unavailable' });
      }

      const orderItems = items.map((item: any) => {
        const product = products.find((p) => p.id === item.productId)!;
        if (item.quantity <= 0) {
          throw new Error('Invalid quantity');
        }
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
        return {
          productId: product.id,
          name: product.name,
          image: product.image,
          price: product.price,
          quantity: item.quantity,
        };
      });

      const totalAmount = orderItems.reduce(
        (sum, item) => sum.plus(item.price.mul(item.quantity)),
        new Prisma.Decimal(0)
      );

      const order = await prisma.$transaction(async (tx) => {
        for (const item of orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        return tx.order.create({
          data: {
            userId,
            totalAmount,
            shippingName,
            shippingPhone,
            shippingAddress,
            items: { create: orderItems },
          },
          include: { items: true },
        });
      });

      res.status(201).json({ success: true, data: order });
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ success: false, message: err.message || 'Unable to place order' });
    }
  }
}


