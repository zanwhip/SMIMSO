import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get user conversations
router.get('/conversations', (req, res) => chatController.getConversations(req, res));

// Get or create direct conversation with user
router.get('/conversations/direct/:userId', (req, res) =>
  chatController.getOrCreateDirectConversation(req, res)
);

// Create group conversation
router.post('/conversations/group', (req, res) =>
  chatController.createGroupConversation(req, res)
);

// Get conversation by ID
router.get('/conversations/:id', (req, res) => chatController.getConversation(req, res));

// Get messages for conversation
router.get('/conversations/:conversationId/messages', (req, res) =>
  chatController.getMessages(req, res)
);

// Mark conversation as read
router.post('/conversations/:conversationId/read', (req, res) =>
  chatController.markAsRead(req, res)
);

// Message reactions
router.post('/messages/:messageId/reactions', (req, res) =>
  chatController.addReaction(req, res)
);
router.delete('/messages/:messageId/reactions', (req, res) =>
  chatController.removeReaction(req, res)
);
router.get('/messages/:messageId/reactions', (req, res) =>
  chatController.getMessageReactions(req, res)
);

// Edit/Delete messages
router.patch('/messages/:messageId', (req, res) =>
  chatController.editMessage(req, res)
);
router.delete('/messages/:messageId', (req, res) =>
  chatController.deleteMessage(req, res)
);

// Online status
router.post('/status', (req, res) =>
  chatController.updateOnlineStatus(req, res)
);
router.get('/status', (req, res) =>
  chatController.getOnlineStatus(req, res)
);

// Group management
router.post('/conversations/:conversationId/members', (req, res) =>
  chatController.addGroupMember(req, res)
);
router.delete('/conversations/:conversationId/members/:userId', (req, res) =>
  chatController.removeGroupMember(req, res)
);

// Push notifications
router.post('/push/subscribe', (req, res) =>
  chatController.savePushSubscription(req, res)
);
router.delete('/push/unsubscribe', (req, res) =>
  chatController.removePushSubscription(req, res)
);

// Recommended contacts
router.get('/recommended-contacts', (req, res) =>
  chatController.getRecommendedContacts(req, res)
);

export default router;

