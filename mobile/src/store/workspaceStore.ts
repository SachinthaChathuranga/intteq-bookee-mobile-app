import { create } from 'zustand';
import type { UserRole } from './authStore';

interface WorkspaceState {
  activeWorkspace: UserRole | null;
  setActiveWorkspace: (workspace: UserRole | null) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspace: null,
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  clearWorkspace: () => set({ activeWorkspace: null }),
}));
