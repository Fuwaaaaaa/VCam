/**
 * HTML 特殊文字をエスケープする。VRM メタ名・ファイル名・ピア ID・例外メッセージ等、
 * 外部由来の文字列を status の innerHTML に埋め込む前に必ず通すこと。
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function createStatus(el: HTMLElement) {
  return {
    set(html: string) { el.innerHTML = html; },
    append(html: string) { el.innerHTML += html; },
  };
}
