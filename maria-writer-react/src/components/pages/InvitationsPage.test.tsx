import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { InvitationsPage } from './InvitationsPage';

const mockListPendingInvitations = vi.fn();
const mockAcceptInvitation = vi.fn();
const mockDeclineInvitation = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../services/collaborationService', () => ({
  collaborationService: {
    listPendingInvitations: mockListPendingInvitations,
    acceptInvitation: mockAcceptInvitation,
    declineInvitation: mockDeclineInvitation,
  },
}));

vi.mock('../templates/AppPageLayout', () => ({
  AppPageLayout: ({ children, headerActions }: any) => <div>{headerActions}{children}</div>,
}));

vi.mock('../atoms/HelpButton', () => ({
  HelpButton: () => <button>Help</button>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('InvitationsPage', () => {
  beforeEach(() => {
    mockListPendingInvitations.mockReset();
    mockAcceptInvitation.mockReset();
    mockDeclineInvitation.mockReset();
    mockNavigate.mockReset();
  });

  it('lists pending invitations', async () => {
    mockListPendingInvitations.mockResolvedValue([
      {
        id: 'invite-1',
        email: 'reader@example.com',
        role: 'READ',
        token: 'token-1',
        createdAt: '2026-01-01',
        expiresAt: '2026-01-08',
        project: {
          id: 'project-1',
          title: 'Shared Story',
          owner: { id: 'u1', email: 'owner@example.com', username: 'owner', displayName: 'Owner' },
        },
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/invitations']}>
        <Routes>
          <Route path="/invitations" element={<InvitationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Shared Story')).toBeInTheDocument();
    });
    expect(screen.getByText('From Owner')).toBeInTheDocument();
  });

  it('accepts an invitation and shows a success banner', async () => {
    mockListPendingInvitations.mockResolvedValue([
      {
        id: 'invite-1',
        email: 'reader@example.com',
        role: 'READ',
        token: 'token-1',
        createdAt: '2026-01-01',
        expiresAt: '2026-01-08',
        project: {
          id: 'project-1',
          title: 'Shared Story',
          owner: { id: 'u1', email: 'owner@example.com', username: 'owner', displayName: 'Owner' },
        },
      },
    ]);
    mockAcceptInvitation.mockResolvedValue({
      collaboratorId: 'c1',
      role: 'READ',
      project: {
        id: 'project-1',
        title: 'Shared Story',
        owner: { id: 'u1', email: 'owner@example.com', username: 'owner', displayName: 'Owner' },
      },
    });

    render(
      <MemoryRouter initialEntries={['/invitations?token=token-1']}>
        <Routes>
          <Route path="/invitations" element={<InvitationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Shared Story')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => {
      expect(screen.getByText('Invitation accepted.')).toBeInTheDocument();
    });
  });
});