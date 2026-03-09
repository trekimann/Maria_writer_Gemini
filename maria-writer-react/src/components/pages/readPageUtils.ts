import type { CloudProject } from '../../services/cloudStorage';
import type { CollaborationRole, SharedProjectSummary } from '../../services/collaborationService';

export type LibraryProject =
  | (CloudProject & { source: 'owned' })
  | (SharedProjectSummary & { source: 'shared' });

export function getOwnerName(project: LibraryProject): string {
  if (project.source === 'owned') {
    return 'You';
  }

  return project.owner.displayName || project.owner.username || project.owner.email;
}

export function getRoleLabel(role: CollaborationRole | null | undefined): string {
  if (!role) return 'Owner';
  if (role === 'COMMENT') return 'Comment';
  if (role === 'EDIT') return 'Edit';
  return 'Read';
}

export function getSelectionOffsets(container: HTMLElement, selection: Selection) {
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);

  const startOffset = preRange.toString().length;
  const selectedText = selection.toString();

  return {
    startOffset,
    endOffset: startOffset + selectedText.length,
  };
}
