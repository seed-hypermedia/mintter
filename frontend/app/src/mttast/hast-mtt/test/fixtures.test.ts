import {isHidden} from 'is-hidden'
import fs from 'node:fs'
import path from 'node:path'
import rehypeParse from 'rehype-parse'
import sanitize from 'rehype-sanitize'
import {unified} from 'unified'
import {removePosition} from 'unist-util-remove-position'
import {visit} from 'unist-util-visit'
import {describe, expect, test} from 'vitest'
import {sanitizeSchema, toMttast} from '..'
import {isFlowContent} from '../..'
import * as expectations from './expectations'

const fixtures = path.join('src', 'mttast', 'hast-mtt', 'test', 'fixtures')

describe('Fixtures', () => {
  fs.readdirSync(fixtures)
    .filter((d) => !isHidden(d))
    .forEach(check)
})

const processor = unified()
  .use(rehypeParse)
  .use(sanitize, sanitizeSchema)
  .freeze()

function check(name: string) {
  test(`<${name} />`, () => {
    const input = String(
      fs.readFileSync(path.join(fixtures, name, 'index.html')),
    )
    let config
    try {
      config = JSON.parse(
        String(fs.readFileSync(path.join(fixtures, name, 'index.json'))),
      )
    } catch {
      // TODO: implement error
    }

    const tree = removePosition(processor.runSync(processor.parse(input)), true)

    //@ts-ignore
    const expected = expectations[name]

    const result = toMttast(tree, config)

    // mock node id for testing
    // eslint-disable-next-line
    visit(result, isFlowContent, (node: any) => {
      node.id = 'id'
    })

    expect(result).toEqual(expected)
  })
}
