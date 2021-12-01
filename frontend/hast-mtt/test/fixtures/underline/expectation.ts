import {paragraph, text} from '@mintter/mttast-builder'
import {u} from 'unist-builder'

export const underline = u('root', [paragraph([text('Hello World.', {underline: true})])])
