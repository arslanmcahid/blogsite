"use client";

import {
  closestCenter,
  type CollisionDetection,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { HTMLAttributes, ReactNode, Ref } from "react";

/**
 * Dikey listeler için çarpışma algılama. Varsayılan `closestCenter` merkezleri
 * karşılaştırdığından çok uzun bir bölüm (örn. içinde editörler olan sütunlar)
 * komşusuna hiç ulaşamaz. Burada fare imlecinin (klavyede sürüklenen bölümün
 * ilerlediği yöndeki kenarının) hangi satırın içinde kaldığına bakılır.
 */
const verticalCollision: CollisionDetection = (args) => {
  const { pointerCoordinates, collisionRect, droppableRects, droppableContainers, active } = args;
  const initial = active.rect.current.initial;
  const movingDown = !!initial && collisionRect.top > initial.top;
  // Fare: imlecin yeri. Klavye: aşağı giderken sürüklenen bölümün alt, yukarı giderken üst kenarı.
  const y = pointerCoordinates ? pointerCoordinates.y : movingDown ? collisionRect.top + collisionRect.height - 8 : collisionRect.top + 8;
  const hits = droppableContainers.flatMap((container) => {
    const rect = droppableRects.get(container.id);
    return rect && y >= rect.top && y <= rect.top + rect.height ? [{ id: container.id, data: { droppableContainer: container, value: 0 } }] : [];
  });
  return hits.length ? hits : closestCenter(args);
};

export type HandleProps = HTMLAttributes<HTMLElement> & { ref: Ref<HTMLButtonElement> };

/**
 * Sürükleyerek sıralanabilen liste. Tutacaktan (⠿) fare, dokunma ve klavye
 * (Boşluk ile al, ok tuşlarıyla taşı, Boşluk ile bırak) ile sıralanır.
 */
export function SortableList<T extends { id: string }>({
  items,
  onChange,
  layout = "vertical",
  className,
  children,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  layout?: "vertical" | "grid";
  className?: string;
  children: (item: T, index: number, handle: HandleProps, dragging: boolean) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), // yanlışlıkla sürüklemeyi önler
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from >= 0 && to >= 0) onChange(arrayMove(items, from, to));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={layout === "grid" ? closestCenter : verticalCollision} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item, index) => (
            <Row key={item.id} id={item.id}>
              {(handle, dragging) => children(item, index, handle, dragging)}
            </Row>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function Row({ id, children }: { id: string; children: (handle: HandleProps, dragging: boolean) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = { ...attributes, ...listeners, ref: setActivatorNodeRef } as HandleProps;
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 5 : undefined, opacity: isDragging ? 0.85 : 1 }}>
      {children(handle, isDragging)}
    </div>
  );
}

/** Sürükleme tutacağı düğmesi. */
export function DragHandle({ handle, label = "Sürükleyerek sırala" }: { handle: HandleProps; label?: string }) {
  const { ref, ...rest } = handle;
  return (
    <button type="button" ref={ref} className="drag-handle" aria-label={label} title={label} {...rest}>
      ⠿
    </button>
  );
}
