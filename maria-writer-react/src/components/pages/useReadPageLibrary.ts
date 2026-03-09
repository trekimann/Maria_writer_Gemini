import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cloudStorageService, type CloudProject, type CloudProjectRecord } from '../../services/cloudStorage';
import { collaborationService, type SharedProjectSummary } from '../../services/collaborationService';
import { markdownToHtml } from '../../utils/editorMarkdown';
import { stripFormattingMarkup } from '../../utils/PreviewFormattingUtility';
import { validateImportedState } from '../../utils/projectLoad';
import type { Chapter } from '../../types';
import type { LibraryProject } from './readPageUtils';
import { loadReadPagePreferences } from './readPagePersistence';

export type UseReadPageLibraryResult = {
  chapters: Chapter[];
  handleSelectChapter: (chapterId: string) => void;
  handleSelectProject: (projectId: string) => void;
  isLoadingLibrary: boolean;
  isLoadingProject: boolean;
  libraryError: string | null;
  libraryProjectCount: number;
  libraryProjects: LibraryProject[];
  ownedProjects: CloudProject[];
  previewHtml: string;
  projectError: string | null;
  refreshLibrary: () => Promise<void>;
  selectedChapter: Chapter | null;
  selectedChapterId: string | null;
  selectedChapterIndex: number;
  selectedLibraryProject: LibraryProject | null;
  selectedProject: CloudProjectRecord | null;
  selectedProjectId: string | null;
  sharedProjects: SharedProjectSummary[];
  updateChapterContent: (chapterId: string, content: string) => void;
  goToRelativeChapter: (offset: number) => void;
};

export const useReadPageLibrary = (): UseReadPageLibraryResult => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialPreferences] = useState(loadReadPagePreferences);
  const [ownedProjects, setOwnedProjects] = useState<CloudProject[]>([]);
  const [sharedProjects, setSharedProjects] = useState<SharedProjectSummary[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<CloudProjectRecord | null>(null);

  const selectedProjectId = searchParams.get('project');
  const selectedChapterId = searchParams.get('chapter');

  useEffect(() => {
    if (selectedProjectId || !initialPreferences.lastLocation.projectId) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('project', initialPreferences.lastLocation.projectId);

    if (initialPreferences.lastLocation.chapterId) {
      nextParams.set('chapter', initialPreferences.lastLocation.chapterId);
    }

    setSearchParams(nextParams, { replace: true });
  }, [initialPreferences.lastLocation.chapterId, initialPreferences.lastLocation.projectId, searchParams, selectedProjectId, setSearchParams]);

  const libraryProjects = useMemo<LibraryProject[]>(() => [
    ...ownedProjects.map((project) => ({ ...project, source: 'owned' as const })),
    ...sharedProjects.map((project) => ({ ...project, source: 'shared' as const })),
  ], [ownedProjects, sharedProjects]);

  const selectedLibraryProject = useMemo(
    () => libraryProjects.find((project) => project.id === selectedProjectId) ?? null,
    [libraryProjects, selectedProjectId],
  );

  const chapters = useMemo(
    () => (selectedProject?.data?.chapters ?? []) as Chapter[],
    [selectedProject],
  );

  const selectedChapter = useMemo(() => {
    if (chapters.length === 0) return null;
    return chapters.find((chapter) => chapter.id === selectedChapterId) ?? chapters[0];
  }, [chapters, selectedChapterId]);

  const selectedChapterIndex = selectedChapter
    ? chapters.findIndex((chapter) => chapter.id === selectedChapter.id)
    : -1;

  const previewHtml = useMemo(() => {
    if (!selectedChapter) return '';
    return markdownToHtml(stripFormattingMarkup(selectedChapter.content || ''), [], [], 'preview');
  }, [selectedChapter]);

  const refreshLibrary = async () => {
    setIsLoadingLibrary(true);
    setLibraryError(null);

    try {
      const [owned, shared] = await Promise.all([
        cloudStorageService.listProjects(),
        collaborationService.listSharedProjects(),
      ]);

      setOwnedProjects(owned);
      setSharedProjects(shared);

      const nextSelection = selectedProjectId && [...owned, ...shared].some((project) => project.id === selectedProjectId)
        ? selectedProjectId
        : owned[0]?.id || shared[0]?.id || null;

      if (nextSelection && nextSelection !== selectedProjectId) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('project', nextSelection);
        nextParams.delete('chapter');
        setSearchParams(nextParams, { replace: true });
      }
    } catch (error: any) {
      setLibraryError(error?.message || 'Failed to load your reader library.');
      setOwnedProjects([]);
      setSharedProjects([]);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  useEffect(() => {
    void refreshLibrary();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedProject(null);
      setProjectError(null);
      return;
    }

    let isCancelled = false;

    const loadProject = async () => {
      setIsLoadingProject(true);
      setProjectError(null);

      try {
        const project = await cloudStorageService.loadProjectRecord(selectedProjectId);
        const validationError = validateImportedState(project.data);

        if (validationError) {
          throw new Error(`This project cannot be read yet: ${validationError}`);
        }

        if (!isCancelled) {
          setSelectedProject(project);
        }
      } catch (error: any) {
        if (!isCancelled) {
          setSelectedProject(null);
          setProjectError(error?.message || 'Failed to load the selected project.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProject(false);
        }
      }
    };

    void loadProject();

    return () => {
      isCancelled = true;
    };
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProject || chapters.length === 0 || selectedChapterId) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    const preferredChapterId = initialPreferences.lastLocation.projectId === selectedProject.id
      ? initialPreferences.lastLocation.chapterId
      : null;
    const preferredChapter = preferredChapterId
      ? chapters.find((chapter) => chapter.id === preferredChapterId)
      : null;

    nextParams.set('chapter', preferredChapter?.id || chapters[0].id);
    setSearchParams(nextParams, { replace: true });
  }, [chapters, initialPreferences.lastLocation.chapterId, initialPreferences.lastLocation.projectId, searchParams, selectedChapterId, selectedProject, setSearchParams]);

  const handleSelectProject = (projectId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('project', projectId);
    nextParams.delete('chapter');
    setSearchParams(nextParams);
  };

  const handleSelectChapter = (chapterId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('chapter', chapterId);
    setSearchParams(nextParams);
  };

  const goToRelativeChapter = (offset: number) => {
    if (selectedChapterIndex < 0) return;
    const nextChapter = chapters[selectedChapterIndex + offset];
    if (nextChapter) {
      handleSelectChapter(nextChapter.id);
    }
  };

  const updateChapterContent = (chapterId: string, content: string) => {
    setSelectedProject((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        data: {
          ...previous.data,
          chapters: (previous.data.chapters || []).map((chapter: Chapter) => (
            chapter.id === chapterId ? { ...chapter, content } : chapter
          )),
        },
      };
    });
  };

  return {
    chapters,
    handleSelectChapter,
    handleSelectProject,
    isLoadingLibrary,
    isLoadingProject,
    libraryError,
    libraryProjectCount: libraryProjects.length,
    libraryProjects,
    ownedProjects,
    previewHtml,
    projectError,
    refreshLibrary,
    selectedChapter,
    selectedChapterId,
    selectedChapterIndex,
    selectedLibraryProject,
    selectedProject,
    selectedProjectId,
    sharedProjects,
    updateChapterContent,
    goToRelativeChapter,
  };
};
