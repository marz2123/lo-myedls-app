import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal, X, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  VisitSequencesCaptureModeFilter,
  VisitSequencesPartieFilter,
  VisitSequencesScopeFilter,
  VisitSequencesConditionFilter,
} from "@/hooks/useVisitSequencesFiltering";

export type VisitSequencesFiltersState = {
  scope: VisitSequencesScopeFilter;
  partie: VisitSequencesPartieFilter;
  lieuId: string;
  endroit: string;
  zone: string;
  captureMode: VisitSequencesCaptureModeFilter;
  dateFrom?: Date;
  dateTo?: Date;
  condition: VisitSequencesConditionFilter;
};

export type VisitSequencesFiltersActions = {
  setScope: (v: VisitSequencesScopeFilter) => void;
  setPartie: (v: VisitSequencesPartieFilter) => void;
  setLieuId: (v: string) => void;
  setEndroit: (v: string) => void;
  setZone: (v: string) => void;
  setCaptureMode: (v: VisitSequencesCaptureModeFilter) => void;
  setDateFrom: (v: Date | undefined) => void;
  setDateTo: (v: Date | undefined) => void;
  setCondition: (v: VisitSequencesConditionFilter) => void;
  resetAll: () => void;
};

export function VisitSequencesFilterBar({
  state,
  actions,
  options,
  stats,
  canBatch,
  onOpenBatch,
  zoneLabel,
}: {
  state: VisitSequencesFiltersState;
  actions: VisitSequencesFiltersActions;
  options: { lieux: Array<{ id: string; name: string }>; endroits: string[]; zones: string[] };
  stats: { total: number; unlocalized: number; orphaned: number };
  canBatch: boolean;
  onOpenBatch: () => void;
  zoneLabel: (zone: string) => string;
}) {
  const [open, setOpen] = useState(false);
  
  const handleOpenFilters = () => {
    console.log('[FilterBar] Opening filters sheet');
    setOpen(true);
  };


  const isDirty =
    state.scope !== "all" ||
    state.partie !== "all" ||
    state.lieuId !== "all" ||
    state.endroit !== "all" ||
    state.zone !== "all" ||
    state.captureMode !== "all" ||
    state.dateFrom !== undefined ||
    state.dateTo !== undefined ||
    state.condition !== "all";

  const activeCount = [
    state.scope !== "all",
    state.partie !== "all",
    state.lieuId !== "all",
    state.endroit !== "all",
    state.zone !== "all",
    state.captureMode !== "all",
    state.dateFrom !== undefined,
    state.dateTo !== undefined,
    state.condition !== "all",
  ].filter(Boolean).length;

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={isDirty ? "default" : "secondary"}
          size="sm"
          className="h-8 rounded-xl px-3"
          onClick={handleOpenFilters}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 mr-2" />
          Filtres
          {activeCount > 0 && (
            <span className="ml-1.5 min-w-[18px] h-[18px] rounded-full bg-primary-foreground/20 text-[10px] font-semibold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </Button>

        {isDirty && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl"
            onClick={actions.resetAll}
            aria-label="Réinitialiser"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl flex flex-col">
          {/* Header fixe */}
          <header className="shrink-0 p-4 pb-0 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Filtres</h3>
              <p className="text-xs text-muted-foreground">Affinez la liste des séquences</p>
            </div>
            {isDirty && (
              <Button variant="secondary" size="sm" className="h-8 rounded-xl" onClick={actions.resetAll}>
                Réinitialiser
              </Button>
            )}
          </header>

          {/* Contenu scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5">
            {/* Scope */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Statut</p>
              <div className="inline-flex items-center bg-muted/40 rounded-xl p-0.5">
                {([
                  { key: "all" as const, label: "Toutes", count: stats.total },
                  { key: "unlocalized" as const, label: "À localiser", count: stats.unlocalized },
                  { key: "orphaned" as const, label: "Incohérentes", count: stats.orphaned },
                ]).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => actions.setScope(item.key)}
                    className={
                      "h-8 px-3 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap " +
                      (state.scope === item.key
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {item.label}
                    <span className="ml-1 text-[10px] opacity-60 tabular-nums">{item.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode de capture */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Mode de capture</p>
              <div className="inline-flex items-center bg-muted/40 rounded-xl p-0.5">
                {([
                  ["all", "Tout"],
                  ["step_by_step", "Pas à pas"],
                  ["freeform", "À la volée"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => actions.setCaptureMode(value)}
                    className={
                      "h-8 px-3 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap " +
                      (state.captureMode === value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parties */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Parties</p>
              <div className="inline-flex items-center bg-muted/40 rounded-xl p-0.5">
                {([
                  ["all", "Tout"],
                  ["commune", "Communes"],
                  ["privative", "Privatives"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => actions.setPartie(value)}
                    className={
                      "h-8 px-3 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap " +
                      (state.partie === value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Lieu</p>
                <Select value={state.lieuId} onValueChange={actions.setLieuId}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Tous les lieux" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les lieux</SelectItem>
                    {options.lieux.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Endroit</p>
                <Select value={state.endroit} onValueChange={actions.setEndroit}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Tous endroits" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous endroits</SelectItem>
                    {options.endroits.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Zone</p>
                <Select value={state.zone} onValueChange={actions.setZone}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Toutes zones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes zones</SelectItem>
                    {options.zones.map((z) => (
                      <SelectItem key={z} value={z}>
                        {zoneLabel(z)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Date de création</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dateFrom" className="text-[10px] text-muted-foreground">Du</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={state.dateFrom ? state.dateFrom.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      actions.setDateFrom(date);
                    }}
                    className="h-11 rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dateTo" className="text-[10px] text-muted-foreground">Au</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={state.dateTo ? state.dateTo.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      actions.setDateTo(date);
                    }}
                    className="h-11 rounded-2xl"
                  />
                </div>
              </div>
            </div>

            {/* Condition/État */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">État</p>
              <div className="inline-flex items-center bg-muted/40 rounded-xl p-0.5">
                {([
                  ["all", "Tous"],
                  ["neuf", "Neuf"],
                  ["bon", "Bon"],
                  ["a_refaire", "À refaire"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => actions.setCondition(value)}
                    className={
                      "h-8 px-3 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap " +
                      (state.condition === value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer fixe */}
          <footer className="shrink-0 p-4 pt-2 border-t border-border/20">
            <Button className="w-full rounded-2xl" onClick={() => setOpen(false)}>
              Voir les résultats
            </Button>
          </footer>
        </SheetContent>
      </Sheet>
    </div>
  );
}
