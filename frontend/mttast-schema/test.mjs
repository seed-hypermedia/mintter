import Ajv from 'ajv'
import {doc, statement, paragraph, text} from '../builder/dist/index.js'
import fs from 'fs'
const schema = JSON.parse(fs.readFileSync('./schema.json'), 'utf8')

const ajv = new Ajv()

const data = doc([statement(paragraph([text('foobar')]))])

console.dir(data, {depth: 'full'})

const validate = ajv.compile(schema)
const valid = validate(data)
console.log(`is valid: ${valid}`)
// if (!valid) console.log(validate.errors)
