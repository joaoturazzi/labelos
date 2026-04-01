"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useGlobalPlayer } from "@/components/dashboard/global-player";

interface Submission {
  id: string;
  trackTitle: string;
  artistName: string;
  genre: string | null;
  aiScore: number | null;
  audioFileUrl: string;
  pipelineStage: string | null;
  submittedAt: string | null;
}

const COLUMNS = [
  { id: "triage", label: "Triagem IA", color: "#d68910" },
  { id: "review", label: "Revisão A&R", color: "#555555" },
  { id: "committee", label: "Comitê", color: "#1a5276" },
  { id: "contract", label: "Contrato", color: "#1e8449" },
  { id: "approved", label: "Aprovadas", color: "#1e8449" },
  { id: "rejected", label: "Rejeitadas", color: "#c0392b" },
];

// ── Draggable Card ───────────────────────────────────────────────────

function DemoCard({ sub, overlay }: { sub: Submission; overlay?: boolean }) {
  const { play, currentTrack, isPlaying } = useGlobalPlayer();
  const isCurrent = currentTrack?.url === sub.audioFileUrl;
  const scoreColor =
    sub.aiScore === null ? "var(--color-text4)"
    : sub.aiScore >= 70 ? "var(--color-success)"
    : sub.aiScore >= 40 ? "var(--color-warning)"
    : "var(--color-danger)";

  return (
    <div
      className="bg-bg border border-border rounded-[8px] px-3 py-2.5 cursor-grab active:cursor-grabbing"
      style={{
        boxShadow: overlay ? "0 8px 24px rgba(0,0,0,0.15)" : undefined,
        opacity: overlay ? 0.95 : 1,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {/* Score dot */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{
            background: sub.aiScore !== null ? `${scoreColor}15` : "var(--color-bg3)",
            color: scoreColor,
            border: sub.aiScore !== null ? `1.5px solid ${scoreColor}` : "1.5px dashed var(--color-border2)",
          }}
        >
          {sub.aiScore ?? "..."}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-text truncate leading-tight">
            {sub.trackTitle}
          </p>
          <p className="text-[11px] text-text3 truncate leading-tight">
            {sub.artistName}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {sub.genre && (
          <span className="text-[9px] font-bold text-text3 bg-bg2 px-1.5 py-0.5 rounded-[3px] uppercase tracking-[0.04em]">
            {sub.genre.split(",")[0]}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            play({ url: sub.audioFileUrl, title: sub.trackTitle, artist: sub.artistName });
          }}
          className="text-[10px] text-text3 hover:text-text bg-transparent border-none cursor-pointer px-1"
          style={{ fontFamily: "inherit" }}
        >
          {isCurrent && isPlaying ? "\u23F8" : "\u25B6"}
        </button>
      </div>
    </div>
  );
}

function DraggableCard({ sub }: { sub: Submission }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: sub.id,
    data: sub,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        opacity: isDragging ? 0.3 : 1,
        touchAction: "none",
      }}
    >
      <DemoCard sub={sub} />
    </div>
  );
}

// ── Droppable Column ─────────────────────────────────────────────────

function Column({
  id,
  label,
  color,
  items,
}: {
  id: string;
  label: string;
  color: string;
  items: Submission[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col rounded-[8px] overflow-hidden"
      style={{
        background: isOver ? "var(--color-bg3)" : "var(--color-bg2)",
        border: isOver ? `2px dashed ${color}` : "1px solid var(--color-border)",
        minHeight: 300,
        transition: "background 0.15s, border 0.15s",
      }}
    >
      {/* Column header */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em]">
            {label}
          </span>
        </div>
        <span className="text-[10px] font-bold text-text4 bg-bg px-1.5 py-0.5 rounded-[10px]">
          {items.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 px-2 pb-2 flex flex-col gap-1.5">
        {items.length === 0 ? (
          <div className="text-[11px] text-text4 text-center py-6">
            Arraste demos aqui
          </div>
        ) : (
          items.map((sub) => <DraggableCard key={sub.id} sub={sub} />)
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    fetch("/api/submissions")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSubmissions(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const getColumnItems = (stage: string) =>
    submissions.filter((s) => (s.pipelineStage || "triage") === stage);

  const activeSub = activeId ? submissions.find((s) => s.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const subId = active.id as string;
    const newStage = over.id as string;
    const sub = submissions.find((s) => s.id === subId);
    if (!sub) return;

    const currentStage = sub.pipelineStage || "triage";
    if (currentStage === newStage) return;

    // Optimistic update
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === subId
          ? { ...s, pipelineStage: newStage }
          : s
      )
    );

    // Persist to API
    try {
      const res = await fetch(`/api/submissions/${subId}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!res.ok) {
        // Revert on failure
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === subId ? { ...s, pipelineStage: currentStage } : s
          )
        );
      }
    } catch {
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === subId ? { ...s, pipelineStage: currentStage } : s
        )
      );
    }
  };

  if (loading) {
    return <div className="text-[13px] text-text4 text-center py-16">Carregando pipeline...</div>;
  }

  if (submissions.length === 0) {
    return (
      <div className="text-[13px] text-text4 text-center py-16">
        Nenhuma demo recebida ainda. O pipeline aparecerá quando as primeiras submissions chegarem.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[22px] font-bold text-text tracking-[-0.3px]">Pipeline</h2>
        <span className="text-[11px] text-text4">
          Arraste as demos entre as etapas
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(160px, 1fr))`, overflowX: "auto" }}
        >
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              label={col.label}
              color={col.color}
              items={getColumnItems(col.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeSub ? <DemoCard sub={activeSub} overlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
