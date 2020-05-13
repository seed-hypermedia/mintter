import unified from 'unified'
import markdown from 'remark-parse'
import toSlate from './remarkSlate'
import {initialSectionsValue} from '@mintter/editor'

export function markdownToSlate(body: string) {
  if (body.length === 0) {
    return initialSectionsValue[0].children
  }

  const {result} = unified()
    .use(markdown)
    .use(toSlate)
    .processSync(body)
  return result
}
