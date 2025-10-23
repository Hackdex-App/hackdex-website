"use client";

import React from "react";
import Image from "next/image";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RxDragHandleDots2 } from "react-icons/rx";

export interface SortableCoverItemData {
  id: string;
  url: string;
  filename: string;
  isNew?: boolean;
}

interface SortableCoversProps {
  items: SortableCoverItemData[];
  onReorder: (oldIndex: number, newIndex: number) => void;
  onRemove: (index: number) => void;
}

function Row({ id, index, url, filename, isNew, onRemove }: { id: string; index: number; url: string; filename: string; isNew?: boolean; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  function handleRemove() {
    if (!isNew) {
      const ok = window.confirm("Delete this screenshot?");
      if (!ok) return;
    }
    onRemove();
  }
  return (
    <div ref={setNodeRef} style={style} className="rounded-md">
      <div className={`h-16 flex items-center justify-between gap-3 p-2 bg-[var(--surface-2)] ring-1 ring-inset ring-[var(--border)] ${isDragging ? "opacity-60" : ""}`}>
        <div className="flex items-center gap-3">
          <div className="cursor-grab select-none pr-1 text-foreground/60" title="Drag to reorder" {...attributes} {...listeners}>
            <RxDragHandleDots2 size={24} />
          </div>
          <div className="relative h-12 w-20 overflow-hidden rounded">
            <Image src={url} alt={`Cover ${index + 1}`} fill className="object-cover" unoptimized />
          </div>
          <div className="min-w-0">
            <div className="truncate max-w-[260px] text-xs text-foreground/80">{filename}</div>
            {index === 0 && <div className="text-[10px] text-emerald-400/90">Primary</div>}
            {isNew && <div className="text-[10px] text-amber-400/90">New</div>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex h-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs text-red-600 transition-colors hover:bg-black/5 dark:text-red-300 dark:hover:bg-white/10"
          >
            {isNew ? 'Remove' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SortableCovers({ items, onReorder, onRemove }: SortableCoversProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function onDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = items.map((it) => it.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(oldIndex, newIndex);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
        {items.map((it, i) => (
          <Row
            key={it.id}
            id={it.id}
            index={i}
            url={it.url}
            filename={it.filename}
            isNew={it.isNew}
            onRemove={() => onRemove(i)}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}


