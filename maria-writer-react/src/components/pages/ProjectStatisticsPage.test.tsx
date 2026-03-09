import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectStatisticsPage } from './ProjectStatisticsPage';

const mockListProjects = vi.fn();
const mockLoadFromCloud = vi.fn();

const currentState = {
  meta: { title: 'Current Novel', author: 'Author', description: '', tags: [] },
  chapters: [
    {
      id: 'ch-1',
      title: 'Chapter One',
      content: 'one two two three three three four four four four',
      order: 0,
      commentIds: ['comment-1'],
      relatedEvents: ['event-1'],
      mentionedCharacters: ['char-1', 'char-2'],
      date: '09/03/2026 08:00:00',
    },
  ],
  characters: [],
  events: [],
  relationships: [],
  comments: {},
  timeline: { edges: [] },
  activeChapterId: 'ch-1',
  viewMode: 'write' as const,
  context: 'writer' as const,
  activeCodexTab: 'timeline' as const,
  activeModal: 'none' as const,
  editingItemId: null,
  viewingItemId: null,
};

const mockNavigate = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
}));

vi.mock('../../context/StoreContext', () => ({
  useStore: () => ({ state: currentState }),
}));

vi.mock('../../services/cloudStorage', () => ({
  cloudStorageService: {
    listProjects: (...args: unknown[]) => mockListProjects(...args),
    loadFromCloud: (...args: unknown[]) => mockLoadFromCloud(...args),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ProjectStatisticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockListProjects.mockResolvedValue([
      {
        id: 'cloud-1',
        title: 'Cloud Novel',
        version: '1.0.0',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-09T08:30:00.000Z',
      },
    ]);
    mockLoadFromCloud.mockResolvedValue({
      meta: { title: 'Cloud Novel', author: 'Cloud Author', description: '', tags: [] },
      chapters: [
        { id: 'cloud-ch-1', title: 'Cloud Chapter', content: 'Alpha beta gamma', order: 0 },
      ],
      characters: [],
      events: [],
      relationships: [],
      comments: {},
      timeline: { edges: [] },
    });
  });

  it('renders current project chapter statistics by default', async () => {
    render(
      <MemoryRouter>
        <ProjectStatisticsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /statistics by chapter/i })).toBeInTheDocument();
    expect(screen.getByText('Current Novel')).toBeInTheDocument();
    expect(screen.getByText('Chapter One')).toBeInTheDocument();
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /top 5 words in this project/i })).toBeInTheDocument();
    expect(screen.getByText(/^four$/i)).toBeInTheDocument();
    expect(screen.getByText(/^3$/)).toBeInTheDocument();

    await waitFor(() => expect(mockListProjects).toHaveBeenCalled());
  });

  it('opens a dedicated chapter detail screen when a chapter row is selected', async () => {
    render(
      <MemoryRouter>
        <ProjectStatisticsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /view statistics for chapter one/i }));

    expect(await screen.findByRole('heading', { name: 'Chapter One' })).toBeInTheDocument();
    expect(await screen.findByText('Comment threads')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /top 5 words in this chapter/i })).toBeInTheDocument();
    expect(screen.getByText('one two two three three three four four four four')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all chapters/i })).toBeInTheDocument();
  });

  it('opens the first chapter from the chapter detail tab even before a chapter row is selected', async () => {
    render(
      <MemoryRouter>
        <ProjectStatisticsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('tab', { name: /chapter detail/i }));

    expect(await screen.findByRole('heading', { name: 'Chapter One' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all chapters/i })).toBeInTheDocument();
  });

  it('lets the user change how many frequent words are shown', async () => {
    render(
      <MemoryRouter>
        <ProjectStatisticsPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/most used words shown/i), {
      target: { value: '3' },
    });

    expect(screen.getByRole('heading', { name: /top 3 words in this project/i })).toBeInTheDocument();
    expect(screen.getByText(/^four$/i)).toBeInTheDocument();
    expect(screen.getByText(/^three$/i)).toBeInTheDocument();
    expect(screen.getByText(/^two$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^one$/i)).not.toBeInTheDocument();
  });

  it('lets the user edit ignored words in a modal', async () => {
    render(
      <MemoryRouter>
        <ProjectStatisticsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /edit ignored words/i }));

    const textarea = await screen.findByRole('textbox', { name: /ignored words list/i });
    fireEvent.change(textarea, {
      target: { value: 'three, four' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save ignored words/i }));

    const projectWordsPanel = screen.getByRole('heading', { name: /top 5 words in this project/i }).closest('div')?.parentElement;
    expect(projectWordsPanel).not.toBeNull();
    const panel = within(projectWordsPanel as HTMLElement);

    expect(panel.getByText(/^two$/i)).toBeInTheDocument();
    expect(panel.getByText(/^one$/i)).toBeInTheDocument();
    expect(panel.queryByText(/^three$/i)).not.toBeInTheDocument();
    expect(panel.queryByText(/^four$/i)).not.toBeInTheDocument();
  });

  it('loads a selected cloud project without changing the editor state', async () => {
    render(
      <MemoryRouter initialEntries={['/statistics?source=cloud:cloud-1']}>
        <ProjectStatisticsPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mockLoadFromCloud).toHaveBeenCalledWith('cloud-1'));
    expect(await screen.findByText('Cloud Chapter')).toBeInTheDocument();
  });
});
