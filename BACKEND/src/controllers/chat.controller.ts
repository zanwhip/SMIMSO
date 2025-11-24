import { Response } from 'express';
import { AuthRequest } from '../types';
import { chatService } from '../services/chat.service';
import { pushNotificationService } from '../services/push-notification.service';
import { successResponse, errorResponse } from '../utils/response';

export class ChatController {
  // Get user conversations
  async getConversations(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const conversations = await chatService.getUserConversations(req.user.id);
      return successResponse(res, conversations);
    } catch (error: any) {
      console.error('Error getting conversations:', error);
      return errorResponse(res, error.message || 'Failed to get conversations', 500);
    }
  }

  // Get or create direct conversation
  async getOrCreateDirectConversation(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { userId } = req.params;
      if (!userId) {
        return errorResponse(res, 'User ID is required', 400);
      }

      const conversation = await chatService.getOrCreateDirectConversation(req.user.id, userId);
      return successResponse(res, conversation);
    } catch (error: any) {
      console.error('Error getting/creating conversation:', error);
      return errorResponse(res, error.message || 'Failed to get/create conversation', 500);
    }
  }

  // Create group conversation
  async createGroupConversation(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { name, participantIds } = req.body;
      if (!name || !participantIds || !Array.isArray(participantIds)) {
        return errorResponse(res, 'Name and participantIds are required', 400);
      }

      const conversation = await chatService.createGroupConversation(
        name,
        req.user.id,
        participantIds
      );
      return successResponse(res, conversation);
    } catch (error: any) {
      console.error('Error creating group conversation:', error);
      return errorResponse(res, error.message || 'Failed to create group conversation', 500);
    }
  }

  // Get conversation by ID
  async getConversation(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { id } = req.params;
      const conversation = await chatService.getConversationById(id, req.user.id);
      return successResponse(res, conversation);
    } catch (error: any) {
      console.error('Error getting conversation:', error);
      return errorResponse(res, error.message || 'Failed to get conversation', 500);
    }
  }

  // Get messages for conversation
  async getMessages(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { conversationId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const messages = await chatService.getConversationMessages(
        conversationId,
        req.user.id,
        page,
        limit
      );
      return successResponse(res, messages);
    } catch (error: any) {
      console.error('Error getting messages:', error);
      return errorResponse(res, error.message || 'Failed to get messages', 500);
    }
  }

  // Mark conversation as read
  async markAsRead(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { conversationId } = req.params;
      await chatService.markAsRead(conversationId, req.user.id);
      return successResponse(res, { message: 'Marked as read' });
    } catch (error: any) {
      console.error('Error marking as read:', error);
      return errorResponse(res, error.message || 'Failed to mark as read', 500);
    }
  }

  // Add reaction to message
  async addReaction(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { messageId } = req.params;
      const { emoji } = req.body;

      if (!emoji) {
        return errorResponse(res, 'Emoji is required', 400);
      }

      await chatService.addReaction(messageId, req.user.id, emoji);
      return successResponse(res, { message: 'Reaction added' });
    } catch (error: any) {
      console.error('Error adding reaction:', error);
      return errorResponse(res, error.message || 'Failed to add reaction', 500);
    }
  }

  // Remove reaction from message
  async removeReaction(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { messageId } = req.params;
      const { emoji } = req.body;

      if (!emoji) {
        return errorResponse(res, 'Emoji is required', 400);
      }

      await chatService.removeReaction(messageId, req.user.id, emoji);
      return successResponse(res, { message: 'Reaction removed' });
    } catch (error: any) {
      console.error('Error removing reaction:', error);
      return errorResponse(res, error.message || 'Failed to remove reaction', 500);
    }
  }

  // Get message reactions
  async getMessageReactions(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { messageId } = req.params;
      const reactions = await chatService.getMessageReactions(messageId);
      return successResponse(res, reactions);
    } catch (error: any) {
      console.error('Error getting reactions:', error);
      return errorResponse(res, error.message || 'Failed to get reactions', 500);
    }
  }

  // Edit message
  async editMessage(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { messageId } = req.params;
      const { content } = req.body;

      if (!content) {
        return errorResponse(res, 'Content is required', 400);
      }

      const message = await chatService.editMessage(messageId, req.user.id, content);
      return successResponse(res, message);
    } catch (error: any) {
      console.error('Error editing message:', error);
      return errorResponse(res, error.message || 'Failed to edit message', 500);
    }
  }

  // Delete message
  async deleteMessage(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { messageId } = req.params;
      await chatService.deleteMessage(messageId, req.user.id);
      return successResponse(res, { message: 'Message deleted' });
    } catch (error: any) {
      console.error('Error deleting message:', error);
      return errorResponse(res, error.message || 'Failed to delete message', 500);
    }
  }

  // Update online status
  async updateOnlineStatus(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { isOnline } = req.body;
      await chatService.updateOnlineStatus(req.user.id, isOnline);
      return successResponse(res, { message: 'Status updated' });
    } catch (error: any) {
      console.error('Error updating status:', error);
      return errorResponse(res, error.message || 'Failed to update status', 500);
    }
  }

  // Get online status
  async getOnlineStatus(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { userIds } = req.query;
      if (!userIds || typeof userIds !== 'string') {
        return errorResponse(res, 'User IDs are required', 400);
      }

      const ids = userIds.split(',');
      const statusMap = await chatService.getOnlineStatus(ids);
      return successResponse(res, Object.fromEntries(statusMap));
    } catch (error: any) {
      console.error('Error getting status:', error);
      return errorResponse(res, error.message || 'Failed to get status', 500);
    }
  }

  // Add member to group
  async addGroupMember(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { conversationId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return errorResponse(res, 'User ID is required', 400);
      }

      await chatService.addGroupMember(conversationId, userId, req.user.id);
      return successResponse(res, { message: 'Member added' });
    } catch (error: any) {
      console.error('Error adding member:', error);
      return errorResponse(res, error.message || 'Failed to add member', 500);
    }
  }

  // Remove member from group
  async removeGroupMember(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { conversationId, userId } = req.params;
      await chatService.removeGroupMember(conversationId, userId, req.user.id);
      return successResponse(res, { message: 'Member removed' });
    } catch (error: any) {
      console.error('Error removing member:', error);
      return errorResponse(res, error.message || 'Failed to remove member', 500);
    }
  }

  // Save push subscription
  async savePushSubscription(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { subscription } = req.body;
      if (!subscription) {
        return errorResponse(res, 'Subscription is required', 400);
      }

      await pushNotificationService.saveSubscription(req.user.id, subscription);
      return successResponse(res, { message: 'Subscription saved' });
    } catch (error: any) {
      console.error('Error saving subscription:', error);
      return errorResponse(res, error.message || 'Failed to save subscription', 500);
    }
  }

  // Remove push subscription
  async removePushSubscription(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      await pushNotificationService.removeSubscription(req.user.id);
      return successResponse(res, { message: 'Subscription removed' });
    } catch (error: any) {
      console.error('Error removing subscription:', error);
      return errorResponse(res, error.message || 'Failed to remove subscription', 500);
    }
  }

  // Get recommended contacts
  async getRecommendedContacts(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const contacts = await chatService.getRecommendedContacts(req.user.id, limit);
      return successResponse(res, contacts);
    } catch (error: any) {
      console.error('Error getting recommended contacts:', error);
      return errorResponse(res, error.message || 'Failed to get recommended contacts', 500);
    }
  }
}

export const chatController = new ChatController();

