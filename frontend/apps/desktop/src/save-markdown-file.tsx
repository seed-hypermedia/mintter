import {API_HTTP_URL} from '@mintter/shared'
import {app, dialog, net} from 'electron'
import fs from 'fs'
import mime from 'mime'
import path from 'node:path'

const {debug, error} = console

export async function saveMarkdownFile(
  event: any,
  args: {
    title: string
    markdownContent: string
    mediaFiles: {url: string; filename: string}[]
  },
) {
  const {title, markdownContent, mediaFiles} = args
  const camelTitle = title
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
    .replace(/[\/\\|]/g, '-') // Removes invalid characters: / \ |
    .replace(/\s+/g, '') // Remove all whitespace for camel case

  const {filePath} = await dialog.showSaveDialog({
    title: 'Save document as markdown',
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

    let updatedMarkdownContent = markdownContent
    let success: {success: boolean; message: string} = {
      success: true,
      message: `Successfully exported ${title} to: ${filePath}.`,
    }

    const uploadMediaFile = ({
      url,
      filename,
    }: {
      url: string
      filename: string
    }) => {
      return new Promise<void>((resolve, reject) => {
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
                reject(`Error: No data received for ${filenameWithExt}`)
                return
              }

              const mediaFilePath = path.join(mediaDir, filenameWithExt)
              try {
                fs.writeFileSync(mediaFilePath, data)
                debug(`Media file successfully saved: ${mediaFilePath}`)
                // Update the markdown content with the correct file name
                updatedMarkdownContent = updatedMarkdownContent.replace(
                  filename,
                  filenameWithExt,
                )
                resolve()
              } catch (e) {
                error(`Failed to save media file ${filenameWithExt}`, e)
                reject(e)
              }
            })
          } else {
            reject(`Error: Invalid status code ${response.statusCode}`)
          }
        })

        request.on('error', (err) => {
          reject(err.message)
        })

        request.end()
      })
    }

    // Process all media files
    const uploadPromises = mediaFiles.map(uploadMediaFile)
    try {
      await Promise.all(uploadPromises)
    } catch (err) {
      success = {
        success: false,
        message: `Error processing media files: ${err.message || err}.`,
      }
      error('Error processing media files:', err)
    }

    // Save the updated Markdown file after all media files are processed
    const markdownFilePath = path.join(documentDir, `${camelTitle}.md`)
    fs.writeFile(markdownFilePath, updatedMarkdownContent, (err) => {
      if (err) {
        success = {
          success: false,
          message: `Error saving document "${title}": ${err.message || err}.`,
        }
        error('Error saving file:', err)
        return
      }
      debug('Markdown file successfully saved:', markdownFilePath)
    })
    if (success.success) {
      event.sender.send('export-completed', {
        success: true,
        message: success.message,
      })
    } else {
      event.sender.send('export-completed', {
        success: false,
        message: success.message,
      })
    }
  } else {
    event.sender.send('export-completed', {
      success: false,
      message: 'Export has been cancelled.',
    })
  }
}
