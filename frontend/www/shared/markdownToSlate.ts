import unified, {Parser} from 'unified'
import markdown from 'remark-parse'
import toSlate from './remarkSlate'
// import remarkSlate from 'remark-slate'
import {initialBlocksValue} from '@mintter/editor'

export function markdownToSlate(body: string) {
  if (body.length === 0) {
    return initialBlocksValue[0].children
  }

  // TODO: Fixme types
  const p: any = unified()
    .use(markdown)
    .use(toSlate as any)
    .processSync(body)
  return p.result
}
