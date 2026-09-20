// Keep routes inside the site's mount point ("/" locally, "/meu-financeiro/" on Pages).
export const basePath = new URL("../../", import.meta.url).pathname;
export function sitePath(route) {
  return basePath.replace(/\/$/, "") + route;
}
