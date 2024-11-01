import { Router, Request, Response } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import prisma from '../config/db';

const router = Router();

router.get('/me', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as { id: string })?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: No user info found in token' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phone: true,
        address: true,
        createdAt: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      message: 'You are authenticated',
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
