import {API_FILE_UPLOAD_URL} from '@shm/shared'
import * as cheerio from 'cheerio'
import http from 'http'
import https from 'https'
import z from 'zod'
import {t} from './app-trpc'

export async function uploadFile(file: Blob | string) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(API_FILE_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  })
  const data = await response.text()
  return data
}

function downloadFile(fileUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const protocol = new URL(fileUrl).protocol === 'https:' ? https : http
    protocol
      .get(fileUrl, (response) => {
        if (response.statusCode === 200) {
          const chunks: Buffer[] = []
          response.on('data', (chunk) => chunks.push(chunk))
          response.on('end', () => {
            const blob = new Blob(chunks, {
              type: response.headers['content-type'],
            })
            resolve(blob)
          })
        } else {
          reject(new Error(`Failed to download file: ${response.statusCode}`))
        }
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

function extractMetaTags(html: string) {
  const $ = cheerio.load(html)
  const metaTags: Record<string, string> = {}
  $('meta').each((_i, element) => {
    const name = $(element).attr('name') || $(element).attr('property')
    const value = $(element).attr('content')
    if (name && value) {
      metaTags[name] = value
    }
  })
  return metaTags
}

export const webImportingApi = t.router({
  importWebFile: t.procedure.input(z.string()).mutation(async ({input}) => {
    const file = await downloadFile(input)
    const uploadedCID = await uploadFile(file)
    return {cid: uploadedCID, type: file.type, size: file.size}
  }),
  checkWebUrl: t.procedure.input(z.string()).mutation(async ({input}) => {
    const res = await fetch(input, {
      method: 'HEAD',
    })
    if (res.ok) {
      const contentType = res.headers.get('content-type')
      const parts = contentType
        ? contentType.split(';').map((part) => part.trim())
        : null
      const mimeType = parts?.[0]
      const charsetPart = parts?.find((part) =>
        part.toLowerCase().startsWith('charset='),
      )
      const charset = charsetPart ? charsetPart.split('=')[1] : null
      const headers = Object.fromEntries(res.headers.entries())
      let metaTags = {}
      if (headers['x-hypermedia-site'] && mimeType === 'text/html') {
        const res = await fetch(input, {})
        const html = await res.text()
        metaTags = extractMetaTags(html)
      }
      return {
        contentType,
        mimeType,
        contentLength: headers['content-length']
          ? Number(headers['content-length'])
          : null,
        charset,
        headers,
        metaTags,
      }
    }
    return null
  }),
})
