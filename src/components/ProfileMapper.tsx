import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";

type ProfileMapperProps = {
  points: number[];
  onChange: (next: number[]) => void;
  min?: number;
  max?: number;
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export const ProfileMapper = ({ points, onChange, min = 0.4, max = 1.8 }: ProfileMapperProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const width = 240;
  const height = 96;
  const viewBox = `0 0 ${width} ${height}`;
  const stepX = points.length === 1 ? 0 : width / (points.length - 1);

  const valueFromClientY = (clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const ratio = 1 - (clientY - rect.top) / rect.height;
    const clamped = clamp(ratio, 0, 1);
    return min + clamped * (max - min);
  };

  const nearestIndexFromClientX = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const x = clientX - rect.left;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < points.length; i += 1) {
      const px = i * stepX;
      const dist = Math.abs(px - x);
      if (dist < bestDist) {
        best = i;
        bestDist = dist;
      }
    }
    return best;
  };

  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    const coords = points.map((val, i) => {
      const x = i * stepX;
      const norm = (clamp(val, min, max) - min) / (max - min);
      const y = height - norm * height;
      return [x, y] as const;
    });
    return coords.map(([x, y], idx) => `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  }, [points, min, max, width, height]);

  const handlePointChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = [...points];
    next[index] = clamp(Number(e.target.value), min, max);
    onChange(next);
  };

  const updateFromPointer = (idx: number, clientY: number) => {
    const nextVal = valueFromClientY(clientY);
    if (nextVal == null) return;
    const next = [...points];
    next[idx] = clamp(nextVal, min, max);
    onChange(next);
  };

  useEffect(() => {
    if (dragIndex === null) return;
    const handleMove = (e: PointerEvent) => updateFromPointer(dragIndex, e.clientY);
    const handleUp = () => setDragIndex(null);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragIndex, points, min, max]);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!points.length) return;
    e.preventDefault();
    const idx = nearestIndexFromClientX(e.clientX);
    setDragIndex(idx);
    updateFromPointer(idx, e.clientY);
  };

  return (
    <div className="profile-mapper">
      <div className="profile-mapper__chart">
        <svg ref={svgRef} viewBox={viewBox} role="img" aria-label="Tower profile curve" onPointerDown={onPointerDown}>
          <defs>
            <linearGradient id="profileGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#61d2ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3a7bd5" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width={width} height={height} fill="url(#profileGradient)" opacity="0.18" />
          <path d={pathD} stroke="#7fc8ff" strokeWidth="2.5" fill="none" />
          {points.map((val, i) => {
            const x = i * stepX;
            const norm = (clamp(val, min, max) - min) / (max - min);
            const y = height - norm * height;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4.5"
                fill={dragIndex === i ? "#c9e8ff" : "#b4e0ff"}
                stroke="#143a66"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>
      </div>
      <div className="profile-mapper__inputs">
        {points.map((val, i) => (
          <label key={i}>
            <span>Handle {i + 1}</span>
            <input type="range" min={min} max={max} step={0.05} value={val} onChange={handlePointChange(i)} />
            <small>{val.toFixed(2)}x</small>
          </label>
        ))}
      </div>
    </div>
  );
};
