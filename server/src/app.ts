import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import authRoutes from './routes/authRoutes';
import locationRoutes from './routes/locationRoutes';
import userRoutes from './routes/userRoutes';
import productRoutes from './routes/productRoutes';
import customerRoutes from './routes/customerRoutes';
import supplierRoutes from './routes/supplierRoutes';
import saleRoutes from './routes/saleRoutes';
import purchaseRoutes from './routes/purchaseRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import expenseRoutes from './routes/expenseRoutes';
import paymentRoutes from './routes/paymentRoutes';
import returnRoutes from './routes/returnRoutes';
import reportRoutes from './routes/reportRoutes';
import auditRoutes from './routes/auditRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp(): Application {
  const app = express();

  // Security HTTP headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );

  // Body parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // General rate limiter
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes.'
    }
  });
  app.use('/api', generalLimiter);

  // Authentication rate limiter
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many login attempts. Please try again after 15 minutes.'
    }
  });
  app.use('/api/auth/login', authLimiter);

  // Health check endpoints
  app.get(['/health', '/api/health'], (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/locations', locationRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/sales', saleRoutes);
  app.use('/api/purchases', purchaseRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api', returnRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/audit-logs', auditRoutes);

  // 404 and Global Error Handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
