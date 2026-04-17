export function createStatus(el: HTMLElement) {
  return {
    set(html: string) { el.innerHTML = html; },
    append(html: string) { el.innerHTML += html; },
  };
}
