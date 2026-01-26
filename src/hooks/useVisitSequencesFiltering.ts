import { useMemo, useState } from "react";
import { startOfDay, endOfDay, isAfter, isBefore } from "date-fns";

export type VisitSequencesScopeFilter = "all" | "unlocalized" | "orphaned";
export type VisitSequencesPartieFilter = "all" | "commune" | "privative";
export type VisitSequencesCaptureModeFilter = "all" | "step_by_step" | "freeform";
export type VisitSequencesConditionFilter = "all" | "neuf" | "bon" | "a_refaire" | "tres_abime";

export interface VisitSequenceLike {
  id: string;
  location_id: string | null;
  location_name?: string;
  location_type?: string;
  endroit_name?: string | null;
  zone_type?: string | null;
  part_id?: string | null;
  capture_mode?: string | null;
  created_at?: string | Date;
  user_condition?: string | null;
  detected_condition?: string | null;
}

export interface UseVisitSequencesFilteringParams<T extends VisitSequenceLike> {
  sequences: T[];
  locations: Array<{ id: string }>;
  parts: Array<{ id: string }>;
  isSequenceLocalized: (seq: T) => boolean;
  isSequenceOrphaned: (seq: T) => boolean;
  isCommune: (locationType: string | undefined) => boolean;
  isPrivative: (locationType: string | undefined) => boolean;
}

export function useVisitSequencesFiltering<T extends VisitSequenceLike>({
  sequences,
  locations,
  parts,
  isSequenceLocalized,
  isSequenceOrphaned,
  isCommune,
  isPrivative,
}: UseVisitSequencesFilteringParams<T>) {
  const [scope, setScope] = useState<VisitSequencesScopeFilter>("all");
  const [partie, setPartie] = useState<VisitSequencesPartieFilter>("all");
  const [lieuId, setLieuId] = useState<string>("all");
  const [endroit, setEndroit] = useState<string>("all");
  const [zone, setZone] = useState<string>("all");
  const [captureMode, setCaptureMode] = useState<VisitSequencesCaptureModeFilter>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [condition, setCondition] = useState<VisitSequencesConditionFilter>("all");

  const stats = useMemo(() => {
    const unlocalized = sequences.filter((s) => !isSequenceLocalized(s)).length;
    const orphaned = sequences.filter((s) => isSequenceOrphaned(s)).length;
    return {
      total: sequences.length,
      unlocalized,
      orphaned,
    };
  }, [sequences, isSequenceLocalized, isSequenceOrphaned]);

  const scopeFiltered = useMemo(() => {
    return sequences.filter((seq) => {
      if (scope === "unlocalized") return !isSequenceLocalized(seq);
      if (scope === "orphaned") return isSequenceOrphaned(seq);
      return true;
    });
  }, [sequences, scope, isSequenceLocalized, isSequenceOrphaned]);

  const filteredSequences = useMemo(() => {
    return scopeFiltered.filter((seq) => {
      if (captureMode !== "all") {
        const mode = (seq.capture_mode ?? "step_by_step") as "step_by_step" | "freeform";
        if (mode !== captureMode) return false;
      }

      if (partie !== "all") {
        if (partie === "commune" && !isCommune(seq.location_type)) return false;
        if (partie === "privative" && !isPrivative(seq.location_type)) return false;
      }

      if (lieuId !== "all" && seq.location_id !== lieuId) return false;
      if (endroit !== "all" && seq.endroit_name !== endroit) return false;
      if (zone !== "all" && seq.zone_type !== zone) return false;

      // Filter by date range
      if (dateFrom || dateTo) {
        const seqDate = seq.created_at 
          ? (typeof seq.created_at === 'string' ? new Date(seq.created_at) : seq.created_at)
          : null;
        
        if (!seqDate) return false;
        
        if (dateFrom) {
          const fromDate = startOfDay(dateFrom);
          if (isBefore(seqDate, fromDate) && seqDate.getTime() !== fromDate.getTime()) return false;
        }
        
        if (dateTo) {
          const toDate = endOfDay(dateTo);
          if (isAfter(seqDate, toDate) && seqDate.getTime() !== toDate.getTime()) return false;
        }
      }

      // Filter by condition
      if (condition !== "all") {
        const seqCondition = seq.user_condition || seq.detected_condition;
        if (seqCondition !== condition) return false;
      }

      return true;
    });
  }, [scopeFiltered, captureMode, partie, lieuId, endroit, zone, dateFrom, dateTo, condition, isCommune, isPrivative]);

  const options = useMemo(() => {
    // Options are computed from the dataset already constrained by scope + (captureMode, partie)
    // so the UI stays coherent and avoids "empty" filters.
    const base = scopeFiltered.filter((seq) => {
      if (captureMode !== "all") {
        const mode = (seq.capture_mode ?? "step_by_step") as "step_by_step" | "freeform";
        if (mode !== captureMode) return false;
      }
      if (partie !== "all") {
        if (partie === "commune" && !isCommune(seq.location_type)) return false;
        if (partie === "privative" && !isPrivative(seq.location_type)) return false;
      }
      return true;
    });

    const lieux = new Map<string, string>();
    const endroits = new Set<string>();
    const zones = new Set<string>();

    base.forEach((seq) => {
      if (seq.location_id && seq.location_name) lieux.set(seq.location_id, seq.location_name);
      if (seq.endroit_name) endroits.add(seq.endroit_name);
      if (seq.zone_type) zones.add(seq.zone_type);
    });

    return {
      lieux: Array.from(lieux.entries()).map(([id, name]) => ({ id, name })),
      endroits: Array.from(endroits).sort((a, b) => a.localeCompare(b, "fr")),
      zones: Array.from(zones).sort((a, b) => a.localeCompare(b, "fr")),
    };
  }, [scopeFiltered, captureMode, partie, isCommune, isPrivative]);

  const resetAll = () => {
    setScope("all");
    setPartie("all");
    setLieuId("all");
    setEndroit("all");
    setZone("all");
    setCaptureMode("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setCondition("all");
  };

  // Coherence: when a higher-level filter changes, reset more specific ones.
  const setScopeCoherent = (next: VisitSequencesScopeFilter) => {
    setScope(next);
    // Keep the rest: users often want to keep their context.
  };

  const setPartieCoherent = (next: VisitSequencesPartieFilter) => {
    setPartie(next);
    setLieuId("all");
    setEndroit("all");
    setZone("all");
  };

  const setLieuCoherent = (next: string) => {
    setLieuId(next);
    setEndroit("all");
    setZone("all");
  };

  const setEndroitCoherent = (next: string) => {
    setEndroit(next);
    setZone("all");
  };

  return {
    state: { scope, partie, lieuId, endroit, zone, captureMode, dateFrom, dateTo, condition },
    actions: {
      setScope: setScopeCoherent,
      setPartie: setPartieCoherent,
      setLieuId: setLieuCoherent,
      setEndroit: setEndroitCoherent,
      setZone,
      setCaptureMode,
      setDateFrom,
      setDateTo,
      setCondition,
      resetAll,
    },
    options,
    stats,
    filteredSequences,
  };
}
