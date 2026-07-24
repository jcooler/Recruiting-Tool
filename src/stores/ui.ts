"use client";

import { create } from "zustand";

export interface UiState {
  drawerCandidateId: string | null;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  view: "board" | "table";
  setView: (v: "board" | "table") => void;
  addCandidateOpen: boolean;
  setAddCandidateOpen: (v: boolean) => void;
}

// Ephemeral UI-only state (drawer/palette/view/add-candidate-modal). No
// persistence middleware on purpose: none of this should survive a reload.
export const useUiStore = create<UiState>()((set) => ({
  drawerCandidateId: null,
  openDrawer: (id) => set({ drawerCandidateId: id }),
  closeDrawer: () => set({ drawerCandidateId: null }),

  paletteOpen: false,
  setPaletteOpen: (v) => set({ paletteOpen: v }),

  view: "board",
  setView: (v) => set({ view: v }),

  addCandidateOpen: false,
  setAddCandidateOpen: (v) => set({ addCandidateOpen: v }),
}));
