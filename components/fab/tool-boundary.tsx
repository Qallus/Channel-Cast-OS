"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

// Keeps a crashing tool from taking down the whole page — renders a small
// inline fallback instead. Reset it by remounting (key it by the active tool).
export class ToolBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("[FAB] tool crashed:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <p className="text-sm font-medium text-foreground">This tool hit an error.</p>
          <p className="max-w-xs break-words text-xs text-muted-foreground">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
