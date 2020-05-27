import {markdownToSlate} from '../markdownToSlate'

describe('markdown to Slate', () => {
  test('should return a heding 2 slate node', () => {
    expect(markdownToSlate(`## Hello heading Two level`))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "children": Array [
            Object {
              "text": "Hello heading Two level",
            },
          ],
          "type": "h2",
        },
      ]
    `)
  })

  test('should return a paragraph with bold, italic & underline text', () => {
    expect(
      markdownToSlate(
        `__Typography__ is **the art and technique** of arranging type to make written language *legible, readable, and appealing* when displayed.`,
      ),
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "children": Array [
            Object {
              "bold": true,
              "text": "Typography",
            },
            Object {
              "text": " is ",
            },
            Object {
              "bold": true,
              "text": "the art and technique",
            },
            Object {
              "text": " of arranging type to make written language ",
            },
            Object {
              "italic": true,
              "text": "legible, readable, and appealing",
            },
            Object {
              "text": " when displayed.",
            },
          ],
          "type": "p",
        },
      ]
    `)
  })

  test('should render a normal Markdown link', () => {
    expect(markdownToSlate(`[Minnter is amazing](https://mintter.com)`))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "children": Array [
            Object {
              "children": Array [
                Object {
                  "text": "Minnter is amazing",
                },
              ],
              "link": "https://mintter.com",
              "type": "a",
            },
          ],
          "type": "p",
        },
      ]
    `)
  })

  test('should return a default paragraph with an empty text if body is empty', () => {
    expect(markdownToSlate('')).toMatchInlineSnapshot(`
      Array [
        Object {
          "children": Array [
            Object {
              "text": "",
            },
          ],
          "type": "p",
        },
      ]
    `)
  })

  test('should return an inline code element', () => {
    expect(markdownToSlate(`Hello \`world\``)).toMatchInlineSnapshot(`
      Array [
        Object {
          "children": Array [
            Object {
              "text": "Hello ",
            },
            Object {
              "code": true,
              "text": "world",
            },
          ],
          "type": "p",
        },
      ]
    `)
  })

  test('should render a codeblock', () => {
    expect(
      markdownToSlate(`\n\`\`\`\nvar foo = () => \`Hello World\`;\n\`\`\`\n\n`),
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "children": Array [
            Object {
              "text": "var foo = () => \`Hello World\`;",
            },
          ],
          "lang": null,
          "meta": null,
          "type": "code",
        },
      ]
    `)
  })
})
