import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errors.js';
import { getPool } from '../db/pool.js';

export const authRouter = Router();

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

authRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        fullName: z.string().optional(),
        preferredCity: z.enum(['Bengaluru', 'Mumbai', 'Delhi', 'Bangalore']).optional(),
      })
      .parse(req.body);
    const city =
      body.preferredCity === 'Bangalore' ? 'Bengaluru' : body.preferredCity ?? null;
    const pool = getPool();
    const result = await pool.query(
      `UPDATE profiles SET
         full_name = COALESCE($2, full_name),
         preferred_city = COALESCE($3, preferred_city),
         updated_at = now()
       WHERE id = $1
       RETURNING id, email, full_name, role, preferred_city`,
      [req.user!.id, body.fullName ?? null, city]
    );
    if (!result.rows[0]) throw new HttpError(404, 'Profile not found');
    res.json({
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        fullName: result.rows[0].full_name,
        role: result.rows[0].role,
        preferredCity: result.rows[0].preferred_city,
      },
    });
  })
);
