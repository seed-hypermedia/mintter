import {API_HTTP_URL} from '@shm/shared'
import {toast} from '@shm/ui'
import {app, dialog, net} from 'electron'
import fs from 'fs'

const {debug, error} = console

export async function saveCidAsFile(event, args) {
  const {cid, name} = args
  const request = net.request(`${API_HTTP_URL}/ipfs/${cid}`)
  debug('Saving cid to ' + app.getPath('downloads'))
  request.on('response', (response) => {
    if (response.statusCode === 200) {
      const chunks: Buffer[] = []

      response.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      response.on('end', async () => {
        const data = Buffer.concat(chunks)
        const options = {
          defaultPath: app.getPath('downloads') + '/' + name,
        }
        debug(options.defaultPath)
        const {filePath, canceled} = await dialog.showSaveDialog(options)
        if (!canceled && filePath) {
          try {
            fs.writeFileSync(filePath, data, {encoding: 'binary'})
            toast.success(`Successfully downloaded file ${name}`)
          } catch (e) {
            toast.error(`Failed to download file ${name}`)
            error(e)
          }
        }
      })
    } else {
      error('Error: Invalid status code', response.statusCode)
    }
  })

  request.on('error', (err) => {
    error('Error:', err.message)
  })

  request.end()
}
