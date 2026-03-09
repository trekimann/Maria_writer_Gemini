import { authApiService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || '';

export type CollaborationRole = 'READ' | 'COMMENT' | 'EDIT';

export interface SharedProjectOwner {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
}

export interface SharedProjectSummary {
  id: string;
  title: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  owner: SharedProjectOwner;
  collaborator: {
    id: string;
    role: CollaborationRole;
    acceptedAt: string;
  };
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: CollaborationRole;
  token: string;
  createdAt: string;
  expiresAt: string;
  project: {
    id: string;
    title: string;
    owner: SharedProjectOwner;
  };
}

export interface ProjectInvitationSummary {
  id: string;
  email: string;
  role: CollaborationRole;
  createdAt: string;
  expiresAt: string;
}

export interface CreatedInvitation {
  invitation: ProjectInvitationSummary;
  acceptUrl: string;
  delivery: 'link-only';
}

export interface AcceptedInvitation {
  collaboratorId: string;
  role: CollaborationRole;
  project: {
    id: string;
    title: string;
    owner: SharedProjectOwner;
  };
}

export type ReviewCommentStatus = 'ACTIVE' | 'RESOLVED' | 'HIDDEN';

export interface ProjectReviewComment {
  id: string;
  projectId: string;
  chapterId: string;
  text: string;
  isSuggestion: boolean;
  replacementText: string | null;
  originalText: string;
  startOffset: number | null;
  endOffset: number | null;
  status: ReviewCommentStatus;
  createdAt: string;
  updatedAt: string;
  author: SharedProjectOwner;
}

export interface ApplyReviewSuggestionResult {
  success: true;
  commentId: string;
  chapterId: string;
  content: string;
  status: ReviewCommentStatus;
}

async function parseJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data as { error?: string }).error || fallbackMessage);
  }

  return data as T;
}

class CollaborationService {
  async listSharedProjects(): Promise<SharedProjectSummary[]> {
    const response = await authApiService.fetchWithAuth(`${API_URL}/api/projects/shared`);
    const data = await parseJson<{ projects: Array<SharedProjectSummary & { collaborators?: Array<{ id: string; role: CollaborationRole; acceptedAt: string }> }> }>(
      response,
      'Failed to load shared projects',
    );

    return data.projects.map((project) => ({
      ...project,
      collaborator: project.collaborators?.[0] ?? {
        id: '',
        role: 'READ',
        acceptedAt: project.updatedAt,
      },
    }));
  }

  async listPendingInvitations(): Promise<PendingInvitation[]> {
    const response = await authApiService.fetchWithAuth(`${API_URL}/api/invitations`);
    const data = await parseJson<{ invitations: PendingInvitation[] }>(response, 'Failed to load invitations');
    return data.invitations;
  }

  async acceptInvitation(token: string): Promise<AcceptedInvitation> {
    const response = await authApiService.fetchWithAuth(`${API_URL}/api/invitations/${token}/accept`, {
      method: 'POST',
    });
    return parseJson<AcceptedInvitation>(response, 'Failed to accept invitation');
  }

  async declineInvitation(token: string): Promise<{ success: true }> {
    const response = await authApiService.fetchWithAuth(`${API_URL}/api/invitations/${token}/decline`, {
      method: 'POST',
    });
    return parseJson<{ success: true }>(response, 'Failed to decline invitation');
  }

  async listProjectInvitations(projectId: string): Promise<ProjectInvitationSummary[]> {
    const response = await authApiService.fetchWithAuth(`${API_URL}/api/projects/${projectId}/invitations`);
    const data = await parseJson<{ invitations: ProjectInvitationSummary[] }>(response, 'Failed to load project invitations');
    return data.invitations;
  }

  async createInvitation(projectId: string, payload: { email: string; role: CollaborationRole }): Promise<CreatedInvitation> {
    const response = await authApiService.fetchWithAuth(`${API_URL}/api/projects/${projectId}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseJson<CreatedInvitation>(response, 'Failed to create invitation');
  }

  async listReviewComments(projectId: string): Promise<ProjectReviewComment[]> {
    const response = await authApiService.fetchWithAuth(`${API_URL}/api/projects/${projectId}/review-comments`);
    const data = await parseJson<{ comments: ProjectReviewComment[] }>(response, 'Failed to load review comments');
    return data.comments;
  }

  async createReviewComment(projectId: string, payload: {
    chapterId: string;
    text: string;
    isSuggestion: boolean;
    replacementText?: string;
    originalText: string;
    startOffset?: number | null;
    endOffset?: number | null;
  }): Promise<ProjectReviewComment> {
    const response = await authApiService.fetchWithAuth(`${API_URL}/api/projects/${projectId}/review-comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await parseJson<{ comment: ProjectReviewComment }>(response, 'Failed to create review comment');
    return data.comment;
  }

  async applyReviewSuggestion(projectId: string, commentId: string): Promise<ApplyReviewSuggestionResult> {
    const response = await authApiService.fetchWithAuth(`${API_URL}/api/projects/${projectId}/review-comments/${commentId}/apply`, {
      method: 'POST',
    });
    return parseJson<ApplyReviewSuggestionResult>(response, 'Failed to apply suggestion');
  }
}

export const collaborationService = new CollaborationService();