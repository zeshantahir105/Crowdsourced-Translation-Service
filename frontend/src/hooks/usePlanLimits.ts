import { useEffect, useState } from "react";
import { api } from "../api";

export type TierLimits = {
  maxTextChars: number;
  maxDocBytes: number;
  allowedDocExtensions: string[];
};

export type PlanLimitsResponse = { free: TierLimits; premium: TierLimits };

export const DEFAULT_PLAN_LIMITS: PlanLimitsResponse = {
  free: {
    maxTextChars: 5000,
    maxDocBytes: 256 * 1024,
    allowedDocExtensions: ["txt"],
  },
  premium: {
    maxTextChars: 100_000,
    maxDocBytes: 10 * 1024 * 1024,
    allowedDocExtensions: ["txt", "docx", "pdf"],
  },
};

export function usePlanLimits() {
  const [limits, setLimits] = useState<PlanLimitsResponse>(DEFAULT_PLAN_LIMITS);
  useEffect(() => {
    let cancelled = false;
    api<PlanLimitsResponse>("/plans/limits")
      .then((data) => {
        if (!cancelled && data?.free && data?.premium) setLimits(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return limits;
}
