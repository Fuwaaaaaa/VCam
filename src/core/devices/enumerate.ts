/**
 * MediaDeviceInfo をカテゴリに分けて返すラッパ。
 *
 * 注意: `label` は getUserMedia で permission が取れるまで空文字になるブラウザ仕様。
 * ラベル空の場合は UI 表示用にフォールバック文字列を補う (pure)。
 *
 * permission 取得後に再度呼ぶと label が埋まる。呼び出し側で `devicechange` イベントと
 * 初回 getUserMedia 成功後の 2 契機で refresh すること。
 */
export type DeviceEntry = {
  deviceId: string;
  label: string;
  groupId: string;
};

export type DeviceList = {
  cameras: DeviceEntry[];
  mics: DeviceEntry[];
};

const EMPTY: DeviceList = { cameras: [], mics: [] };

export async function listDevices(): Promise<DeviceList> {
  const md = (globalThis as { navigator?: Navigator }).navigator?.mediaDevices;
  if (!md || typeof md.enumerateDevices !== 'function') return EMPTY;

  let list: MediaDeviceInfo[];
  try {
    list = await md.enumerateDevices();
  } catch {
    return EMPTY;
  }

  const cameras: DeviceEntry[] = [];
  const mics: DeviceEntry[] = [];
  for (const d of list) {
    if (d.kind === 'videoinput') cameras.push(toEntry(d, `カメラ ${cameras.length + 1}`));
    else if (d.kind === 'audioinput') mics.push(toEntry(d, `マイク ${mics.length + 1}`));
  }
  return { cameras, mics };
}

const toEntry = (d: MediaDeviceInfo, fallback: string): DeviceEntry => ({
  deviceId: d.deviceId,
  label: d.label && d.label.length > 0 ? d.label : fallback,
  groupId: d.groupId,
});
