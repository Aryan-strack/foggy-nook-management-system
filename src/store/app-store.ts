import { create } from "zustand";
import type { Profile, Branch } from "@/types";

interface AppState {
  profile: Profile | null;
  branches: Branch[];
  activeBranchId: string | null; // for admin/super_admin switching branch view; null = "all branches"
  setProfile: (profile: Profile | null) => void;
  setBranches: (branches: Branch[]) => void;
  setActiveBranchId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  branches: [],
  activeBranchId: null,
  setProfile: (profile) =>
    set({
      profile,
      // managers are always scoped to their own branch
      activeBranchId: profile?.role === "manager" ? profile.branch_id : null,
    }),
  setBranches: (branches) => set({ branches }),
  setActiveBranchId: (id) => set({ activeBranchId: id }),
}));
