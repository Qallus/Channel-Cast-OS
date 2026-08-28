"use client";

// Whether the main sidebar is collapsed, published to the pages inside it.
//
// Pages that carry their own action rail need this: with the sidebar collapsed
// there's room for a vertical rail beside the content, and with it expanded
// there isn't, so the rail folds back into the header.

import { createContext, useContext } from "react";

const SidebarStateContext = createContext<{ collapsed: boolean }>({ collapsed: false });

export const SidebarStateProvider = SidebarStateContext.Provider;

/** False when there's no provider, so a page can render outside the shell. */
export function useSidebarCollapsed(): boolean {
  return useContext(SidebarStateContext).collapsed;
}
