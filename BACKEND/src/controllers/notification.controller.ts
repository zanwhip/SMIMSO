import { Response } from 'express';
import { notificationService } from '../services/notification.service';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';

export class NotificationController {
  async streamNotifications(req: AuthRequest, res: Response) {
    if (!req.user) {
      return errorResponse(res, 'Not authenticated', 401);
    }

    const userId = req.user.id;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const sendSSE = (data: any) => {
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        }
    };

    try {
      const initialData = await notificationService.getNotifications(userId, 1, 50);
      sendSSE({
        type: 'initial_data',
        data: initialData,
        timestamp: new Date().toISOString(),
      });
      } catch (error) {
      sendSSE({
        type: 'error',
        message: 'Failed to load initial data',
        timestamp: new Date().toISOString(),
      });
    }

    notificationService.addClient(userId, res);

    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch (error) {
        clearInterval(heartbeat);
      }
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      notificationService.removeClient(userId, res);
    });

    req.on('error', (error) => {
      clearInterval(heartbeat);
      notificationService.removeClient(userId, res);
    });
  }

  async getNotifications(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await notificationService.getNotifications(req.user.id, page, limit);

      return successResponse(res, result);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const count = await notificationService.getUnreadCount(req.user.id);

      return successResponse(res, { count });
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  async markAsRead(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { id } = req.params;

      await notificationService.markAsRead(id, req.user.id);

      return successResponse(res, null, 'Notification marked as read');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      await notificationService.markAllAsRead(req.user.id);

      return successResponse(res, null, 'All notifications marked as read');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }
}

