import {
  Annotation,
  Block,
  BlockNode,
  Document,
} from '../.generated/documents/v1alpha/documents_pb'

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

function createBlockNode(
  {
    text,
    type,
    id,
    annotations,
  }: {text: string; type?: 'section'; id: string; annotations?: Annotation[]},
  children?: BlockNode[],
) {
  return new BlockNode({
    block: new Block({
      id,
      type: type || 'section',
      text,
      annotations,
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
      createBlockNode({text: 'hello', id: '1'}),
      createBlockNode({text: 'world', id: '2'}),
    ],
    'twoParagraphs',
  ),

  withBoldText: createDoc(
    [
      createBlockNode({
        text: 'hello world!',
        id: '1',
        annotations: [createAnnotation('strong', 6, 11)],
      }),
    ],
    'withBoldText',
  ),

  withOverlappingAnnotations: createDoc(
    [
      createBlockNode({
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
} as const
