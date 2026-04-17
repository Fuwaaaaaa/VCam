export type DropZoneOpts = {
  dropEl: HTMLElement;
  inputEl: HTMLInputElement;
  onFile: (file: File) => void;
  onInvalid?: (reason: string) => void;
};

export function wireDropZone({ dropEl, inputEl, onFile, onInvalid }: DropZoneOpts): void {
  const handle = (file: File | undefined | null) => {
    if (!file) return;
    if (!/\.vrm$/i.test(file.name)) {
      onInvalid?.(`これは VRM ファイルではありません: ${file.name}`);
      return;
    }
    onFile(file);
  };

  (['dragenter', 'dragover'] as const).forEach((ev) =>
    window.addEventListener(ev, (e) => {
      e.preventDefault();
      dropEl.classList.add('dragging');
    }),
  );
  (['dragleave', 'drop'] as const).forEach((ev) =>
    window.addEventListener(ev, () => dropEl.classList.remove('dragging')),
  );
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    handle(e.dataTransfer?.files?.[0]);
  });
  inputEl.addEventListener('change', () => handle(inputEl.files?.[0]));
}
