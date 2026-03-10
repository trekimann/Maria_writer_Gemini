import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { cloudStorageService, type CloudProject } from '../../services/cloudStorage';
import {
  DEFAULT_IGNORED_WORDS,
  ignoredWordsToText,
  loadIgnoredWords,
  parseIgnoredWordsInput,
  resetIgnoredWords,
  saveIgnoredWords,
} from '../../utils/frequentWordSettings';
import { validateImportedState } from '../../utils/projectLoad';
import {
  summarizeProjectStatistics,
  type FrequentWordEntry,
  type StatisticsProject,
} from '../../utils/projectStatistics';
import { AppPageLayout } from '../templates/AppPageLayout';
import { Button } from '../atoms/Button';
import { Statistics } from '../atoms/Statistics';
import { Modal } from '../molecules/Modal';
import styles from './ProjectStatisticsPage.module.scss';

const CURRENT_SOURCE = 'current';
const TOP_WORD_MIN = 3;
const TOP_WORD_MAX = 15;
const DEFAULT_TOP_WORD_COUNT = 5;
const EMPTY_PROJECT: StatisticsProject = {
  meta: {
    title: 'Untitled Project',
    author: '',
    description: '',
    tags: [],
  },
  chapters: [],
};

function clampTopWordCount(value: number): number {
  return Math.min(TOP_WORD_MAX, Math.max(TOP_WORD_MIN, value));
}

