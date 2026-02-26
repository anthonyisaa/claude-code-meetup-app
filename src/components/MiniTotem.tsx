"use client";

import { TOTEMS } from "@/lib/totems";

/** Tiny inline totem icon for profile cards (renders at ~16px) */
export default function MiniTotem({
  totemId,
  color,
  size = 16,
}: {
  totemId: string;
  color: string;
  size?: number;
}) {
  const totem = TOTEMS.find((t) => t.id === totemId);
  if (!totem) return null;

  const rows = totem.grid.length;
  const cols = totem.grid[0].length;
  const cellSize = size / Math.max(rows, cols);

  return (
    <div
      className="inline-flex shrink-0"
      style={{
        width: size,
        height: size,
      }}
      title={`${totem.name} totem`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${cols * cellSize} ${rows * cellSize}`}
      >
        {totem.grid.flatMap((row, r) =>
          row.split("").map((cell, c) =>
            cell === "0" ? null : (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize}
                height={cellSize}
                rx={cellSize * 0.1}
                fill={cell === "1" ? color : `${color}40`}
              />
            )
          )
        )}
      </svg>
    </div>
  );
}
