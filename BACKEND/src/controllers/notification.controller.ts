import { Response } from 'express';
import { notificationService } from '../services/notification.service';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';

export class NotificationController {
  // SSE endpoint for real-time notifications
  async streamNotifications(req: AuthRequest, res: Response) {
    if (!req.user) {
      return errorResponse(res, 'Not authenticated', 401);
    }

    const userId = req.user.id;
    console.log(`🔌 SSE: Client connecting - User ID: ${userId}`);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Helper function to send SSE message
    const sendSSE = (data: any) => {
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        console.error('❌ SSE: Failed to write:', error);
      }
    };

    // Send initial data before registering client
    try {
      const initialData = await notificationService.getNotifications(userId, 1, 50);
      sendSSE({
        type: 'initial_data',
        data: initialData,
        timestamp: new Date().toISOString(),
      });
      console.log(`📦 SSE: Sent initial data - ${initialData.notifications.length} notifications, ${initialData.unreadCount} unread`);
    } catch (error) {
      console.error('❌ SSE: Failed to load initial data:', error);
      sendSSE({
        type: 'error',
        message: 'Failed to load initial data',
        timestamp: new Date().toISOString(),
      });
    }

    // Register client for real-time updates (this will send connection message)
    notificationService.addClient(userId, res);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch (error) {
        clearInterval(heartbeat);
      }
    }, 30000);

    // Cleanup on disconnect
    req.on('close', () => {
      console.log(`🔌 SSE: Disconnected - User ${userId}`);
      clearInterval(heartbeat);
      notificationService.removeClient(userId, res);
    });

    req.on('error', (error) => {
      console.error('❌ SSE: Error:', error);
      clearInterval(heartbeat);
      notificationService.removeClient(userId, res);
    });
  }

  // Get notifications list
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

  // Get unread count
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

  // Mark as read
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

  // Mark all as read
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

