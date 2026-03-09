import request from 'supertest';
import { app } from '../../src/server';
import { prisma } from '../../src/config/database';

describe('Collaboration API', () => {
  const prismaCollab = prisma as typeof prisma & {
    projectReviewComment: { deleteMany: (...args: any[]) => Promise<any> };
    projectInvitation: { deleteMany: (...args: any[]) => Promise<any> };
    projectCollaborator: { deleteMany: (...args: any[]) => Promise<any> };
  };

  const suffix = `${Date.now()}`;
  const owner = {
    email: `owner.${suffix}@example.com`,
    username: `owner_${suffix}`,
    password: 'OwnerPass1!',
    displayName: 'Owner Test',
  };
  const collaborator = {
    email: `reader.${suffix}@example.com`,
    username: `reader_${suffix}`,
    password: 'ReaderPass1!',
    displayName: 'Reader Test',
  };

  const mockAppState = {
    meta: { title: 'Shared Test Novel', author: 'Owner Test', description: '', tags: [] },
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

  let ownerId: string;
  let collaboratorId: string;
  let ownerToken: string;
  let collaboratorToken: string;
  let projectId: string;
  let invitationToken: string;
  let collaboratorRecordId: string;

  afterAll(async () => {
    if (projectId) {
      await prismaCollab.projectReviewComment.deleteMany({ where: { projectId } });
      await prismaCollab.projectInvitation.deleteMany({ where: { projectId } });
      await prismaCollab.projectCollaborator.deleteMany({ where: { projectId } });
      await prisma.project.deleteMany({ where: { id: projectId } });
    }

    const userIds = [ownerId, collaboratorId].filter(Boolean) as string[];
    if (userIds.length > 0) {
      await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

    await prisma.$disconnect();
  });

  it('registers owner and collaborator accounts', async () => {
    const ownerResponse = await request(app).post('/api/auth/register').send(owner).expect(201);
    ownerId = ownerResponse.body.user.id;
    ownerToken = ownerResponse.body.accessToken;

    const collaboratorResponse = await request(app).post('/api/auth/register').send(collaborator).expect(201);
    collaboratorId = collaboratorResponse.body.user.id;
    collaboratorToken = collaboratorResponse.body.accessToken;

    expect(ownerToken).toBeTruthy();
    expect(collaboratorToken).toBeTruthy();
  });

  it('creates a shareable owner project', async () => {
    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Shared Test Novel', data: mockAppState })
      .expect(201);

    projectId = response.body.id;
    expect(projectId).toBeTruthy();
  });

  it('creates an invitation, exposes it to the invitee, accepts it, and allows shared reads', async () => {
    const createInviteResponse = await request(app)
      .post(`/api/projects/${projectId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: collaborator.email, role: 'READ' })
      .expect(201);

    expect(createInviteResponse.body.invitation.email).toBe(collaborator.email);
    expect(createInviteResponse.body.delivery).toBe('link-only');

    const pendingInvitesResponse = await request(app)
      .get('/api/invitations')
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(200);

    expect(pendingInvitesResponse.body.invitations).toHaveLength(1);
    invitationToken = pendingInvitesResponse.body.invitations[0].token;

    const acceptResponse = await request(app)
      .post(`/api/invitations/${invitationToken}/accept`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(200);

    collaboratorRecordId = acceptResponse.body.collaboratorId;
    expect(acceptResponse.body.role).toBe('READ');

    const sharedProjectsResponse = await request(app)
      .get('/api/projects/shared')
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(200);

    expect(sharedProjectsResponse.body.projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: projectId, title: 'Shared Test Novel' }),
      ]),
    );

    const loadSharedResponse = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(200);

    expect(loadSharedResponse.body.project).toEqual(expect.objectContaining({
      id: projectId,
      access: expect.objectContaining({ role: 'READ', canRead: true, canComment: false, canEditProject: false }),
    }));
  });

  it('keeps project blob writes owner-only for collaborators', async () => {
    await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .send({ title: 'Unauthorized edit', data: mockAppState })
      .expect(404);
  });

  it('lets the owner promote and revoke collaborator access', async () => {
    const updateResponse = await request(app)
      .patch(`/api/projects/${projectId}/collaborators/${collaboratorRecordId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'COMMENT' })
      .expect(200);

    expect(updateResponse.body.collaborator.role).toBe('COMMENT');

    await request(app)
      .delete(`/api/projects/${projectId}/collaborators/${collaboratorRecordId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(404);
  });
});
