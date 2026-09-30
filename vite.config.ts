import { writeFileSync } from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'
import { baseSegmentCount, githubPagesRedirectScript } from './src/lib/githubPages.ts'

function githubPagesSpa(): Plugin {
  let outDir = 'dist'
  let base = '/'
  return {
    name: 'github-pages-spa',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
      base = config.base
    },
    closeBundle() {
      const segments = baseSegmentCount(base)
      const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <title>Toolbox</title>
    <script>${githubPagesRedirectScript(segments)}</script>
  </head>
  <body>
    <p>Weiterleitung… / Redirecting…</p>
  </body>
</html>
`
      writeFileSync(path.join(outDir, '404.html'), html)
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), githubPagesSpa()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
