import { useCallback, useState } from 'react';

export type UseAddRowOptions<TData> = {
  defaults?: Partial<TData>;
  onCommit?: (draft: Partial<TData>) => void | Promise<void>;
};

export function useAddRow<TData>({
  defaults,
  onCommit,
}: UseAddRowOptions<TData> = {}) {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<TData>>(defaults ?? {});

  const begin = useCallback(() => {
    setDraft(defaults ?? {});
    setIsAdding(true);
  }, [defaults]);

  const cancel = useCallback(() => {
    setIsAdding(false);
    setDraft(defaults ?? {});
  }, [defaults]);

  const commit = useCallback(async () => {
    await onCommit?.(draft);
    setIsAdding(false);
    setDraft(defaults ?? {});
  }, [draft, defaults, onCommit]);

  const updateField = useCallback(
    <K extends keyof TData>(key: K, value: TData[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return { isAdding, draft, setDraft, updateField, begin, cancel, commit };
}
