import { Router } from 'express';
import { collaborationController } from '../controllers/collaborationController';
import { requireAuth, requireAuthenticated } from '../middleware/auth';
import { invitationDecisionLimiter } from '../middleware/rateLimit';
import { validateParams } from '../middleware/validator';
import { InvitationTokenParamsSchema } from '../utils/validation';

const router = Router();

router.use(requireAuth, requireAuthenticated);

router.get('/', collaborationController.listPendingInvitations);
router.post(
  '/:token/accept',
  invitationDecisionLimiter,
  validateParams(InvitationTokenParamsSchema),
  collaborationController.acceptInvitation,
);
router.post(
  '/:token/decline',
  invitationDecisionLimiter,
  validateParams(InvitationTokenParamsSchema),
  collaborationController.declineInvitation,
);

export default router;