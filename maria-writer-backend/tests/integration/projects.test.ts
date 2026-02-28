import request from 'supertest';
import { app } from '../../src/server';
import { prisma } from '../../src/config/database';

describe('Projects API', () => {
  const testGuestId = '12345678-1234-4123-8123-123456789012';
  const otherGuestId = '87654321-4321-4321-8321-210987654321';
  let createdProjectId: string;

  const mockAppState = {
    meta: { title: 'Test Novel', author: 'Test Author', description: '', tags: [] },
    chapters: [],
    activeChapterId: null,
    characters: [],
    events: [],
    relationships: [],
    comments: {},
    timeline: { edges: [] },
    viewMode: 'write',
    context: 'writer',
    activeCodexTab: 'timeline',
    activeModal: 'none',
    editingItemId: null,
    viewingItemId: null,
  };

  afterAll(async () => {
    // Clean up test data
    if (createdProjectId) {
      await prisma.project.deleteMany({
        where: { guestId: testGuestId },
      });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({
          guestId: testGuestId,
          title: 'Test Novel',
          data: mockAppState,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'Test Novel');
      expect(response.body).toHaveProperty('isNew', true);
      
      createdProjectId = response.body.id;
    });

    it('should update existing project with same title', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({
          guestId: testGuestId,
          title: 'Test Novel',
          data: { ...mockAppState, meta: { ...mockAppState.meta, author: 'Updated Author' } },
        })
        .expect(200);

      expect(response.body).toHaveProperty('isNew', false);
    });

    it('should reject invalid data', async () => {
      await request(app)
        .post('/api/projects')
        .send({
          guestId: 'invalid-uuid',
          title: 'Test',
          data: {},
        })
        .expect(400);
    });
  });

  describe('GET /api/projects', () => {
    it('should list projects for guest', async () => {
      const response = await request(app)
        .get(`/api/projects?guestId=${testGuestId}`)
        .expect(200);

      expect(response.body).toHaveProperty('projects');
      expect(Array.isArray(response.body.projects)).toBe(true);
      expect(response.body.projects.length).toBeGreaterThan(0);
    });

    it('should require guestId parameter', async () => {
      await request(app)
        .get('/api/projects')
        .expect(400);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should get project by ID', async () => {
      const response = await request(app)
        .get(`/api/projects/${createdProjectId}?guestId=${testGuestId}`)
        .expect(200);

      expect(response.body).toHaveProperty('project');
      expect(response.body.project).toHaveProperty('id', createdProjectId);
      expect(response.body.project).toHaveProperty('data');
    });

    it('should return 404 for non-existent project', async () => {
      await request(app)
        .get(`/api/projects/00000000-0000-0000-0000-000000000000?guestId=${testGuestId}`)
        .expect(404);
    });

    it('should return 404 when accessing another guest project', async () => {
      await request(app)
        .get(`/api/projects/${createdProjectId}?guestId=${otherGuestId}`)
        .expect(404);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project', async () => {
      const updatedData = {
        ...mockAppState,
        meta: { ...mockAppState.meta, author: 'New Author' },
      };

      const response = await request(app)
        .put(`/api/projects/${createdProjectId}?guestId=${testGuestId}`)
        .send({
          title: 'Updated Title',
          data: updatedData,
        })
        .expect(200);

      expect(response.body).toHaveProperty('title', 'Updated Title');
    });

    it('should return 404 when another guest updates project', async () => {
      await request(app)
        .put(`/api/projects/${createdProjectId}?guestId=${otherGuestId}`)
        .send({
          title: 'Unauthorized Update',
          data: mockAppState,
        })
        .expect(404);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project', async () => {
      await request(app)
        .delete(`/api/projects/${createdProjectId}?guestId=${testGuestId}`)
        .expect(200);

      // Verify deletion
      await request(app)
        .get(`/api/projects/${createdProjectId}?guestId=${testGuestId}`)
        .expect(404);
    });
  });
});
