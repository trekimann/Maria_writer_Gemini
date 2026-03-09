import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReadPage } from './ReadPage';

const mockListProjects = vi.fn();
const mockLoadProjectRecord = vi.fn();
const mockListSharedProjects = vi.fn();
const mockListReviewComments = vi.fn();
const mockCreateReviewComment = vi.fn();
const mockApplyReviewSuggestion = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../services/cloudStorage', () => ({
  cloudStorageService: {
    listProjects: mockListProjects,
    loadProjectRecord: mockLoadProjectRecord,
  },
}));

vi.mock('../../services/collaborationService', () => ({
  collaborationService: {
    listSharedProjects: mockListSharedProjects,
    listReviewComments: mockListReviewComments,
    createReviewComment: mockCreateReviewComment,
    applyReviewSuggestion: mockApplyReviewSuggestion,
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'owner-1', email: 'owner@example.com', username: 'owner', displayName: 'Owner' },
  }),
}));

vi.mock('../../utils/editorMarkdown', () => ({
  markdownToHtml: (markdown: string) => `<p>${markdown}</p>`,
}));

vi.mock('../templates/AppPageLayout', () => ({
  AppPageLayout: ({ children, headerActions, menuBar }: any) => <div>{headerActions}{menuBar}{children}</div>,
}));

