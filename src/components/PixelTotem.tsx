"use client";

import type { Totem } from "@/lib/totems";

/** Full-size pixel art totem renderer (used on beacon page + profile detail) */
export default function PixelTotem({
  totem,
  color,
  bgColor,
  size,
}: {
  totem: Totem;
  color: string;
  bgColor: string;
  size: number;
}) {
  const rows = totem.grid.length;
  const cols = totem.grid[0].length;
  const cellSize = Math.floor(size / Math.max(rows, cols));
  const gap = Math.max(1, Math.floor(cellSize * 0.08));

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        gap: `${gap}px`,
      }}
    >
      {totem.grid.flatMap((row, r) =>
        row.split("").map((cell, c) => (
          <div
            key={`${r}-${c}`}
            style={{
              width: cellSize,
              height: cellSize,
              borderRadius: Math.max(2, cellSize * 0.1),
              background:
                cell === "0"
                  ? "transparent"
                  : cell === "2"
                    ? bgColor
                    : color,
              boxShadow:
                cell === "1"
                  ? `0 0 ${cellSize * 0.4}px ${color}30`
                  : "none",
            }}
          />
        ))
      )}
    </div>
  );
}
