import unified from 'unified'
import markdown from 'remark-parse'
import toSlate from './remarkSlate'

export function markdownToSlate(body: string) {
  const {result} = unified()
    .use(markdown)
    .use(toSlate)
    .processSync(body)
  return result
}
