import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import {
  githubPagesRedirectScript,
  githubPagesRedirectTarget,
  restoredGithubPagesUrl,
} from './githubPages'

describe('github pages routing', () => {
  it('encodes a project-page route and restores it', () => {
    const original = new URL('https://hpmine42.github.io/Toolbox/tools/timer?a=1&b=2#done')
    const redirected = new URL(githubPagesRedirectTarget(original, 1))
    expect(redirected.pathname).toBe('/Toolbox/')
    expect(redirected.search.startsWith('?/')).toBe(true)

    const restored = restoredGithubPagesUrl(redirected)
    expect(restored?.pathname).toBe('/Toolbox/tools/timer')
    expect(restored?.search).toBe('?a=1&b=2')
    expect(restored?.hash).toBe('#done')
  })

  it('encodes a root-hosted route and restores it', () => {
    const original = new URL('https://example.com/tools/unit-converter')
    const restored = restoredGithubPagesUrl(new URL(githubPagesRedirectTarget(original, 0)))
    expect(restored?.pathname).toBe('/tools/unit-converter')
    expect(restored?.search).toBe('')
  })

  it('leaves ordinary urls unchanged', () => {
    expect(restoredGithubPagesUrl(new URL('https://example.com/tools/timer'))).toBeNull()
  })

  it('keeps the browser redirect script aligned with the helper', () => {
    const script = githubPagesRedirectScript(1)
    const location = {
      protocol: 'https:',
      hostname: 'hpmine42.github.io',
      port: '',
      pathname: '/Toolbox/tools/timer',
      search: '?a=1&b=2',
      hash: '#x',
      target: '',
      replace(url: string) {
        this.target = url
      },
    }
    runInNewContext(script, { window: { location } })
    expect(location.target).toBe(
      githubPagesRedirectTarget(
        new URL('https://hpmine42.github.io/Toolbox/tools/timer?a=1&b=2#x'),
        1,
      ),
    )
  })
})