const WordFrequencyList: React.FC<{
  title: string;
  words: FrequentWordEntry[];
  limit: number;
  emptyLabel: string;
}> = ({ title, words, limit, emptyLabel }) => {
  const visibleWords = words.slice(0, limit);

  return (
    <div className={styles.wordPanel}>
      <div className={styles.wordPanelHeader}>
        <h3>{title}</h3>
        <span>{Math.min(limit, visibleWords.length)} shown</span>
      </div>

      {visibleWords.length === 0 ? (
        <p className={styles.wordEmpty}>{emptyLabel}</p>
      ) : (
        <div className={styles.wordList}>
          {visibleWords.map((entry, index) => (
            <div key={entry.word} className={styles.wordItem}>
              <span className={styles.wordRank}>#{index + 1}</span>
              <span className={styles.wordText}>{entry.word}</span>
              <span className={styles.wordCount}>{entry.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function getCloudSourceProjectId(source: string | null): string | null {
  if (!source || source === CURRENT_SOURCE) {
    return null;
  }

  return source.startsWith('cloud:') ? source.slice('cloud:'.length) : null;
}

export const ProjectStatisticsPage: React.FC = () => {
  const { state } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [isLoadingCloudProjects, setIsLoadingCloudProjects] = useState(false);
  const [isLoadingSelectedProject, setIsLoadingSelectedProject] = useState(false);
  const [cloudListError, setCloudListError] = useState<string | null>(null);
  const [selectedProjectError, setSelectedProjectError] = useState<string | null>(null);
  const [selectedCloudProjectData, setSelectedCloudProjectData] = useState<StatisticsProject | null>(null);
  const [topWordCount, setTopWordCount] = useState(DEFAULT_TOP_WORD_COUNT);
  const [ignoredWords, setIgnoredWords] = useState<string[]>(() => loadIgnoredWords());
  const [isIgnoreWordsModalOpen, setIsIgnoreWordsModalOpen] = useState(false);
  const [ignoredWordsDraft, setIgnoredWordsDraft] = useState(() => ignoredWordsToText(loadIgnoredWords()));

  const selectedSource = searchParams.get('source') ?? CURRENT_SOURCE;
  const expandedChapterId = searchParams.get('chapter');
  const selectedCloudProjectId = getCloudSourceProjectId(selectedSource);

  const currentProjectStatistics = useMemo(
    () => summarizeProjectStatistics(state, { ignoredWords }),
    [ignoredWords, state],
  );

  const selectedCloudProject = useMemo(
    () => cloudProjects.find((project) => project.id === selectedCloudProjectId) ?? null,
    [cloudProjects, selectedCloudProjectId],
  );

  const displayedProject = selectedCloudProjectId
    ? selectedCloudProjectData ?? {
        ...EMPTY_PROJECT,
        meta: {
          ...EMPTY_PROJECT.meta,
          title: selectedCloudProject?.title ?? 'Cloud project',
        },
      }
    : state;
  const displayedStatistics = useMemo(
    () => summarizeProjectStatistics(displayedProject ?? state, { ignoredWords }),
    [displayedProject, ignoredWords, state],
  );
  const selectedChapter = useMemo(
    () => displayedStatistics.chapters.find((chapter) => chapter.id === expandedChapterId) ?? null,
    [displayedStatistics.chapters, expandedChapterId],
  );
  const firstChapter = displayedStatistics.chapters[0] ?? null;

  const updateRouteState = (source: string, chapterId?: string | null) => {
    const params = new URLSearchParams();

    if (source !== CURRENT_SOURCE) {
      params.set('source', source);
    }

    if (chapterId) {
      params.set('chapter', chapterId);
    }

    setSearchParams(params, { replace: true });
  };

  const refreshCloudProjects = async () => {
    setIsLoadingCloudProjects(true);
    setCloudListError(null);

    try {
      const projects = await cloudStorageService.listProjects();
      setCloudProjects(projects);
    } catch (error: any) {
      setCloudProjects([]);
      setCloudListError(error?.message || 'Failed to load cloud projects.');
    } finally {
      setIsLoadingCloudProjects(false);
    }
  };

  useEffect(() => {
    void refreshCloudProjects();
  }, []);

  useEffect(() => {
    setIgnoredWordsDraft(ignoredWordsToText(ignoredWords));
  }, [ignoredWords]);

  useEffect(() => {
    if (!selectedCloudProjectId) {
      setSelectedCloudProjectData(null);
      setSelectedProjectError(null);
      return;
    }

    let isCancelled = false;

    const loadProject = async () => {
      setIsLoadingSelectedProject(true);
      setSelectedProjectError(null);

      try {
        const loaded = await cloudStorageService.loadFromCloud(selectedCloudProjectId);
        const validationError = validateImportedState(loaded);

        if (validationError) {
          throw new Error(`Cloud project is invalid: ${validationError}`);
        }

        if (!isCancelled) {
          setSelectedCloudProjectData(loaded as StatisticsProject);
        }
      } catch (error: any) {
        if (!isCancelled) {
          setSelectedCloudProjectData(null);
          setSelectedProjectError(error?.message || 'Failed to load selected project statistics.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSelectedProject(false);
        }
      }
    };

    void loadProject();

    return () => {
      isCancelled = true;
    };
  }, [selectedCloudProjectId]);

  useEffect(() => {
    if (!expandedChapterId) {
      return;
    }

    if (isLoadingSelectedProject) {
      return;
    }

    if (selectedCloudProjectId && !selectedCloudProjectData && !selectedProjectError) {
      return;
    }

    const chapterExists = displayedStatistics.chapters.some((chapter) => chapter.id === expandedChapterId);
    if (!chapterExists) {
      updateRouteState(selectedSource, null);
    }
  }, [
    displayedStatistics.chapters,
    expandedChapterId,
    isLoadingSelectedProject,
    selectedCloudProjectData,
    selectedCloudProjectId,
    selectedProjectError,
    selectedSource,
  ]);

  const handleSourceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    updateRouteState(event.target.value, null);
  };

  const handleSelectChapter = (chapterId: string) => {
    updateRouteState(selectedSource, chapterId);
  };

  const handleShowOverview = () => {
    updateRouteState(selectedSource, null);
  };

  const handleOpenDetailView = () => {
    if (selectedChapter) {
      handleSelectChapter(selectedChapter.id);
      return;
    }

    if (firstChapter) {
      handleSelectChapter(firstChapter.id);
    }
  };

  const handleTopWordCountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    if (Number.isNaN(nextValue)) {
      setTopWordCount(DEFAULT_TOP_WORD_COUNT);
      return;
    }

    setTopWordCount(clampTopWordCount(nextValue));
  };

  const handleOpenIgnoredWordsModal = () => {
    setIgnoredWordsDraft(ignoredWordsToText(ignoredWords));
    setIsIgnoreWordsModalOpen(true);
  };

  const handleCloseIgnoredWordsModal = () => {
    setIsIgnoreWordsModalOpen(false);
    setIgnoredWordsDraft(ignoredWordsToText(ignoredWords));
  };

  const handleSaveIgnoredWords = () => {
    const normalized = saveIgnoredWords(parseIgnoredWordsInput(ignoredWordsDraft));
    setIgnoredWords(normalized);
    setIsIgnoreWordsModalOpen(false);
  };

  const handleResetIgnoredWords = () => {
    const defaults = resetIgnoredWords();
    setIgnoredWords(defaults);
    setIgnoredWordsDraft(ignoredWordsToText(defaults));
  };

  const selectedSourceLabel = selectedCloudProjectId
    ? selectedCloudProject?.title ?? 'Cloud project'
    : `${currentProjectStatistics.title} (current editor project)`;

  return (
    <AppPageLayout
      headerActions={
        <div className={styles.headerActions}>
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/editor')}>
            Back to Editor
          </Button>
        </div>
      }
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroIntro}>
            <p className={styles.eyebrow}>Project statistics</p>
            <h1 className={styles.title}>Statistics by chapter</h1>
            <p className={styles.subtitle}>
              Review manuscript totals and compare chapter-by-chapter writing stats without changing the project open in the editor.
            </p>
          </div>

          <div className={styles.controlsCard}>
            <div className={styles.controlsGrid}>
              <div className={styles.controlRow}>
                <label htmlFor="statistics-project-source" className={styles.controlLabel}>Project source</label>
                <select
                  id="statistics-project-source"
                  className={styles.select}
                  value={selectedSource}
                  onChange={handleSourceChange}
                >
                  <option value={CURRENT_SOURCE}>Current project — {currentProjectStatistics.title || 'Untitled Project'}</option>
                  {cloudProjects.map((project) => (
                    <option key={project.id} value={`cloud:${project.id}`}>
                      Cloud — {project.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.controlRow}>
                <label htmlFor="statistics-top-word-count" className={styles.controlLabel}>Most used words shown</label>
                <input
                  id="statistics-top-word-count"
                  className={styles.numberInput}
                  type="number"
                  min={TOP_WORD_MIN}
                  max={TOP_WORD_MAX}
                  value={topWordCount}
                  onChange={handleTopWordCountChange}
                />
                <p className={styles.controlHint}>Choose how many of the most frequent words to show for the current project and chapter.</p>
              </div>

              <div className={`${styles.controlRow} ${styles.controlRowWide}`}>
                <div className={styles.controlSplit}>
                  <div>
                    <label className={styles.controlLabel}>Ignored words</label>
                    <p className={styles.controlHint}>
                      {ignoredWords.length} ignored by default. Common filler words are removed from frequency counts.
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleOpenIgnoredWordsModal}>
                    Edit ignored words
                  </Button>
                </div>
                <div className={styles.ignoredWordsPreview}>
                  {ignoredWords.slice(0, 10).map((word) => (
                    <span key={word} className={styles.ignoredWordChip}>{word}</span>
                  ))}
                  {ignoredWords.length > 10 && (
                    <span className={styles.ignoredWordMore}>+{ignoredWords.length - 10} more</span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.controlMeta}>
              <span>Viewing {selectedSourceLabel}</span>
              <Button
                variant="ghost"
                size="sm"
                icon={RefreshCw}
                onClick={refreshCloudProjects}
                disabled={isLoadingCloudProjects}
              >
                {isLoadingCloudProjects ? 'Refreshing…' : 'Refresh cloud list'}
              </Button>
            </div>

            {cloudListError && <p className={styles.inlineError}>{cloudListError}</p>}
            {selectedProjectError && <p className={styles.inlineError}>{selectedProjectError}</p>}
          </div>
        </section>

        <section className={styles.screenShell}>
          <div className={styles.screenTabs} role="tablist" aria-label="Statistics views">
            <button
              type="button"
              role="tab"
              aria-selected={!selectedChapter}
              className={`${styles.screenTab} ${!selectedChapter ? styles.screenTabActive : ''}`}
              onClick={handleShowOverview}
            >
              Project overview
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!!selectedChapter}
              className={`${styles.screenTab} ${selectedChapter ? styles.screenTabActive : ''}`}
              onClick={handleOpenDetailView}
            >
              {selectedChapter ? `Chapter detail • ${selectedChapter.title}` : 'Chapter detail'}
            </button>
          </div>

          {!selectedChapter ? (
            <>
              <section className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryHeader}>
                    <div>
                      <p className={styles.summaryEyebrow}>Selected project</p>
                      <h2>{displayedStatistics.title}</h2>
                    </div>
                    <span className={styles.chapterCount}>{displayedStatistics.chapterCount} chapters</span>
                  </div>

                  <Statistics
                    wordCount={displayedStatistics.totalWordCount}
                    characterCount={displayedStatistics.totalCharacterCount}
                    readingTime={displayedStatistics.totalReadingTime}
                    pageEstimate={displayedStatistics.totalPageEstimate}
                  />

                  <WordFrequencyList
                    title={`Top ${topWordCount} words in this project`}
                    words={displayedStatistics.frequentWords}
                    limit={topWordCount}
                    emptyLabel="No repeated words yet. Start writing chapters to see project-level frequency data."
                  />
                </div>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionEyebrow}>Chapter breakdown</p>
                    <h2>All chapter statistics</h2>
                  </div>
                  <p className={styles.sectionHint}>Select a chapter row to move into a dedicated detail screen for deeper analysis.</p>
                </div>

                {isLoadingSelectedProject ? (
                  <div className={styles.emptyState}>Loading project statistics…</div>
                ) : displayedStatistics.chapters.length === 0 ? (
                  <div className={styles.emptyState}>No chapters yet. Add a chapter in the editor to start tracking statistics.</div>
                ) : (
                  <div className={styles.chapterList}>
                    {displayedStatistics.chapters.map((chapter) => (
                      <article key={chapter.id} className={styles.chapterCard}>
                        <button
                          type="button"
                          className={styles.chapterToggle}
                          onClick={() => handleSelectChapter(chapter.id)}
                          aria-label={`View statistics for ${chapter.title}`}
                        >
                          <div className={styles.chapterHeading}>
                            <span className={styles.chapterIndex}>#{chapter.order + 1}</span>
                            <div>
                              <h3>{chapter.title}</h3>
                              <p>{chapter.date || 'No chapter date set'}</p>
                            </div>
                          </div>

                          <div className={styles.statGrid}>
                            <div>
                              <span>Words</span>
                              <strong>{chapter.wordCount.toLocaleString()}</strong>
                            </div>
                            <div>
                              <span>Characters</span>
                              <strong>{chapter.characterCount.toLocaleString()}</strong>
                            </div>
                            <div>
                              <span>Read time</span>
                              <strong>{chapter.readingTime}</strong>
                            </div>
                            <div>
                              <span>Pages</span>
                              <strong>{chapter.pageEstimate}</strong>
                            </div>
                          </div>

                          <div className={styles.rowAction}>
                            <span>Open detail</span>
                            <ChevronRight className={styles.chevron} />
                          </div>
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className={styles.detailScreen} aria-labelledby="statistics-chapter-detail-title">
              <div className={styles.detailHeader}>
                <Button variant="ghost" icon={ArrowLeft} onClick={handleShowOverview}>
                  All chapters
                </Button>
                <p className={styles.detailHeaderMeta}>
                  Viewing chapter {selectedChapter.order + 1} of {displayedStatistics.chapterCount} in {displayedStatistics.title}
                </p>
              </div>

              <div className={styles.detailLayout}>
                <aside className={styles.chapterRail} aria-label="Chapter navigation">
                  <p className={styles.chapterRailEyebrow}>Chapters</p>
                  <div className={styles.chapterRailList}>
                    {displayedStatistics.chapters.map((chapter) => {
                      const isActive = chapter.id === selectedChapter.id;

                      return (
                        <button
                          key={chapter.id}
                          type="button"
                          className={`${styles.chapterRailItem} ${isActive ? styles.chapterRailItemActive : ''}`}
                          onClick={() => handleSelectChapter(chapter.id)}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <span className={styles.chapterRailIndex}>#{chapter.order + 1}</span>
                          <span className={styles.chapterRailTitle}>{chapter.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </aside>

                <div className={styles.detailContent}>
                  <div className={styles.detailHero}>
                    <div>
                      <p className={styles.sectionEyebrow}>Chapter detail</p>
                      <h2 id="statistics-chapter-detail-title">{selectedChapter.title}</h2>
                      <p className={styles.detailSubtitle}>
                        {selectedChapter.date || 'No chapter date set'} • Source: {selectedSourceLabel}
                      </p>
                    </div>
                    <span className={styles.chapterCount}>Chapter #{selectedChapter.order + 1}</span>
                  </div>

                  <div className={styles.detailStatsGrid}>
                    <div className={styles.detailCard}>
                      <span>Words</span>
                      <strong>{selectedChapter.wordCount.toLocaleString()}</strong>
                    </div>
                    <div className={styles.detailCard}>
                      <span>Characters</span>
                      <strong>{selectedChapter.characterCount.toLocaleString()}</strong>
                    </div>
                    <div className={styles.detailCard}>
                      <span>Read time</span>
                      <strong>{selectedChapter.readingTime}</strong>
                    </div>
                    <div className={styles.detailCard}>
                      <span>Pages</span>
                      <strong>{selectedChapter.pageEstimate}</strong>
                    </div>
                  </div>

                  <div className={styles.detailPanels}>
                    <div className={styles.detailPanel}>
                      <WordFrequencyList
                        title={`Top ${topWordCount} words in this chapter`}
                        words={selectedChapter.frequentWords}
                        limit={topWordCount}
                        emptyLabel="No words yet in this chapter."
                      />
                    </div>

                    <div className={styles.detailPanel}>
                      <h3>Chapter signals</h3>
                      <div className={styles.detailStatsGrid}>
                        <div className={styles.detailCard}>
                          <span>Comment threads</span>
                          <strong>{selectedChapter.commentCount}</strong>
                        </div>
                        <div className={styles.detailCard}>
                          <span>Related events</span>
                          <strong>{selectedChapter.relatedEventCount}</strong>
                        </div>
                        <div className={styles.detailCard}>
                          <span>Mentioned characters</span>
                          <strong>{selectedChapter.mentionedCharacterCount}</strong>
                        </div>
                        <div className={styles.detailCard}>
                          <span>Chapter ID</span>
                          <strong>{selectedChapter.id}</strong>
                        </div>
                      </div>
                    </div>

                    <div className={styles.detailPanel}>
                      <h3>Excerpt preview</h3>
                      <div className={styles.excerptBlock}>
                        <p>{selectedChapter.excerpt}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </section>
      </div>

      <Modal
        isOpen={isIgnoreWordsModalOpen}
        onClose={handleCloseIgnoredWordsModal}
        title="Edit ignored words"
        size="lg"
        footer={(
          <>
            <Button variant="ghost" onClick={handleCloseIgnoredWordsModal}>Cancel</Button>
            <Button variant="secondary" onClick={handleResetIgnoredWords}>Reset defaults</Button>
            <Button variant="primary" onClick={handleSaveIgnoredWords}>Save ignored words</Button>
          </>
        )}
      >
        <div className={styles.modalContent}>
          <p className={styles.modalIntro}>
            Add words separated by commas or new lines. These words will be excluded from project and chapter frequency lists.
          </p>
          <textarea
            className={styles.modalTextarea}
            rows={8}
            value={ignoredWordsDraft}
            onChange={(event) => setIgnoredWordsDraft(event.target.value)}
            aria-label="Ignored words list"
          />

          <div className={styles.modalMeta}>
            <span>Default list includes {DEFAULT_IGNORED_WORDS.length} common words.</span>
            <span>{parseIgnoredWordsInput(ignoredWordsDraft).length} words will be saved.</span>
          </div>

          <div className={styles.ignoredWordsPreview}>
            {parseIgnoredWordsInput(ignoredWordsDraft).slice(0, 24).map((word) => (
              <span key={word} className={styles.ignoredWordChip}>{word}</span>
            ))}
          </div>
        </div>
      </Modal>
    </AppPageLayout>
  );
};
