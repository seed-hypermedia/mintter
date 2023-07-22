import {toast} from '@mintter/app'
import {save} from '@tauri-apps/api/dialog'
import {BaseDirectory, writeBinaryFile} from '@tauri-apps/api/fs'
import {getClient, ResponseType} from '@tauri-apps/api/http'
import {appDataDir} from '@tauri-apps/api/path'

export async function saveCidAsFile(cid: string, name: string): Promise<void> {
  const client = await getClient()
  const data = (
    await client.get(`http://localhost:55001/ipfs/${cid}`, {
      responseType: ResponseType.Binary,
    })
  ).data as any

  const filePath = await save({
    defaultPath: (await appDataDir()) + '/' + name,
  })

  if (filePath) {
    try {
      await writeBinaryFile(filePath ? filePath : 'mintter-file', data, {
        dir: BaseDirectory.AppData,
      })
      toast.success(`Successfully downloaded file ${name}`)
    } catch (e) {
      toast.error(`Failed to download file ${name}`)
      console.log(e)
    }
  }
}
