import {BACKEND_HTTP_URL} from '@mintter/app/src/constants'
import {toast} from '@mintter/app/src/toast'
import {app, dialog, net} from 'electron'
import fs from 'fs'

export async function saveCidAsFile(event, args) {
  const {cid, name} = args
  const request = net.request(`${BACKEND_HTTP_URL}/ipfs/${cid}`)
  console.log(app.getPath('downloads'))
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
        console.log(options.defaultPath)
        const {filePath, canceled} = await dialog.showSaveDialog(options)
        if (!canceled && filePath) {
          try {
            fs.writeFileSync(filePath, data, {encoding: 'binary'})
            toast.success(`Successfully downloaded file ${name}`)
          } catch (e) {
            toast.error(`Failed to download file ${name}`)
            console.log(e)
          }
        }
      })
    } else {
      console.error('Error: Invalid status code', response.statusCode)
    }
  })

  request.on('error', (error) => {
    console.error('Error:', error.message)
  })

  request.end()
}
