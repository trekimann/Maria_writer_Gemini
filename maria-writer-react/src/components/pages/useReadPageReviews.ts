import { useEffect, useMemo, useState, type RefObject } from 'react';
import { collaborationService, type ProjectReviewComment } from '../../services/collaborationService';
import type { Chapter } from '../../types';
import { getSelectionOffsets } from './readPageUtils';

export type UseReadPageReviewsOptions = {
  canApplySuggestions: boolean;
  canComment: boolean;
  chapterContentRef: RefObject<HTMLDivElement>;
  onOpenReviewDrawer: () => void;
  onSuggestionApplied: (chapterId: string, content: string) => void;
  selectedChapter: Chapter | null;
  selectedProjectId: string | null;
};

export type UseReadPageReviewsResult = {
  applyingCommentId: string | null;
  clearSelectionState: () => void;
  handleApplySuggestion: (comment: ProjectReviewComment) => Promise<void>;
  handleChapterSelection: () => void;
  handleCreateReviewComment: () => Promise<void>;
  isLoadingReviews: boolean;
  isSubmittingReview: boolean;
  isSuggestion: boolean;
  replacementText: string;
  reviewComments: ProjectReviewComment[];
  reviewError: string | null;
  reviewText: string;
  selectedChapterComments: ProjectReviewComment[];
  selectedSnippet: string;
  setIsSuggestion: (value: boolean) => void;
  setReplacementText: (value: string) => void;
  setReviewText: (value: string) => void;
};

export const useReadPageReviews = ({
  canApplySuggestions,
  canComment,
  chapterContentRef,
  onOpenReviewDrawer,
  onSuggestionApplied,
  selectedChapter,
  selectedProjectId,
}: UseReadPageReviewsOptions): UseReadPageReviewsResult => {
  const [reviewComments, setReviewComments] = useState<ProjectReviewComment[]>([]);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [replacementText, setReplacementText] = useState('');
  const [isSuggestion, setIsSuggestion] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState('');
  const [selectionOffsets, setSelectionOffsets] = useState<{ startOffset: number; endOffset: number } | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [applyingCommentId, setApplyingCommentId] = useState<string | null>(null);

  const selectedChapterComments = useMemo(
    () => reviewComments.filter((comment) => comment.chapterId === selectedChapter?.id),
    [reviewComments, selectedChapter?.id],
  );

  useEffect(() => {
    if (!selectedProjectId) {
      setReviewComments([]);
      setReviewError(null);
      return;
    }

    let isCancelled = false;

    const loadReviewComments = async () => {
      setIsLoadingReviews(true);
      setReviewError(null);

      try {
        const comments = await collaborationService.listReviewComments(selectedProjectId);
        if (!isCancelled) {
          setReviewComments(comments);
        }
      } catch (error: any) {
        if (!isCancelled) {
          setReviewComments([]);
          setReviewError(error?.message || 'Failed to load review comments.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingReviews(false);
        }
      }
    };

    void loadReviewComments();

    return () => {
      isCancelled = true;
    };
  }, [selectedProjectId]);

  const clearSelectionState = () => {
    setSelectedSnippet('');
    setSelectionOffsets(null);
    setReviewText('');
    setReplacementText('');
    setIsSuggestion(false);
  };

  const handleChapterSelection = () => {
    if (!canComment || !chapterContentRef.current) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return;
    }

    const anchorNode = selection.anchorNode;
    if (anchorNode && !chapterContentRef.current.contains(anchorNode)) {
      return;
    }

    setSelectedSnippet(selection.toString().trim());
    setSelectionOffsets(getSelectionOffsets(chapterContentRef.current, selection));
    onOpenReviewDrawer();
  };

  const handleCreateReviewComment = async () => {
    if (!selectedProjectId || !selectedChapter || !selectedSnippet.trim() || !reviewText.trim()) {
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);

    try {
      const comment = await collaborationService.createReviewComment(selectedProjectId, {
        chapterId: selectedChapter.id,
        text: reviewText.trim(),
        isSuggestion,
        replacementText: isSuggestion ? replacementText.trim() : undefined,
        originalText: selectedSnippet,
        startOffset: selectionOffsets?.startOffset ?? null,
        endOffset: selectionOffsets?.endOffset ?? null,
      });

      setReviewComments((previous) => [...previous, comment]);
      clearSelectionState();
      window.getSelection()?.removeAllRanges();
    } catch (error: any) {
      setReviewError(error?.message || 'Failed to save your review comment.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleApplySuggestion = async (comment: ProjectReviewComment) => {
    if (!selectedProjectId || !canApplySuggestions) {
      return;
    }

    setApplyingCommentId(comment.id);
    setReviewError(null);

    try {
      const result = await collaborationService.applyReviewSuggestion(selectedProjectId, comment.id);

      setReviewComments((previous) => previous.map((entry) => (
        entry.id === result.commentId ? { ...entry, status: result.status } : entry
      )));

      onSuggestionApplied(result.chapterId, result.content);
    } catch (error: any) {
      setReviewError(error?.message || 'Failed to apply this suggestion.');
    } finally {
      setApplyingCommentId(null);
    }
  };

  return {
    applyingCommentId,
    clearSelectionState,
    handleApplySuggestion,
    handleChapterSelection,
    handleCreateReviewComment,
    isLoadingReviews,
    isSubmittingReview,
    isSuggestion,
    replacementText,
    reviewComments,
    reviewError,
    reviewText,
    selectedChapterComments,
    selectedSnippet,
    setIsSuggestion,
    setReplacementText,
    setReviewText,
  };
};
