import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface AppState {
  meta: {
    title: string;
    author: string;
    description: string;
    tags: string[];
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
            data: data as any,
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
            data: data as any,
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
      return project;
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

      const updated = await prisma.project.update({
        where: { id: existing.id },
        data: {
          ...(updates.title && { title: updates.title }),
          data: updates.data as any,
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
