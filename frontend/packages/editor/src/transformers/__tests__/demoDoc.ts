import * as v2 from '@mintter/api/v2/documents_pb'

// For some unreasonable reason protobuf compiler for JavaScript
// only exposes setters for each field, and no way to just pass an object.
// This is extremely painful to work with for many nested objects.
// It also for some more stupid reason appends "List" to the fields with Array values.
//
// This function attempts to convert a plain object into the given protobuf Message instance
// assuming these two inconveniences.
function makeProto<T extends jspb.Message>(msg: T, data: {}): T {
  for (const [key, value] of Object.entries(data)) {
    let setter = 'set' + key.charAt(0).toUpperCase() + key.slice(1)

    if (Array.isArray(value)) {
      setter += 'List'
    }

    msg[setter](value)
  }

  return msg
}

export const request = makeProto(new v2.UpdateDraftRequest(), {
  document: makeProto(new v2.Document(), {
    id: 'doc-1',
    title: 'Document Title',
    author: 'burdiyan',
    // Rest of the fields here
    blockRefList: makeProto(new v2.BlockRefList(), {
      style: v2.BlockRefList.Style.NONE,
      blocks: [
        makeProto(new v2.BlockRef(), {
          id: 'block-1',
        }),
        makeProto(new v2.BlockRef(), {
          id: 'block-list-parent',
          blockRefList: makeProto(new v2.BlockRefList(), {
            style: v2.BlockRefList.Style.NUMBER,
            blocks: [
              makeProto(new v2.BlockRef(), {
                id: 'block-list-child-1',
              }),
              makeProto(new v2.BlockRef(), {
                id: 'block-list-child-2',
              }),
            ],
          }),
        }),
        makeProto(new v2.BlockRef(), {
          id: 'block-2',
        }),
      ],
    }),
  }),
  blocks: [
    makeProto(new v2.Block(), {
      id: 'block-1',
      paragraph: makeProto(new v2.Paragraph(), {
        inlineElements: [
          makeProto(new v2.InlineElement(), {
            text: 'Hello ',
          }),
          makeProto(new v2.InlineElement(), {
            text: 'World!',
            textStyle: makeProto(new v2.TextStyle(), {
              bold: true,
            }),
          }),
        ],
      }),
    }),
    makeProto(new v2.Block(), {
      id: 'block-2',
      paragraph: makeProto(new v2.Paragraph(), {
        inlineElements: [
          makeProto(new v2.InlineElement(), {
            text: "I'm just a paragraph with a single line.",
          }),
        ],
      }),
    }),
    makeProto(new v2.Block(), {
      id: 'block-list-parent',
      paragraph: makeProto(new v2.Paragraph(), {
        inlineElements: [
          makeProto(new v2.InlineElement(), {
            text: "I'm a parent of a nested list.",
          }),
        ],
      }),
    }),
    makeProto(new v2.Block(), {
      id: 'block-list-child-2',
      paragraph: makeProto(new v2.Paragraph(), {
        inlineElements: [
          makeProto(new v2.InlineElement(), {
            text: "I'm the second child in the nested list. And I have some ",
          }),
          makeProto(new v2.InlineElement(), {
            text: 'markup',
            textStyle: makeProto(new v2.TextStyle(), {
              bold: true,
              italic: true,
            }),
          }),
          makeProto(new v2.InlineElement(), {
            text: ' !',
          }),
        ],
      }),
    }),
    makeProto(new v2.Block(), {
      id: 'block-list-child-1',
      paragraph: makeProto(new v2.Paragraph(), {
        inlineElements: [
          makeProto(new v2.InlineElement(), {
            text: "I'm the first child in the nested list.",
          }),
        ],
      }),
    }),
  ],
})
