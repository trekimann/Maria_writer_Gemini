import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ShareProjectModal } from './ShareProjectModal';

vi.mock('../molecules/Modal', () => ({
  Modal: ({ isOpen, title, children, footer }: any) => isOpen ? (
    <div>
      <h1>{title}</h1>
      {children}
      <div>{footer}</div>
    </div>
  ) : null,
}));

const mockCreateInvitation = vi.fn();
const mockListProjectInvitations = vi.fn();

vi.mock('../../services/collaborationService', () => ({
  collaborationService: {
    createInvitation: mockCreateInvitation,
    listProjectInvitations: mockListProjectInvitations,
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('ShareProjectModal', () => {
  beforeEach(() => {
    mockCreateInvitation.mockReset();
    mockListProjectInvitations.mockReset();
    mockNavigate.mockReset();
  });

  it('shows a save-first notice when no project id exists', () => {
    render(
      <ShareProjectModal
        isOpen
        onClose={vi.fn()}
        projectId={null}
        projectTitle="Draft Story"
        isAuthenticated
      />,
    );

    expect(screen.getByText(/Save this project to your account first/i)).toBeInTheDocument();
  });

  it('creates an invite link and shows it', async () => {
    mockListProjectInvitations.mockResolvedValue([]);
    mockCreateInvitation.mockResolvedValue({
      invitation: {
        id: 'invite-1',
        email: 'reader@example.com',
        role: 'READ',
        createdAt: '2026-01-01T00:00:00Z',
        expiresAt: '2026-01-08T00:00:00Z',
      },
      acceptUrl: 'http://localhost:5173/invitations?token=test-token',
      delivery: 'link-only',
    });

    render(
      <ShareProjectModal
        isOpen
        onClose={vi.fn()}
        projectId="project-1"
        projectTitle="Draft Story"
        isAuthenticated
      />,
    );

    fireEvent.change(screen.getByLabelText('Invite email'), { target: { value: 'reader@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create invite' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('http://localhost:5173/invitations?token=test-token')).toBeInTheDocument();
    });
    expect(mockCreateInvitation).toHaveBeenCalledWith('project-1', { email: 'reader@example.com', role: 'READ' });
  });
});