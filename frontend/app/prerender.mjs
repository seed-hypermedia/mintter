import {GlobalRegistrator} from '@happy-dom/global-registrator'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'url'

GlobalRegistrator.register()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

const template = fs.readFileSync(toAbsolute('dist/static/index.html'), 'utf-8')
const {render} = await import('./dist/server/entry-server.mjs')

// determine routes to pre-render from src/pages
const routesToPrerender = ['/']

;(async () => {
  // pre-render each route...
  for (const url of routesToPrerender) {
    const context = {}
    const appHtml = await render(url, context)

    const html = template.replace(`<!--app-html-->`, appHtml)

    const filePath = `dist/static${url === '/' ? '/index' : url}.html`
    fs.writeFileSync(toAbsolute(filePath), html)
    console.log('pre-rendered:', filePath)
  }
})()
