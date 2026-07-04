"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  buildDiscoverSearchParams,
  discoverUrlStatesEqual,
  parseDiscoverSearchParams,
  type DiscoverUrlState,
} from "@/app/discover/search-params";

const SEARCH_URL_DEBOUNCE_MS = 300;

type UrlSyncMode = "push" | "replace";

interface UseDiscoverUrlStateArgs {
  currentState: DiscoverUrlState;
  onUrlStateChange: (state: DiscoverUrlState) => void;
}

export function useDiscoverUrlState({ currentState, onUrlStateChange }: UseDiscoverUrlStateArgs) {
  const pathname = usePathname();
  const searchUrlTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentStateRef = React.useRef(currentState);
  const onUrlStateChangeRef = React.useRef(onUrlStateChange);

  React.useEffect(() => {
    currentStateRef.current = currentState;
  }, [currentState]);

  React.useEffect(() => {
    onUrlStateChangeRef.current = onUrlStateChange;
  }, [onUrlStateChange]);

  const clearSearchUrlTimeout = React.useCallback(() => {
    if (searchUrlTimeoutRef.current) {
      clearTimeout(searchUrlTimeoutRef.current);
      searchUrlTimeoutRef.current = null;
    }
  }, []);

  const syncUrl = React.useCallback(
    (state: DiscoverUrlState, mode: UrlSyncMode = "push") => {
      if (typeof window === "undefined") return;

      const nextState = {
        ...state,
        page: Math.max(1, state.page),
        baseRoms: state.onlyReady ? [] : state.baseRoms,
      };
      const nextParams = buildDiscoverSearchParams(nextState).toString();
      const currentParams = new URLSearchParams(window.location.search).toString();
      if (nextParams === currentParams) return;

      // This is only for client-side Discover state. If these params ever need
      // to change server-rendered data, metadata, or route output, use Next
      // navigation/searchParams instead of directly updating browser history.
      const url = nextParams ? `${pathname}?${nextParams}` : pathname;
      if (mode === "replace") {
        window.history.replaceState(null, "", url);
      } else {
        window.history.pushState(null, "", url);
      }
    },
    [pathname]
  );

  const syncUrlWith = React.useCallback(
    (overrides: Partial<DiscoverUrlState>, mode: UrlSyncMode = "push") => {
      if (mode === "push") clearSearchUrlTimeout();
      syncUrl({ ...currentStateRef.current, ...overrides }, mode);
    },
    [clearSearchUrlTimeout, syncUrl]
  );

  const scheduleSearchUrlSync = React.useCallback(
    (state: DiscoverUrlState) => {
      clearSearchUrlTimeout();
      searchUrlTimeoutRef.current = setTimeout(() => {
        syncUrl(state, "replace");
        searchUrlTimeoutRef.current = null;
      }, SEARCH_URL_DEBOUNCE_MS);
    },
    [clearSearchUrlTimeout, syncUrl]
  );

  React.useEffect(() => clearSearchUrlTimeout, [clearSearchUrlTimeout]);

  React.useEffect(() => {
    const applyUrlState = () => {
      const nextState = parseDiscoverSearchParams(new URLSearchParams(window.location.search));
      if (discoverUrlStatesEqual(nextState, currentStateRef.current)) return;

      clearSearchUrlTimeout();
      onUrlStateChangeRef.current(nextState);
    };

    window.addEventListener("popstate", applyUrlState);
    return () => window.removeEventListener("popstate", applyUrlState);
  }, [clearSearchUrlTimeout]);

  return {
    syncUrl,
    syncUrlWith,
    scheduleSearchUrlSync,
  };
}
