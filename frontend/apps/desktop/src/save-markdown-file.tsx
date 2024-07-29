import {API_HTTP_URL} from '@mintter/shared'
import {app, dialog, net} from 'electron'
import fs from 'fs'
import mime from 'mime'
import path from 'node:path'

const {debug, error} = console

export async function saveMarkdownFile(event, args) {
  const {title, markdownContent, mediaFiles} = args
  const camelTitle = title
    .split(' ')
    .map(
      (word: string) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join('')

  const {filePath} = await dialog.showSaveDialog({
    title: 'Save Markdown and Media',
    defaultPath: path.join(app.getPath('documents'), camelTitle),
    buttonLabel: 'Save',
    filters: [{name: 'Markdown Files', extensions: ['md']}],
  })

  if (filePath) {
    const dir = path.dirname(filePath)
    const documentDir = path.join(dir, camelTitle)

    if (!fs.existsSync(documentDir)) {
      fs.mkdirSync(documentDir)
    }

    const mediaDir = path.join(documentDir, 'media')
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir)
    }

    // Save Markdown file
    const markdownFilePath = path.join(documentDir, `${camelTitle}.md`)
    fs.writeFile(markdownFilePath, markdownContent, (err) => {
      if (err) {
        error('Error saving file:', err)
        return
      }
      debug('Markdown file successfully saved:', markdownFilePath)
    })

    // Save Media files using CID
    for (const {url, filename} of mediaFiles) {
      const regex = /ipfs:\/\/(.+)/
      const match = url.match(regex)
      const cid = match ? match[1] : null
      const request = net.request(`${API_HTTP_URL}/ipfs/${cid}`)

      request.on('response', (response) => {
        const mimeType = response.headers['content-type']
        const extension = Array.isArray(mimeType)
          ? mime.extension(mimeType[0])
          : mime.extension(mimeType)
        const filenameWithExt = `${filename}.${extension}`
        if (response.statusCode === 200) {
          const chunks: Buffer[] = []

          response.on('data', (chunk) => {
            chunks.push(chunk)
          })

          response.on('end', () => {
            const data = Buffer.concat(chunks)
            if (!data || data.length === 0) {
              error(`Error: No data received for ${filenameWithExt}`)
              return
            }

            const mediaFilePath = path.join(mediaDir, filenameWithExt)
            try {
              fs.writeFileSync(mediaFilePath, data)
              debug(`Media file successfully saved: ${mediaFilePath}`)
            } catch (e) {
              error(`Failed to save media file ${filenameWithExt}`, e)
            }
          })
        } else {
          error(`Error: Invalid status code ${response.statusCode}`)
        }
      })

      request.on('error', (err) => {
        error('Error:', err.message)
      })

      request.end()
    }
  }
}
