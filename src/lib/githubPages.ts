export function githubPagesRedirectTarget(url: URL, segmentsToKeep: number): string {
  const parts = url.pathname.split('/')
  const prefix = parts.slice(0, segmentsToKeep + 1).join('/')
  const rest = parts
    .slice(segmentsToKeep + 1)
    .join('/')
    .replace(/&/g, '~and~')
  const search = url.search ? `&${url.search.slice(1).replace(/&/g, '~and~')}` : ''
  const port = url.port ? `:${url.port}` : ''
  return `${url.protocol}//${url.hostname}${port}${prefix}/?/${rest}${search}${url.hash}`
}

export function restoredGithubPagesUrl(url: URL): URL | null {
  if (url.search.charAt(1) !== '/') return null
  const decoded = url.search
    .slice(1)
    .split('&')
    .map((part) => part.replace(/~and~/g, '&'))
    .join('?')
  const basePath = url.pathname.replace(/\/$/, '')
  return new URL(`${basePath}${decoded}${url.hash}`, url.origin)
}

export function restoreGithubPagesRoute(): void {
  const next = restoredGithubPagesUrl(new URL(window.location.href))
  if (!next) return
  window.history.replaceState(null, '', `${next.pathname}${next.search}${next.hash}`)
}

export function githubPagesRedirectScript(segmentsToKeep: number): string {
  return `(function () {
  var segmentsToKeep = ${segmentsToKeep};
  var loc = window.location;
  var parts = loc.pathname.split('/');
  var prefix = parts.slice(0, segmentsToKeep + 1).join('/');
  var rest = parts.slice(segmentsToKeep + 1).join('/').replace(/&/g, '~and~');
  var search = loc.search ? '&' + loc.search.slice(1).replace(/&/g, '~and~') : '';
  var port = loc.port ? ':' + loc.port : '';
  loc.replace(loc.protocol + '//' + loc.hostname + port + prefix + '/?/' + rest + search + loc.hash);
})();`
}

export function baseSegmentCount(base: string): number {
  return base.split('/').filter(Boolean).length
}
