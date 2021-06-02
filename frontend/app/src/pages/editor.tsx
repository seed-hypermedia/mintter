import { useEffect, useRef, useState } from 'react';
import type { Editor } from 'slate';
import { useHistory, useParams } from 'react-router';
import { useMutation } from 'react-query';
import { useMenuState } from 'reakit/Menu';
// import type { ReactEditor } from 'slate-react';

// import { publishDraft } from '@mintter/client';
import { useAccount, useDraft } from '@mintter/hooks';
import { Box } from '@mintter/ui/box';
import { Button } from '@mintter/ui/button';
import { Text } from '@mintter/ui/text';
import { TextField } from '@mintter/ui/text-field';
import * as documents from '@mintter/api/documents/v1alpha/documents_pb';

import { Container } from '@components/container';
import { Separator } from '@components/separator';

import { useSidePanel } from '../sidepanel';
import { EditorComponent } from '@mintter/editor/editor-component';
import 'show-keys';
import { useStoreEditorValue } from '@udecode/slate-plugins-core';
import { toDocument } from '../to-document';
import type { SlateBlock } from '@mintter/editor/types';

export default function EditorPage() {
  const history = useHistory();
  const query = new URLSearchParams(window.location.search);
  const { docId } = useParams<{ docId: string }>();
  const { isLoading, isError, error, data } = useDraft(docId);
  const titleRef = useRef<HTMLInputElement>(null);
  const linkMenu = useMenuState({ loop: true, wrap: true });
  const subtitleRef = useRef<HTMLInputElement>(null);
  const editorValue = useStoreEditorValue('editor') as Array<SlateBlock>;
  const { data: account } = useAccount('');

  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');

  // publish
  const { mutateAsync: publish } = useMutation(async () => {
    const document = toDocument({
      id: docId,
      author: account?.id as string,
      title,
      subtitle,
      blocks: editorValue,
      // TODO: get the document block parent list
      childrenListStyle: documents.ListStyle.NONE,
    });
    // publishDraft
  });

  // sidepanel
  const { isSidepanelOpen, sidepanelObjects, sidepanelSend } = useSidePanel();

  function saveDocument() {
    publish();
  }

  if (isError) {
    console.error('useDraft error: ', error);
    return <Text>Editor ERROR</Text>;
  }

  if (isLoading) {
    return <Text>loading draft...</Text>;
  }

  return (
    <Box
      css={{
        display: 'grid',
        minHeight: '$full',
        gridTemplateAreas: isSidepanelOpen
          ? `"controls controls controls"
        "maincontent maincontent rightside"`
          : `"controls controls controls"
        "maincontent maincontent maincontent"`,
        gridTemplateColumns: 'minmax(300px, 25%) 1fr minmax(300px, 25%)',
        gridTemplateRows: '64px 1fr',
        gap: '$5',
      }}
    >
      <Box
        css={{
          display: 'flex',
          gridArea: 'controls',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '$2',
          paddingHorizontal: '$5',
        }}
      >
        <Button color="primary" shape="pill" size="2" onClick={saveDocument}>
          PUBLISH
        </Button>
        <Button
          size="1"
          onClick={() => sidepanelSend?.({ type: 'SIDEPANEL_TOOGLE' })}
        >
          toggle sidepanel
        </Button>
      </Box>
      <Container css={{ gridArea: 'maincontent', marginBottom: 300 }}>
        <TextField
          // TODO: Fix types
          // @ts-ignore
          as="textarea"
          data-testid="editor_title"
          name="title"
          placeholder="Document title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          rows={1}
          // TODO: Fix types
          // @ts-ignore
          css={{
            $$backgroundColor: '$colors$background-alt',
            $$borderColor: 'transparent',
            $$hoveredBorderColor: 'transparent',
            fontSize: '$7',
            fontWeight: '$bold',
            letterSpacing: '0.01em',
            lineHeight: '$1',
          }}
        />

        <TextField
          // TODO: Fix types
          // @ts-ignore
          as="textarea"
          data-testid="editor_subtitle"
          name="subtitle"
          placeholder="about this publication..."
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          rows={1}
          // TODO: Fix types
          // @ts-ignore
          css={{
            $$backgroundColor: '$colors$background-alt',
            $$borderColor: 'transparent',
            $$hoveredBorderColor: 'transparent',
            fontSize: '$5',
            lineHeight: '1.25',
          }}
        />
        <Separator />
        <Box css={{ mx: '-$4', width: 'calc(100% + $7)' }}>
          <EditorComponent initialValue={data.editorValue} />
        </Box>
      </Container>
      {isSidepanelOpen ? (
        <Box
          css={{
            backgroundColor: '$background-muted',
            overflow: 'auto',
            gridArea: 'rightside',
            color: '$text-opposite',
            padding: '$4',
          }}
        >
          <pre>
            <code>{JSON.stringify({}, null, 2)}</code>
          </pre>
        </Box>
      ) : null}
    </Box>
  );
}

function createBlocksMap(editor: Editor): [string, documents.Block][] {
  // const iterableBlocks = getNodesByType(editor, ELEMENT_BLOCK, {
  //   at: [],
  // });
  // const blocks: [string, documents.Block][] = [];
  // for (const [block, path] of iterableBlocks) {
  //   const b: BlockNode = {
  //     id: block.id as string,
  //     type: ELEMENT_BLOCK,
  //     style:
  //       (block.style as documents.Block.Type) || documents.Block.Type.BASIC,
  //     children: block.children as any,
  //   };
  //   if (path.length > 4) {
  //     blocks.push([b.id, blockSerialize(b)]);
  //   } else {
  //     const parent = getNode(editor, path.slice(0, path.length - 2));
  //     blocks.push([b.id, blockSerialize(b, parent?.id as string)]);
  //   }
  // }
  // return blocks;
  return [['foo', new documents.Block()]];
}
