#!/usr/bin/node
const fs = require('fs')
const path = require('path')

console.log('>>== Setting up pages...', process.env.MINTTER_IS_GATEWAY)

let downloadPage = path.join(__dirname, 'pages', 'download.tsx')

if (fs.existsSync(downloadPage) && process.env.MINTTER_IS_GATEWAY != '1') {
  fs.unlink(downloadPage, (err) => {
    if (err) {
      throw Error(err)
    }

    console.log('>>== Download page deleted')
  })
}
