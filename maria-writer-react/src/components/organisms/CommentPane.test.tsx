import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, RenderOptions } from '@testing-library/react';
import React, { ReactElement } from 'react';
import { CommentPane } from './CommentPane';
import { StoryComment } from '../../types';
import { HelpProvider } from '../../context/HelpContext';

const createMockComment = (overrides?: Partial<StoryComment>): StoryComment => ({
  id: 'test-comment-1',
  author: 'Test Author',
  text: 'This is a test comment',
  timestamp: Date.now(),
  isSuggestion: false,
  isHidden: false,
  originalText: 'selected text',
  ...overrides
});

const renderWithHelp = (ui: ReactElement, options?: RenderOptions) => {
  return render(ui, { wrapper: HelpProvider, ...options });
};

describe('CommentPane', () => {
  const defaultProps = {
    comments: [],
    onHideComment: vi.fn(),
    onDeleteComment: vi.fn(),
    onCommentClick: vi.fn(),
    onPreviewSuggestion: vi.fn(),
    onApplySuggestion: vi.fn(),
    activeCommentId: null
  };

  it('should render collapsed by default', () => {
    const { container } = renderWithHelp(<CommentPane {...defaultProps} />);
    const pane = container.firstChild as HTMLElement;
    expect(pane.className).toContain('collapsed');
  });

  it('should expand when collapse button is clicked', () => {
    const { container } = renderWithHelp(<CommentPane {...defaultProps} />);
    const collapseBtn = screen.getByTitle('Expand comments');
    
    fireEvent.click(collapseBtn);
    
    const pane = container.firstChild;
    expect(pane).not.toHaveClass('collapsed');
  });

  it('should show empty state when no comments', () => {
    renderWithHelp(<CommentPane {...defaultProps} />);
    const collapseBtn = screen.getByTitle('Expand comments');
    fireEvent.click(collapseBtn);
    
    expect(screen.getByText('No comments yet')).toBeInTheDocument();
    expect(screen.getByText('Select text and click the comment button to add one')).toBeInTheDocument();
  });

  it('should render comments list', () => {
    const comments = [
      createMockComment({ id: 'comment-1', author: 'Alice', text: 'First comment' }),
      createMockComment({ id: 'comment-2', author: 'Bob', text: 'Second comment' })
    ];
    
    renderWithHelp(<CommentPane {...defaultProps} comments={comments} />);
    const collapseBtn = screen.getByTitle('Expand comments');
    fireEvent.click(collapseBtn);
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should expand comment when clicked', () => {
    const comment = createMockComment({ id: 'comment-1', author: 'Alice' });
    
    renderWithHelp(<CommentPane {...defaultProps} comments={[comment]} />);
    const collapseBtn = screen.getByTitle('Expand comments');
    fireEvent.click(collapseBtn);
    
    const authorElement = screen.getByText('Alice');
    expect(screen.queryByText('On text:')).not.toBeInTheDocument();
    
    // Click on the parent div that contains the author
    const commentHeader = authorElement.parentElement?.parentElement;
    if (commentHeader) {
      fireEvent.click(commentHeader);
    }
    
    expect(screen.getByText('On text:')).toBeInTheDocument();
    expect(screen.getByText('"selected text"')).toBeInTheDocument();
  });

  it('should show suggestion badge for suggestion comments', () => {
    const comment = createMockComment({
      id: 'suggestion-1',
      isSuggestion: true,
      replacementText: 'improved text'
    });
    
    renderWithHelp(<CommentPane {...defaultProps} comments={[comment]} />);
    const collapseBtn = screen.getByTitle('Expand comments');
    fireEvent.click(collapseBtn);
    
    expect(screen.getByText('Suggestion')).toBeInTheDocument();
  });

  it('should show Apply button for suggestion comments', () => {
    const comment = createMockComment({
      id: 'suggestion-1',
      isSuggestion: true,
      replacementText: 'improved text'
    });
    
    renderWithHelp(<CommentPane {...defaultProps} comments={[comment]} />);
    const collapseBtn = screen.getByTitle('Expand comments');
    fireEvent.click(collapseBtn);
    
    const authorElement = screen.getByText('Test Author');
    const commentHeader = authorElement.parentElement?.parentElement;
    if (commentHeader) {
      fireEvent.click(commentHeader);
    }
    
    expect(screen.getByText('Apply')).toBeInTheDocument();
  });

  it('should call onApplySuggestion when Apply button is clicked', () => {
    const onApplySuggestion = vi.fn();
    // Mock window.confirm to return true
    global.confirm = vi.fn(() => true);
    
    const comment = createMockComment({
      id: 'suggestion-1',
      isSuggestion: true,
      replacementText: 'improved text'
    });
    
    renderWithHelp(<CommentPane {...defaultProps} comments={[comment]} onApplySuggestion={onApplySuggestion} />);
    const collapseBtn = screen.getByTitle('Expand comments');
    fireEvent.click(collapseBtn);
    
    const authorElement = screen.getByText('Test Author');
    const commentHeader = authorElement.parentElement?.parentElement;
    if (commentHeader) {
      fireEvent.click(commentHeader);
    }
    
    const applyBtn = screen.getByText('Apply');
    fireEvent.click(applyBtn);
    
    expect(global.confirm).toHaveBeenCalled();
    expect(onApplySuggestion).toHaveBeenCalledWith('suggestion-1');
  });

  it('should show Applied state when suggestion is applied', () => {
    const comment = createMockComment({
      id: 'suggestion-1',
      isSuggestion: true,
      replacementText: 'improved text',
      isPreviewing: true
    });
    
    renderWithHelp(<CommentPane {...defaultProps} comments={[comment]} />);
    const collapseBtn = screen.getByTitle('Expand comments');
    fireEvent.click(collapseBtn);
    
    const authorElement = screen.getByText('Test Author');
    const commentHeader = authorElement.parentElement?.parentElement;
    if (commentHeader) {
      fireEvent.click(commentHeader);
    }
    
    expect(screen.getByText('Previewing')).toBeInTheDocument();
  });

  it('should call onHideComment when Hide button is clicked', () => {
    const onHideComment = vi.fn();
    const comment = createMockComment({ id: 'comment-1' });
    
    renderWithHelp(<CommentPane {...defaultProps} comments={[comment]} onHideComment={onHideComment} />);
    const collapseBtn = screen.getByTitle('Expand comments');
    fireEvent.click(collapseBtn);
    
    const authorElement = screen.getByText('Test Author');
    const commentHeader = authorElement.parentElement?.parentElement;
    if (commentHeader) {
      fireEvent.click(commentHeader);
    }
    
    const hideBtn = screen.getByText('Hide');
    fireEvent.click(hideBtn);
    
    expect(onHideComment).toHaveBeenCalledWith('comment-1');
  });

  it('should call onDeleteComment when Delete button is clicked and confirmed', () => {
    const onDeleteComment = vi.fn();
    const comment = createMockComment({ id: 'comment-1' });
    
    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    renderWithHelp(<CommentPane {...defaultProps} comments={[comment]} onDeleteComment={onDeleteComment} />);
    const collapseBtn = screen.getByTitle('Expand comments');
    fireEvent.click(collapseBtn);
    
    const authorElement = screen.getByText('Test Author');
    const commentHeader = authorElement.parentElement?.parentElement;
    if (commentHeader) {
      fireEvent.click(commentHeader);
    }
    
    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);
    
    expect(onDeleteComment).toHaveBeenCalledWith('comment-1');
  });

  it('should not call onDeleteComment when Delete is cancelled', () => {
    const onDeleteComment = vi.fn();
    const comment = createMockComment({ id: 'comment-1' });
    
    // Mock window.confirm to return false
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    
    renderWithHelp(<CommentPane {...defaultProps} comments={[comment]} onDeleteComment={onDeleteComment} />);
    const collapseBtn = screen.getByTitle('Expand comments');
    fireEvent.click(collapseBtn);
    
    const authorElement = screen.getByText('Test Author');
    const commentHeader = authorElement.parentElement?.parentElement;
    if (commentHeader) {
      fireEvent.click(commentHeader);
    }
    
    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);
    
    expect(onDeleteComment).not.toHaveBeenCalled();
  });

  it('should highlight active comment', () => {
    const comment = createMockComment({ id: 'active-comment' });
    const { container } = renderWithHelp(
      <CommentPane {...defaultProps} comments={[comment]} activeCommentId="active-comment" />
    );
    const collapseBtn = screen.getByTitle('Expand comments');
    fireEvent.click(collapseBtn);
    
    // Find all divs and look for one with 'active' in className
    const divs = container.querySelectorAll('div');
    const activeDiv = Array.from(divs).find(div => div.className.includes('active'));
    expect(activeDiv).toBeDefined();
  });

  it('should auto-expand active comment', () => {
    const comment = createMockComment({ id: 'active-comment' });
    
    renderWithHelp(<CommentPane {...defaultProps} comments={[comment]} activeCommentId="active-comment" />);
    const collapseBtn = screen.getByTitle('Expand comments');
    fireEvent.click(collapseBtn);
    
    // Comment should be expanded automatically
    expect(screen.getByText('On text:')).toBeInTheDocument();
  });

  it('should respect isOpen prop', () => {
    const { container, rerender } = renderWithHelp(<CommentPane {...defaultProps} isOpen={false} />);
    let pane = container.firstChild as HTMLElement;
    expect(pane.className).toContain('collapsed');
    
    rerender(<CommentPane {...defaultProps} isOpen={true} />);
    pane = container.firstChild as HTMLElement;
    expect(pane.className).not.toContain('collapsed');
  });

  it('should show replacement text for suggestions', () => {
    const comment = createMockComment({
      id: 'suggestion-1',
      isSuggestion: true,
      replacementText: 'This is better text',
      originalText: 'original text'
    });
    
    renderWithHelp(<CommentPane {...defaultProps} comments={[comment]} />);
    const collapseBtn = screen.getByTitle('Expand comments');
    fireEvent.click(collapseBtn);
    
    const authorElement = screen.getByText('Test Author');
    const commentHeader = authorElement.parentElement?.parentElement;
    if (commentHeader) {
      fireEvent.click(commentHeader);
    }
    
    expect(screen.getByText('Suggested replacement:')).toBeInTheDocument();
    expect(screen.getByText('"This is better text"')).toBeInTheDocument();
  });

  it('should sort comments by timestamp (newest first)', () => {
    const comments = [
      createMockComment({ id: 'old', author: 'Old', timestamp: 1000 }),
      createMockComment({ id: 'new', author: 'New', timestamp: 3000 }),
      createMockComment({ id: 'middle', author: 'Middle', timestamp: 2000 })
    ];
    
    renderWithHelp(<CommentPane {...defaultProps} comments={comments} />);
    const collapseBtn = screen.getByTitle('Expand comments');
    fireEvent.click(collapseBtn);
    
    const authors = screen.getAllByText(/Old|New|Middle/);
    expect(authors[0].textContent).toBe('New');
    expect(authors[1].textContent).toBe('Middle');
    expect(authors[2].textContent).toBe('Old');
  });

  it('should show hidden badge for hidden comments', () => {
    const comment = createMockComment({ id: 'hidden', isHidden: true });
    
    renderWithHelp(<CommentPane {...defaultProps} comments={[comment]} />);
    const collapseBtn = screen.getByTitle('Expand comments');
    fireEvent.click(collapseBtn);
    
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('should call onCommentClick when comment header is clicked', () => {
    const onCommentClick = vi.fn();
    const comment = createMockComment({ id: 'comment-1' });
    
    renderWithHelp(<CommentPane {...defaultProps} comments={[comment]} onCommentClick={onCommentClick} />);
    const collapseBtn = screen.getByTitle('Expand comments');
    fireEvent.click(collapseBtn);
    
    const authorElement = screen.getByText('Test Author');
    const commentHeader = authorElement.parentElement?.parentElement;
    if (commentHeader) {
      fireEvent.click(commentHeader);
    }
    
    expect(onCommentClick).toHaveBeenCalledWith('comment-1');
  });
});
