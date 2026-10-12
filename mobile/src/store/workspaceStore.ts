import { create } from 'zustand';
import type { UserRole } from './authStore';

interface WorkspaceState {
  activeWorkspace: UserRole | null;
  activeBranchId: string | null;
  setActiveWorkspace: (workspace: UserRole | null) => void;
  setActiveBranchId: (branchId: string | null) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspace: null,
  activeBranchId: null,
  setActiveWorkspace: (workspace) =>
    set({
      activeWorkspace: workspace,
      activeBranchId: workspace?.branch_id ?? null,
    }),
  setActiveBranchId: (branchId) => set({ activeBranchId: branchId }),
  clearWorkspace: () => set({ activeWorkspace: null, activeBranchId: null }),
}));
