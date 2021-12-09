import {isFlowContent} from '@mintter/mttast'
import {isHidden} from 'is-hidden'
import fs from 'node:fs'
import path from 'node:path'
import rehypeParse from 'rehype-parse'
import sanitize from 'rehype-sanitize'
import {unified} from 'unified'
import {removePosition} from 'unist-util-remove-position'
import {visit} from 'unist-util-visit'
import {sanitizeSchema, toMttast} from '../src'
import * as expectations from './expectations'

const fixtures = path.join('test', 'fixtures')

describe('Fixtures', () => {
  fs.readdirSync(fixtures)
    .filter((d) => !isHidden(d))
    .forEach(check)
})

let processor = unified().use(rehypeParse).use(sanitize, sanitizeSchema).freeze()

function check(name: string) {
  test(`<${name} />`, () => {
    let input = String(fs.readFileSync(path.join(fixtures, name, 'index.html')))
    let config
    try {
      config = JSON.parse(String(fs.readFileSync(path.join(fixtures, name, 'index.json'))))
    } catch {}

    let tree = removePosition(processor.runSync(processor.parse(input)), true)

    //@ts-ignore
    let expected = expectations[name]

    let result = toMttast(tree, config)

    // mock node id for testing
    visit(result, isFlowContent, (node: any) => {
      node.id = 'id'
    })

    // if (name == 'ul2') {
    //   console.log('result: ', JSON.stringify({tree, expected, result}, null, 4))
    // }

    expect(result).toEqual(expected)
  })
}
