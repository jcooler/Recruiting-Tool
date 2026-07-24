import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "@/stores/ui";

const initialState = useUiStore.getState();

beforeEach(() => {
  useUiStore.setState(initialState, true);
});

describe("useUiStore", () => {
  it("starts with drawer closed, board view, palette and add-candidate closed", () => {
    const s = useUiStore.getState();
    expect(s.drawerCandidateId).toBeNull();
    expect(s.paletteOpen).toBe(false);
    expect(s.view).toBe("board");
    expect(s.addCandidateOpen).toBe(false);
  });

  it("openDrawer sets drawerCandidateId, closeDrawer clears it", () => {
    useUiStore.getState().openDrawer("cand-1");
    expect(useUiStore.getState().drawerCandidateId).toBe("cand-1");

    useUiStore.getState().closeDrawer();
    expect(useUiStore.getState().drawerCandidateId).toBeNull();
  });

  it("openDrawer replaces the previous candidate id", () => {
    useUiStore.getState().openDrawer("cand-1");
    useUiStore.getState().openDrawer("cand-2");
    expect(useUiStore.getState().drawerCandidateId).toBe("cand-2");
  });

  it("setPaletteOpen toggles paletteOpen", () => {
    useUiStore.getState().setPaletteOpen(true);
    expect(useUiStore.getState().paletteOpen).toBe(true);
    useUiStore.getState().setPaletteOpen(false);
    expect(useUiStore.getState().paletteOpen).toBe(false);
  });

  it("setView transitions between board and table", () => {
    useUiStore.getState().setView("table");
    expect(useUiStore.getState().view).toBe("table");
    useUiStore.getState().setView("board");
    expect(useUiStore.getState().view).toBe("board");
  });

  it("setAddCandidateOpen toggles addCandidateOpen", () => {
    useUiStore.getState().setAddCandidateOpen(true);
    expect(useUiStore.getState().addCandidateOpen).toBe(true);
    useUiStore.getState().setAddCandidateOpen(false);
    expect(useUiStore.getState().addCandidateOpen).toBe(false);
  });

  it("state slices are independent of one another", () => {
    useUiStore.getState().openDrawer("cand-1");
    useUiStore.getState().setView("table");
    useUiStore.getState().setPaletteOpen(true);

    const s = useUiStore.getState();
    expect(s.drawerCandidateId).toBe("cand-1");
    expect(s.view).toBe("table");
    expect(s.paletteOpen).toBe(true);
    expect(s.addCandidateOpen).toBe(false);
  });
});
