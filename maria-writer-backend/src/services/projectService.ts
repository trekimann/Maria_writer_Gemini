import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { encryptForUser, decryptForUser, getMasterKey } from './encryptionService';

// ---------------------------------------------------------------------------
// Encryption helpers
// ---------------------------------------------------------------------------

/** Returns true when DATA_ENCRYPTION_KEY is set and valid. */
function isEncryptionEnabled(): boolean {
  try {
    getMasterKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Encrypts AppState JSON for the given key ID (guestId or future userId).
 * Returns Prisma-ready column values.
 * Falls back to plaintext storage when DATA_ENCRYPTION_KEY is not configured.
 */
function buildStoragePayload(data: AppState, keyId: string): {
  data: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  dataEncrypted: string | null;
  encryptionMeta: Prisma.InputJsonValue | typeof Prisma.JsonNull;
} {
  if (isEncryptionEnabled()) {
    const payload = encryptForUser(JSON.stringify(data), keyId);
    return {
      data: Prisma.JsonNull,
      dataEncrypted: payload.ciphertext,
      encryptionMeta: { iv: payload.iv, authTag: payload.authTag },
    };
  }
  // Encryption not configured — store plaintext (dev / un-keyed environments)
  return { data: data as unknown as Prisma.InputJsonValue, dataEncrypted: null, encryptionMeta: Prisma.JsonNull };
}

/**
 * Decrypts a project row's data column back to AppState.
 * Falls back to the unencrypted `data` column for legacy rows.
 */
function restoreData(project: any, keyId: string): any {
  if (project.dataEncrypted && project.encryptionMeta) {
    try {
      const meta = project.encryptionMeta as { iv: string; authTag: string };
      const plaintext = decryptForUser(
        { ciphertext: project.dataEncrypted, iv: meta.iv, authTag: meta.authTag },
        keyId,
      );
      return { ...project, data: JSON.parse(plaintext), dataEncrypted: undefined, encryptionMeta: undefined };
    } catch (err) {
      logger.error('Failed to decrypt project data', { projectId: project.id, error: err });
      throw new Error('Failed to decrypt project data. The encryption key may have changed.');
    }
  }
  // Legacy row — unencrypted data column
  return project;
}

// ---------------------------------------------------------------------------

export interface AppState {
  meta: {
    title: string;
    author: string;
    description: string;
    tags: string[];
    appVersion?: string;
    currentDate?: string;
  };
  chapters: any[];
  activeChapterId: string | null;
  characters: any[];
  events: any[];
  relationships: any[];
  comments: Record<string, any>;
  timeline: any;
  viewMode: 'write' | 'source' | 'preview';
  context: 'writer' | 'codex';
  activeCodexTab: 'timeline' | 'characters' | 'events' | 'relationships';
  activeModal: string;
  editingItemId: string | null;
  viewingItemId: string | null;
  prefilledEventData?: any;
  themeCustomizations?: any[];
}

class ProjectService {
  async createOrUpdateProject(guestId: string, title: string, data: AppState) {
    try {
      const storage = buildStoragePayload(data, guestId);
      const appVersion = data.meta?.appVersion || '2.2.0';

      // Check if project exists for this guest with this title
      const existing = await prisma.project.findFirst({
        where: {
          guestId,
          title,
        },
      });

      if (existing) {
        // Update existing project
        const updated = await prisma.project.update({
          where: { id: existing.id },
          data: {
            ...storage,
            version: appVersion,
            updatedAt: new Date(),
          },
        });
        logger.info(`Project updated: ${updated.id}`);
        return { project: updated, isNew: false };
      } else {
        // Create new project
        const created = await prisma.project.create({
          data: {
            guestId,
            title,
            ...storage,
            version: appVersion,
          },
        });
        logger.info(`Project created: ${created.id}`);
        return { project: created, isNew: true };
      }
    } catch (error) {
      logger.error('Error creating/updating project:', error);
      throw error;
    }
  }

  async listProjects(guestId: string) {
    try {
      const projects = await prisma.project.findMany({
        where: { guestId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return projects;
    } catch (error) {
      logger.error('Error listing projects:', error);
      throw error;
    }
  }

  async getProject(id: string, guestId: string) {
    try {
      const project = await prisma.project.findFirst({
        where: { id, guestId },
      });
      if (!project) return null;
      return restoreData(project, guestId);
    } catch (error) {
      logger.error('Error getting project:', error);
      throw error;
    }
  }

  async updateProject(id: string, guestId: string, updates: { title?: string; data: AppState }) {
    try {
      const existing = await prisma.project.findFirst({
        where: { id, guestId },
        select: { id: true },
      });

      if (!existing) {
        throw new Error('Record to update not found');
      }

      const storage = buildStoragePayload(updates.data, guestId);
      const appVersion = updates.data.meta?.appVersion || '2.2.0';

      const updated = await prisma.project.update({
        where: { id: existing.id },
        data: {
          ...(updates.title && { title: updates.title }),
          ...storage,
          version: appVersion,
          updatedAt: new Date(),
        },
      });
      logger.info(`Project updated: ${updated.id}`);
      return updated;
    } catch (error) {
      logger.error('Error updating project:', error);
      throw error;
    }
  }

  async deleteProject(id: string, guestId: string) {
    try {
      const existing = await prisma.project.findFirst({
        where: { id, guestId },
        select: { id: true },
      });

      if (!existing) {
        throw new Error('Record to delete does not exist');
      }

      await prisma.project.delete({
        where: { id: existing.id },
      });
      logger.info(`Project deleted: ${id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting project:', error);
      throw error;
    }
  }
}

export const projectService = new ProjectService();
