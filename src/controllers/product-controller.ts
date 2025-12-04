import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class ProductController {
  static async list(req: Request, res: Response) {
    const search = (req.query.search as string) || '';
    try {
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: products });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Unable to fetch products' });
    }
  }

  static async detail(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const product = await prisma.product.findFirst({
        where: { id, isActive: true },
        include: { category: true },
      });

      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      res.json({ success: true, data: product });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Unable to fetch product' });
    }
  }
}


