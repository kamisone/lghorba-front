"use client";

import { createContext, useContext } from "react";

const TzContext = createContext<string>("Europe/Paris");

export function TzProvider({
  children,
  timezone,
}: {
  children: React.ReactNode;
  timezone: string;
}) {
  return <TzContext.Provider value={timezone}>{children}</TzContext.Provider>;
}

export function useBusinessTz(): string {
  return useContext(TzContext);
}
