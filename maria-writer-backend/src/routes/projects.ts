import { Router } from 'express';
import { projectController } from '../controllers/projectController';
import { validate, validateQuery } from '../middleware/validator';
import { CreateProjectSchema, UpdateProjectSchema, ProjectQuerySchema, ClaimProjectsSchema, ClaimPreviewQuerySchema } from '../utils/validation';
import { apiLimiter, writeLimiter } from '../middleware/rateLimit';
import { requireAuth, requireAuthenticated } from '../middleware/auth';

const router = Router();

// Apply rate limiting and dual-mode auth on all project routes
router.use(apiLimiter, requireAuth);

// GET /api/projects/claim-preview?guestId=:uuid — strict auth, returns preview list for migration
router.get('/claim-preview', requireAuthenticated, validateQuery(ClaimPreviewQuerySchema), projectController.previewGuestProjects);

// POST /api/projects/claim — strict auth, transfers selected guest projects to the user account
router.post('/claim', requireAuthenticated, writeLimiter, validate(ClaimProjectsSchema), projectController.claimGuestProjects);

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
