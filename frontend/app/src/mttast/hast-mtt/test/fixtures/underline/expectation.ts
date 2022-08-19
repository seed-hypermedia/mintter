import {u} from 'unist-builder'
import {paragraph, text} from '../../../..'

export const underline = u('root', [paragraph([text('Hello World.', {underline: true})])])
