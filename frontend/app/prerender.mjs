import fs from 'fs'
import path from 'path'
import {render} from './dist/server/entry-server.js'

const template = fs.readFileSync(
  path.resolve('dist/static/index.html'),
  'utf-8',
)

const routesToPrerender = ['/']

;(async () => {
  // pre-render each route...
  for (const url of routesToPrerender) {
    const context = {}
    const appHtml = await render(url, context)

    const filePath = `dist/static${url === '/' ? '/index' : url}.html`
    fs.writeFileSync(path.resolve(filePath), appHtml)
  }
  process.exit(0)
})()
