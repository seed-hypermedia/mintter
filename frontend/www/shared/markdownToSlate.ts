import unified, {Parser} from 'unified'
import markdown from 'remark-parse'
import toSlate from './remarkSlate'
import {initialSectionsValue} from '@mintter/editor'

export function markdownToSlate(body: string) {
  if (body.length === 0) {
    return initialSectionsValue[0].children
  }

  // TODO: Fixme types
  const p: any = unified()
    .use(markdown)
    .use(toSlate as any)
    .processSync(body)
  return p.result
}
