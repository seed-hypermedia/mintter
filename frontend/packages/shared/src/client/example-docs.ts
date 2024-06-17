import {
  Annotation,
  Block,
  BlockNode,
  Document,
} from '@shm/shared/src/client/grpc-types'

function createAnnotation(
  type: string,
  start: number,
  end: number,
  attributes?: Record<string, string>,
) {
  return new Annotation({
    type,
    starts: [start],
    ends: [end],
    attributes,
  })
}

function createLinkAnnotation(
  start: number,
  end: number,
  ref: string,
  attributes?: Record<string, string>,
) {
  return new Annotation({
    type: 'link',
    ref,
    starts: [start],
    ends: [end],
    attributes,
  })
}

function createSectionNode(
  {
    text,
    type,
    id,
    annotations,
    attributes,
  }: {
    text: string
    type?: 'section' | 'paragraph' | 'heading'
    id: string
    annotations?: Annotation[]
    attributes?: Record<string, string>
  },
  children?: BlockNode[],
) {
  return new BlockNode({
    block: new Block({
      id,
      type: type || 'section',
      text,
      annotations,
      attributes,
    }),
    children: children || [],
  })
}

function createDoc(children: BlockNode[], label: string) {
  return new Document({
    children,
    id: label,
  })
}

export const examples = {
  twoParagraphs: createDoc(
    [
      createSectionNode({text: 'hello', id: '1'}),
      createSectionNode({text: 'world', id: '2'}),
    ],
    'twoParagraphs',
  ),

  withBoldText: createDoc(
    [
      createSectionNode({
        text: 'hello world!',
        id: '1',
        annotations: [createAnnotation('strong', 6, 11)],
      }),
    ],
    'withBoldText',
  ),

  withOverlappingAnnotations: createDoc(
    [
      createSectionNode({
        text: 'ABCDE',
        id: '1',
        annotations: [
          createAnnotation('strong', 1, 3),
          createAnnotation('emphasis', 2, 4),
        ],
      }),
    ],
    'withBoldText',
  ),

  withList: createDoc(
    [
      createSectionNode(
        {
          text: 'this is a list:',
          id: '1',
          attributes: {
            childrenType: 'ul',
          },
        },
        [
          createSectionNode({text: 'item 1', id: '2'}),
          createSectionNode({text: 'item 2', id: '3'}),
        ],
      ),
    ],
    'withList',
  ),

  withLink: createDoc(
    [
      createSectionNode({
        text: 'a link',
        id: '1',
        attributes: {},
        annotations: [createLinkAnnotation(2, 6, 'https://example.com')],
      }),
    ],
    'withLink',
  ),

  nestedList: createDoc(
    [
      createSectionNode(
        {
          text: 'this is a list:',
          id: '1',
          attributes: {
            childrenType: 'ul',
          },
        },
        [
          createSectionNode({text: 'item 1', id: '2'}),
          createSectionNode(
            {text: 'item 2', id: '3', attributes: {childrenType: 'ol'}},
            [
              createSectionNode({text: 'numbered A', id: 'a'}),
              createSectionNode({text: 'numbered B', id: 'b'}),
            ],
          ),
        ],
      ),
    ],
    'nestedList',
  ),

  nestedHeadings: createDoc(
    [
      createSectionNode(
        {
          text: 'Heading A',
          type: 'heading',
          id: '1',
        },
        [
          createSectionNode({text: 'text 1', id: '2'}),
          createSectionNode({text: 'text 2', id: '3'}),
          createSectionNode(
            {
              text: 'SubHeading A1',
              type: 'heading',
              id: '4',
            },
            [
              createSectionNode({text: 'text A1A', id: 'a'}),
              createSectionNode({text: 'text A1B', id: 'b'}),
            ],
          ),
        ],
      ),
      createSectionNode({text: 'top-level paragraph', id: 'p0'}),
      createSectionNode(
        {
          text: 'Heading B',
          type: 'heading',
          id: '1',
        },
        [
          createSectionNode({text: 'text 1', id: 'b2'}),
          createSectionNode({text: 'text 2', id: 'b3'}),
        ],
      ),
    ],
    'nestedHeadings',
  ),
} as const
