
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project, SavedCalc, ProjectVar } from "@/lib/workspace/types";
import { createProject, TEMPLATES } from "@/lib/workspace/types";

interface WorkspaceStore {
  projects: Project[];

  // CRUD
  addProject: (name: string, templateId?: string) => string; // returns id
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => string;
  togglePin: (id: string) => void;
  archiveProject: (id: string) => void;

  // Calculations
  addCalcToProject: (projectId: string, calc: Omit<SavedCalc, "id" | "createdAt">) => void;
  removeCalcFromProject: (projectId: string, calcId: string) => void;

  // Variables
  addVariable: (projectId: string, variable: Omit<ProjectVar, "id">) => void;
  updateVariable: (projectId: string, varId: string, updates: Partial<ProjectVar>) => void;
  removeVariable: (projectId: string, varId: string) => void;

  // Notes
  updateNotes: (projectId: string, notes: string) => void;

  // Query helpers
  getProject: (id: string) => Project | undefined;
  getActiveProjects: () => Project[];
  getArchivedProjects: () => Project[];
  getPinnedProjects: () => Project[];
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      projects: [],

      addProject: (name, templateId) => {
        const template = templateId ? TEMPLATES.find(t => t.id === templateId) : undefined;
        const proj = createProject(name, template);
        set({ projects: [proj, ...get().projects] });
        return proj.id;
      },

      updateProject: (id, updates) => {
        set({
          projects: get().projects.map(p =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
          ),
        });
      },

      deleteProject: (id) => {
        set({ projects: get().projects.filter(p => p.id !== id) });
      },

      duplicateProject: (id) => {
        const orig = get().projects.find(p => p.id === id);
        if (!orig) return "";
        const now = Date.now();
        const dup: Project = {
          ...orig,
          id: `proj-${now}-${Math.random().toString(36).slice(2, 8)}`,
          name: `${orig.name} (Copy)`,
          createdAt: now,
          updatedAt: now,
          isPinned: false,
        };
        set({ projects: [dup, ...get().projects] });
        return dup.id;
      },

      togglePin: (id) => {
        set({
          projects: get().projects.map(p =>
            p.id === id ? { ...p, isPinned: !p.isPinned, updatedAt: Date.now() } : p
          ),
        });
      },

      archiveProject: (id) => {
        set({
          projects: get().projects.map(p =>
            p.id === id ? { ...p, isArchived: !p.isArchived, updatedAt: Date.now() } : p
          ),
        });
      },

      addCalcToProject: (projectId, calc) => {
        const c: SavedCalc = { ...calc, id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() };
        set({
          projects: get().projects.map(p =>
            p.id === projectId ? { ...p, calculations: [c, ...p.calculations], updatedAt: Date.now() } : p
          ),
        });
      },

      removeCalcFromProject: (projectId, calcId) => {
        set({
          projects: get().projects.map(p =>
            p.id === projectId ? { ...p, calculations: p.calculations.filter(c => c.id !== calcId), updatedAt: Date.now() } : p
          ),
        });
      },

      addVariable: (projectId, variable) => {
        const v: ProjectVar = { ...variable, id: `var-${Date.now()}` };
        set({
          projects: get().projects.map(p =>
            p.id === projectId ? { ...p, variables: [...p.variables, v], updatedAt: Date.now() } : p
          ),
        });
      },

      updateVariable: (projectId, varId, updates) => {
        set({
          projects: get().projects.map(p =>
            p.id === projectId
              ? { ...p, variables: p.variables.map(v => v.id === varId ? { ...v, ...updates } : v), updatedAt: Date.now() }
              : p
          ),
        });
      },

      removeVariable: (projectId, varId) => {
        set({
          projects: get().projects.map(p =>
            p.id === projectId ? { ...p, variables: p.variables.filter(v => v.id !== varId), updatedAt: Date.now() } : p
          ),
        });
      },

      updateNotes: (projectId, notes) => {
        set({
          projects: get().projects.map(p =>
            p.id === projectId ? { ...p, notes, updatedAt: Date.now() } : p
          ),
        });
      },

      getProject: (id) => get().projects.find(p => p.id === id),
      getActiveProjects: () => get().projects.filter(p => !p.isArchived),
      getArchivedProjects: () => get().projects.filter(p => p.isArchived),
      getPinnedProjects: () => get().projects.filter(p => p.isPinned && !p.isArchived),
    }),
    {
      name: "machinist-pro-workspace",
    }
  )
);
