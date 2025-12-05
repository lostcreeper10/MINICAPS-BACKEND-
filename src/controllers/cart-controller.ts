import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export class CartController {
  // Get user's cart
  static async get(req: Request, res: Response) {
    const userId = req.user!.id;

    try {
      let cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: { category: true },
              },
            },
          },
        },
      });

      // Create cart if it doesn't exist
      if (!cart) {
        cart = await prisma.cart.create({
          data: { userId },
          include: {
            items: {
              include: {
                product: {
                  include: { category: true },
                },
              },
            },
          },
        });
      }

      // Calculate total
      const total = cart.items.reduce((sum, item) => {
        return sum.plus(item.product.price.mul(item.quantity));
      }, new Prisma.Decimal(0));

      return res.json({
        success: true,
        data: {
          ...cart,
          total: total.toString(),
        },
      });
    } catch (err: any) {
      console.error('[Get Cart] Error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch cart',
      });
    }
  }

  // Add item to cart
  static async addItem(req: Request, res: Response) {
    const userId = req.user!.id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be greater than 0' });
    }

    try {
      // Verify product exists and is active
      const product = await prisma.product.findFirst({
        where: { id: productId, isActive: true },
      });

      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // Check stock availability
      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} items available in stock`,
        });
      }

      // Get or create cart
      let cart = await prisma.cart.findUnique({ where: { userId } });
      if (!cart) {
        cart = await prisma.cart.create({ data: { userId } });
      }

      // Check if item already exists in cart
      const existingItem = await prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      });

      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + quantity;
        if (product.stock < newQuantity) {
          return res.status(400).json({
            success: false,
            message: `Cannot add more items. Only ${product.stock} available in stock`,
          });
        }

        const updatedItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
          include: {
            product: {
              include: { category: true },
            },
          },
        });

        return res.json({
          success: true,
          data: updatedItem,
          message: 'Cart updated',
        });
      } else {
        // Create new cart item
        const newItem = await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity,
          },
          include: {
            product: {
              include: { category: true },
            },
          },
        });

        return res.status(201).json({
          success: true,
          data: newItem,
          message: 'Item added to cart',
        });
      }
    } catch (err: any) {
      console.error('[Add Cart Item] Error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to add item to cart',
      });
    }
  }

  // Update cart item quantity
  static async updateItem(req: Request, res: Response) {
    const userId = req.user!.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Valid quantity is required' });
    }

    try {
      // Verify cart item belongs to user
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          id: itemId,
          cart: { userId },
        },
        include: { product: true },
      });

      if (!cartItem) {
        return res.status(404).json({ success: false, message: 'Cart item not found' });
      }

      // Check stock availability
      if (cartItem.product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${cartItem.product.stock} items available in stock`,
        });
      }

      const updatedItem = await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
        include: {
          product: {
            include: { category: true },
          },
        },
      });

      return res.json({
        success: true,
        data: updatedItem,
        message: 'Cart item updated',
      });
    } catch (err: any) {
      console.error('[Update Cart Item] Error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to update cart item',
      });
    }
  }

  // Remove item from cart
  static async removeItem(req: Request, res: Response) {
    const userId = req.user!.id;
    const { itemId } = req.params;

    try {
      // Verify cart item belongs to user
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          id: itemId,
          cart: { userId },
        },
      });

      if (!cartItem) {
        return res.status(404).json({ success: false, message: 'Cart item not found' });
      }

      await prisma.cartItem.delete({
        where: { id: itemId },
      });

      return res.json({
        success: true,
        message: 'Item removed from cart',
      });
    } catch (err: any) {
      console.error('[Remove Cart Item] Error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to remove item from cart',
      });
    }
  }

  // Clear entire cart
  static async clear(req: Request, res: Response) {
    const userId = req.user!.id;

    try {
      const cart = await prisma.cart.findUnique({ where: { userId } });
      if (!cart) {
        return res.json({ success: true, message: 'Cart is already empty' });
      }

      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return res.json({
        success: true,
        message: 'Cart cleared',
      });
    } catch (err: any) {
      console.error('[Clear Cart] Error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to clear cart',
      });
    }
  }
}

