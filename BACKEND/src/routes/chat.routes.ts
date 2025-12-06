import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/conversations', (req, res) => chatController.getConversations(req, res));

router.get('/conversations/direct/:userId', (req, res) =>
  chatController.getOrCreateDirectConversation(req, res)
);

router.post('/conversations/group', (req, res) =>
  chatController.createGroupConversation(req, res)
);

router.get('/conversations/:id', (req, res) => chatController.getConversation(req, res));

router.get('/conversations/:conversationId/messages', (req, res) =>
  chatController.getMessages(req, res)
);

router.post('/conversations/:conversationId/read', (req, res) =>
  chatController.markAsRead(req, res)
);

router.post('/messages/:messageId/reactions', (req, res) =>
  chatController.addReaction(req, res)
);
router.delete('/messages/:messageId/reactions', (req, res) =>
  chatController.removeReaction(req, res)
);
router.get('/messages/:messageId/reactions', (req, res) =>
  chatController.getMessageReactions(req, res)
);

router.patch('/messages/:messageId', (req, res) =>
  chatController.editMessage(req, res)
);
router.delete('/messages/:messageId', (req, res) =>
  chatController.deleteMessage(req, res)
);

router.post('/status', (req, res) =>
  chatController.updateOnlineStatus(req, res)
);
router.get('/status', (req, res) =>
  chatController.getOnlineStatus(req, res)
);

router.post('/conversations/:conversationId/members', (req, res) =>
  chatController.addGroupMember(req, res)
);
router.delete('/conversations/:conversationId/members/:userId', (req, res) =>
  chatController.removeGroupMember(req, res)
);

router.post('/push/subscribe', (req, res) =>
  chatController.savePushSubscription(req, res)
);
router.delete('/push/unsubscribe', (req, res) =>
  chatController.removePushSubscription(req, res)
);

router.get('/recommended-contacts', (req, res) =>
  chatController.getRecommendedContacts(req, res)
);

export default router;