vi.mock('../atoms/HelpButton', () => ({
  HelpButton: () => <button>Help</button>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

const createProjectRecord = (content = 'Hello reader') => ({
  id: 'owned-1',
  title: 'Owned Story',
  version: '2.3.0',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-02',
  access: { isOwner: true, role: null, canRead: true, canComment: true, canEditProject: true },
  data: {
    meta: { title: 'Owned Story', author: 'Author', description: 'Desc', tags: [] },
    chapters: [{ id: 'ch-1', title: 'Chapter One', content, order: 1 }],
    activeChapterId: 'ch-1',
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
  },
});

describe('ReadPage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1280 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 900 });
    Object.defineProperty(window, 'ResizeObserver', { configurable: true, writable: true, value: ResizeObserverMock });
    Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, writable: true, value: ResizeObserverMock });
    localStorage.clear();
    mockListProjects.mockReset();
    mockLoadProjectRecord.mockReset();
    mockListSharedProjects.mockReset();
    mockListReviewComments.mockReset();
    mockCreateReviewComment.mockReset();
    mockApplyReviewSuggestion.mockReset();
    mockNavigate.mockReset();
  });

  it('loads the library and renders the selected chapter', async () => {
    mockListProjects.mockResolvedValue([
      { id: 'owned-1', title: 'Owned Story', version: '2.3.0', createdAt: '2026-01-01', updatedAt: '2026-01-02' },
    ]);
    mockListSharedProjects.mockResolvedValue([]);
    mockLoadProjectRecord.mockResolvedValue(createProjectRecord());
    mockListReviewComments.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/read']}>
        <Routes>
          <Route path="/read" element={<ReadPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Owned Story')).toBeInTheDocument();
    });
    expect(screen.getByText('Chapter One')).toBeInTheDocument();
    expect(screen.getByText('Hello reader')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reviews/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invitations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Medium' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('lets the reader font size be changed from the menu bar', async () => {
    mockListProjects.mockResolvedValue([
      { id: 'owned-1', title: 'Owned Story', version: '2.3.0', createdAt: '2026-01-01', updatedAt: '2026-01-02' },
    ]);
    mockListSharedProjects.mockResolvedValue([]);
    mockLoadProjectRecord.mockResolvedValue(createProjectRecord());
    mockListReviewComments.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/read']}>
        <Routes>
          <Route path="/read" element={<ReadPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Owned Story')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Large' }));

    expect(screen.getByRole('button', { name: 'Large' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Medium' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders shared projects in the library', async () => {
    mockListProjects.mockResolvedValue([]);
    mockListSharedProjects.mockResolvedValue([
      {
        id: 'shared-1',
        title: 'Shared Story',
        version: '2.3.0',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-02',
        owner: { id: 'u1', email: 'owner@example.com', username: 'owner', displayName: 'Owner' },
        collaborator: { id: 'c1', role: 'READ', acceptedAt: '2026-01-03' },
      },
    ]);
    mockLoadProjectRecord.mockResolvedValue({
      id: 'shared-1',
      title: 'Shared Story',
      version: '2.3.0',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-02',
      access: { isOwner: false, role: 'READ', canRead: true, canComment: false, canEditProject: false },
      data: {
        meta: { title: 'Shared Story', author: 'Owner', description: '', tags: [] },
        chapters: [{ id: 'ch-1', title: 'Shared Chapter', content: 'Shared text', order: 1 }],
        activeChapterId: 'ch-1',
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
      },
    });
    mockListReviewComments.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/read?project=shared-1']}>
        <Routes>
          <Route path="/read" element={<ReadPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Shared Story')).toBeInTheDocument();
    });
    expect(screen.getByText('From Owner')).toBeInTheDocument();
  });

  it('collapses the library after selecting a project and lets it be reopened', async () => {
    mockListProjects.mockResolvedValue([
      { id: 'owned-1', title: 'Owned Story', version: '2.3.0', createdAt: '2026-01-01', updatedAt: '2026-01-02' },
      { id: 'owned-2', title: 'Second Story', version: '2.3.0', createdAt: '2026-01-01', updatedAt: '2026-01-02' },
    ]);
    mockListSharedProjects.mockResolvedValue([]);
    mockLoadProjectRecord.mockResolvedValue(createProjectRecord());
    mockListReviewComments.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/read']}>
        <Routes>
          <Route path="/read" element={<ReadPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Second Story')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Second Story/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Library' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Library' }));

    expect(screen.getByText('Second Story')).toBeInTheDocument();
  });

  it('shows review comments and lets the owner apply a suggestion', async () => {
    mockListProjects.mockResolvedValue([
      { id: 'owned-1', title: 'Owned Story', version: '2.3.0', createdAt: '2026-01-01', updatedAt: '2026-01-02' },
    ]);
    mockListSharedProjects.mockResolvedValue([]);
    mockLoadProjectRecord.mockResolvedValue(createProjectRecord());
    mockListReviewComments.mockResolvedValue([
      {
        id: 'review-1',
        projectId: 'owned-1',
        chapterId: 'ch-1',
        text: 'Use a stronger verb',
        isSuggestion: true,
        replacementText: 'Hello avid reader',
        originalText: 'Hello reader',
        startOffset: null,
        endOffset: null,
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        author: { id: 'u2', email: 'reader@example.com', username: 'reader', displayName: 'Reader' },
      },
    ]);
    mockApplyReviewSuggestion.mockResolvedValue({
      success: true,
      commentId: 'review-1',
      chapterId: 'ch-1',
      content: 'Hello avid reader',
      status: 'RESOLVED',
    });

    render(
      <MemoryRouter initialEntries={['/read']}>
        <Routes>
          <Route path="/read" element={<ReadPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reviews/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Reviews/i }));

    await waitFor(() => {
      expect(screen.getByText('Use a stronger verb')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Accept suggestion' }));

    await waitFor(() => {
      expect(mockApplyReviewSuggestion).toHaveBeenCalledWith('owned-1', 'review-1');
    });
  });

  it('persists sidebar state, font size, and reading position across visits', async () => {
    const longContent = 'A long reading sentence. '.repeat(1500);

    mockListProjects.mockResolvedValue([
      { id: 'owned-1', title: 'Owned Story', version: '2.3.0', createdAt: '2026-01-01', updatedAt: '2026-01-02' },
    ]);
    mockListSharedProjects.mockResolvedValue([]);
    mockLoadProjectRecord.mockResolvedValue(createProjectRecord(longContent));
    mockListReviewComments.mockResolvedValue([]);

    const firstRender = render(
      <MemoryRouter initialEntries={['/read']}>
        <Routes>
          <Route path="/read" element={<ReadPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Owned Story')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Large' }));
    fireEvent.click(screen.getByTitle('Hide library'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next page/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Next page/i }));

    await waitFor(() => {
      expect(screen.getByText(/Pages 3-4 of|Pages 2-3 of/)).toBeInTheDocument();
    });

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('maria_read_page_preferences') ?? '{}');
      expect(saved.pagePositions?.['owned-1:ch-1']).toBeGreaterThan(0);
    });

    firstRender.unmount();

    render(
      <MemoryRouter initialEntries={['/read']}>
        <Routes>
          <Route path="/read" element={<ReadPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Owned Story')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Large' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Your stories')).not.toBeInTheDocument();
    expect(screen.getByTitle('Show library')).toBeInTheDocument();
    expect(screen.getByText(/Pages 3-4 of|Pages 2-3 of/)).toBeInTheDocument();
  });

  it('restores the containing spread in landscape mode like a bookmark', async () => {
    const longContent = 'A long reading sentence. '.repeat(1500);

    localStorage.setItem('maria_read_page_preferences', JSON.stringify({
      fontSize: 'medium',
      lastLocation: {
        projectId: 'owned-1',
        chapterId: 'ch-1',
      },
      pagePositions: {
        'owned-1:ch-1': 3,
      },
      sidebarCollapsed: false,
    }));

    mockListProjects.mockResolvedValue([
      { id: 'owned-1', title: 'Owned Story', version: '2.3.0', createdAt: '2026-01-01', updatedAt: '2026-01-02' },
    ]);
    mockListSharedProjects.mockResolvedValue([]);
    mockLoadProjectRecord.mockResolvedValue(createProjectRecord(longContent));
    mockListReviewComments.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/read']}>
        <Routes>
          <Route path="/read" element={<ReadPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Owned Story')).toBeInTheDocument();
    });

    expect(screen.getByText(/Pages 3-4 of/)).toBeInTheDocument();
  });
});