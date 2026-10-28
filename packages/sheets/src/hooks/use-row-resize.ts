import { useCallback, useEffect, useRef, useState } from 'react';

export type UseRowResizeOptions = {
  height: number;
  onChange?: (next: number) => void;
  min?: number;
  max?: number;
};

const DEFAULT_MIN = 24;
const DEFAULT_MAX = 200;

export function useRowResize({
  height,
  onChange,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
}: UseRowResizeOptions) {
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const startRef = useRef<{ y: number; height: number } | null>(null);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!startRef.current) return;
      const delta = event.clientY - startRef.current.y;
      const next = Math.min(
        max,
        Math.max(min, startRef.current.height + delta),
      );
      setDragHeight(next);
    },
    [min, max],
  );

  const onPointerUp = useCallback(() => {
    if (dragHeight != null) {
      onChange?.(dragHeight);
    }
    setDragHeight(null);
    startRef.current = null;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
  }, [dragHeight, onChange, onPointerMove]);

  useEffect(
    () => () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    },
    [onPointerMove, onPointerUp],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      startRef.current = { y: event.clientY, height };
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    },
    [height, onPointerMove, onPointerUp],
  );

  return {
    height: dragHeight ?? height,
    isDragging: dragHeight != null,
    dragHandleProps: { onPointerDown },
  };
}
