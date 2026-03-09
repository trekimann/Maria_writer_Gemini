import { Router } from 'express';
import { projectController } from '../controllers/projectController';
import { collaborationController } from '../controllers/collaborationController';
import { validate, validateParams, validateQuery } from '../middleware/validator';
import { CollaboratorParamsSchema, CreateProjectInvitationSchema, CreateProjectSchema, CreateReviewCommentSchema, ProjectIdParamsSchema, ReviewCommentParamsSchema, UpdateProjectCollaboratorSchema, UpdateProjectSchema, ProjectQuerySchema, ClaimProjectsSchema, ClaimPreviewQuerySchema } from '../utils/validation';
import { apiLimiter, inviteLimiter, writeLimiter } from '../middleware/rateLimit';
import { requireAuth, requireAuthenticated } from '../middleware/auth';
import { requireProjectAccess } from '../middleware/projectAccess';

const router = Router();

// Apply rate limiting and dual-mode auth on all project routes
router.use(apiLimiter, requireAuth);

// GET /api/projects/claim-preview?guestId=:uuid — strict auth, returns preview list for migration
router.get('/claim-preview', requireAuthenticated, validateQuery(ClaimPreviewQuerySchema), projectController.previewGuestProjects);

// POST /api/projects/claim — strict auth, transfers selected guest projects to the user account
router.post('/claim', requireAuthenticated, writeLimiter, validate(ClaimProjectsSchema), projectController.claimGuestProjects);

// GET /api/projects/shared — list projects shared with the authenticated user
router.get('/shared', requireAuthenticated, projectController.listSharedProjects);

// GET /api/projects/:id/collaborators — owner-only list of accepted collaborators
router.get('/:id/collaborators', requireAuthenticated, validateParams(ProjectIdParamsSchema), collaborationController.listCollaborators);

// PATCH /api/projects/:id/collaborators/:collaboratorId — owner-only collaborator role update
router.patch(
	'/:id/collaborators/:collaboratorId',
	requireAuthenticated,
	validateParams(CollaboratorParamsSchema),
	validate(UpdateProjectCollaboratorSchema),
	collaborationController.updateCollaborator,
);

// DELETE /api/projects/:id/collaborators/:collaboratorId — owner-only collaborator revoke
router.delete(
	'/:id/collaborators/:collaboratorId',
	requireAuthenticated,
	validateParams(CollaboratorParamsSchema),
	collaborationController.revokeCollaborator,
);

// GET /api/projects/:id/invitations — owner-only list of pending invites
router.get('/:id/invitations', requireAuthenticated, validateParams(ProjectIdParamsSchema), collaborationController.listProjectInvitations);

// POST /api/projects/:id/invitations — owner-only invite creation
router.post(
	'/:id/invitations',
	requireAuthenticated,
	inviteLimiter,
	validateParams(ProjectIdParamsSchema),
	validate(CreateProjectInvitationSchema),
	collaborationController.createInvitation,
);

// GET /api/projects/:id/review-comments — list review comments for owners/collaborators
router.get(
	'/:id/review-comments',
	requireAuthenticated,
	validateParams(ProjectIdParamsSchema),
	requireProjectAccess('READ'),
	collaborationController.listReviewComments,
);

// POST /api/projects/:id/review-comments — create review comment/suggestion
router.post(
	'/:id/review-comments',
	requireAuthenticated,
	writeLimiter,
	validateParams(ProjectIdParamsSchema),
	requireProjectAccess('COMMENT'),
	validate(CreateReviewCommentSchema),
	collaborationController.createReviewComment,
);

// POST /api/projects/:id/review-comments/:commentId/apply — owner-only apply suggestion
router.post(
	'/:id/review-comments/:commentId/apply',
	requireAuthenticated,
	writeLimiter,
	validateParams(ReviewCommentParamsSchema),
	collaborationController.applyReviewSuggestion,
);

// GET /api/projects?guestId={uuid} - List all projects for a guest
router.get('/', validateQuery(ProjectQuerySchema), projectController.listProjects);

// POST /api/projects - Create or update project
router.post('/', writeLimiter, validate(CreateProjectSchema), projectController.createOrUpdateProject);

// GET /api/projects/:id - Get specific project
router.get('/:id', validateQuery(ProjectQuerySchema), projectController.getProject);

// PUT /api/projects/:id - Update existing project
router.put('/:id', writeLimiter, validateQuery(ProjectQuerySchema), validate(UpdateProjectSchema), projectController.updateProject);

// DELETE /api/projects/:id - Delete project
router.delete('/:id', writeLimiter, validateQuery(ProjectQuerySchema), projectController.deleteProject);

export default router;
