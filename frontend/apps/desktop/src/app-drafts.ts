import fs from 'fs/promises'
import {join} from 'path'
import z from 'zod'
import {userDataPath} from './app-paths'
import {t} from './app-trpc'

const draftsDir = join(userDataPath, 'drafts')

let draftIdList: string[] | undefined = undefined

async function initDrafts() {
  await fs.mkdir(draftsDir, {recursive: true})
  await fs.readdir(draftsDir)
  const allDraftFiles = await fs.readdir(draftsDir)
  const allDraftIds = allDraftFiles.map((filename) => {
    return filename.replace(/\.json$/, '')
  })
  draftIdList = allDraftIds
}

initDrafts()
  .then(() => {
    console.log('drafs ready')
  })
  .catch((e) => {
    console.error('error preparing drafts', e)
  })

export const draftsApi = t.router({
  list: t.procedure.query(async () => {
    return draftIdList
  }),
  get: t.procedure.input(z.string()).query(async ({input}) => {
    const draftPath = join(draftsDir, `${input}.json`)
    try {
      const draft = JSON.parse(await fs.readFile(draftPath, 'utf-8'))
      return draft
    } catch (e) {
      return null
    }
  }),
  write: t.procedure
    .input(
      z.object({
        draft: z.any(),
        id: z.string(),
      }),
    )
    .mutation(async ({input}) => {
      const draftPath = join(draftsDir, `${input.id}.json`)
      if (!draftIdList?.includes(input.id)) {
        draftIdList?.push(input.id)
      }
      await fs.writeFile(draftPath, JSON.stringify(input.draft, null, 2))
    }),
  delete: t.procedure.input(z.string()).mutation(async ({input}) => {
    const draftPath = join(draftsDir, `${input}.json`)
    draftIdList = draftIdList?.filter((id) => id !== input)
    await fs.unlink(draftPath)
  }),
})
