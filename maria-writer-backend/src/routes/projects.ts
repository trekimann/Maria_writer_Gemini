import { Router } from 'express';
import { projectController } from '../controllers/projectController';
import { validate, validateQuery } from '../middleware/validator';
import { CreateProjectSchema, UpdateProjectSchema, ProjectQuerySchema } from '../utils/validation';
import { apiLimiter, writeLimiter } from '../middleware/rateLimit';

const router = Router();

// Apply rate limiting
router.use(apiLimiter);

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
