import fs from 'fs'
import prettier from 'prettier'
import config from './tailwind.config'

// const fs = require('fs')
// const prettier = require('prettier')
// const config = require('./tailwind.config.js')

/*
  Converts the tailwind config elements into custom props.
*/
const generateCSSProps = () => {
  let result = ''

  const groups = [
    {key: 'colors', prefix: 'color'},
    {key: 'spacing', prefix: 'space'},
    {key: 'fontSize', prefix: 'size'},
  ]

  // Add a note that this is auto generated
  result += `
    /* VARIABLES GENERATED WITH TAILWIND CONFIG ON ${new Date().toLocaleDateString()}.
    Tokens location: ./tailwind.config.js */

    :root {
  `

  // Loop each group's keys, use that and the associated
  // property to define a :root custom prop
  groups.forEach(({key, prefix}) => {
    const group = config.theme[key]

    if (!group) {
      return
    }

    Object.keys(group).forEach((key) => {
      result += `--${prefix}-${key}: ${group[key]};`
    })
  })

  // Close the :root block
  result += `
    }
  `

  // Make the CSS readable to help people with auto-complete in their editors
  result = prettier.format(result, {parser: 'scss'})

  // Push this file into the CSS dir, ready to go
  fs.writeFileSync('./styles/custom-props.css', result)
}

generateCSSProps()
module.exports = generateCSSProps
