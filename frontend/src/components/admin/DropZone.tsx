"use client";

import { useState } from "react";

/**
 * İçindeki alana dosya sürüklenince vurgulanır ve bırakılan resimleri onFiles'a verir.
 * Dosya olmayan sürüklemeleri (blok sıralama gibi) görmezden gelir.
 */
export function DropZone({
  onFiles,
  children,
  hint = "Resimleri buraya bırak",
  className = "",
}: {
  onFiles: (files: File[]) => void;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  const [over, setOver] = useState(false);
  const hasFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types).includes("Files");

  return (
    <div
      className={`dropzone ${over ? "over" : ""} ${className}`}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setOver(false);
        const files = Array.from(e.dataTransfer.files).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length) onFiles(files);
      }}
    >
      {children}
      {over && <div className="dropzone-hint">{hint}</div>}
    </div>
  );
}
