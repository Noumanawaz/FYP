import { Router } from "express";
import restaurantRoutes from "./restaurant.routes";
import menuRoutes from "./menu.routes";
import categoryRoutes from "./category.routes";
import orderRoutes from "./order.routes";
import userRoutes from "./user.routes";
import mongodbRoutes from "./mongodb.routes";
import authRoutes from "./auth.routes";
import imageRoutes from "./image.routes";

const router = Router();

const apiVersion = process.env.API_VERSION || "v1";

router.use(`/${apiVersion}/auth`, authRoutes);
router.use(`/${apiVersion}/restaurants`, restaurantRoutes);
router.use(`/${apiVersion}/menu`, menuRoutes);
router.use(`/${apiVersion}/categories`, categoryRoutes);
router.use(`/${apiVersion}/orders`, orderRoutes);
router.use(`/${apiVersion}/users`, userRoutes);
router.use(`/${apiVersion}/mongodb`, mongodbRoutes);
router.use(`/${apiVersion}/images`, imageRoutes);

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     description: Check if the API is running and healthy
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 */
router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

export default router;
