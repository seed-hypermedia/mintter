import * as React from 'react';
import { useHistory, useParams } from 'react-router';
import { Container } from '@mintter/ui/container';
import { Grid } from '@mintter/ui/grid';
import { useTheme } from './theme-context';
import { useSidePanel } from './sidepanel';
import { useDraft } from './mintter-hooks';
import { createPlugins } from './editor/plugins';
import { options } from './editor/options';
import type { ReactEditor } from 'slate-react';
import { useEditor } from './editor/use-editor';
import { useMutation } from 'react-query';
import { publishDraft } from './mintter-client';
import { Box } from '@mintter/ui/box';
import { Button } from '@mintter/ui/button';
import { Textarea } from './lib/textarea';
import { useEditorValue } from './editor/use-editor-value';

const Editor: React.FC = () => {
  const { theme } = useTheme();
  const history = useHistory();
  const query = new URLSearchParams(window.location.search);
  const { documentId } = useParams<{ documentId: string }>();
  const { isLoading, isError, error, data } = useDraft(documentId);
  const {
    state: editorState,
    setTitle,
    setSubtitle,
    setValue,
  } = useEditorValue({ document: data });
  const { title, subtitle } = editorState;

  // editor
  const plugins = createPlugins(options);
  const editor: ReactEditor = useEditor(plugins, options) as ReactEditor;

  // publish
  const { mutateAsync: publish } = useMutation(publishDraft);

  // sidepanel
  const { isSidepanelOpen, sidepanelObjects, sidepanelSend } = useSidePanel();

  if (isError) {
    console.error('useDraft error: ', error);
    return <p>Editor ERROR</p>;
  }

  if (isLoading) {
    return <p>loading draft...</p>;
  }

  return (
    <Grid
      css={{
        //   gridTemplateAreas: `"controls"
        // "maincontent"`,
        gridTemplateRows: '[controls] 50px [maincontent] auto',
      }}
    >
      <Box css={{ bc: '$gray600' }}>
        <Button>Publish</Button>
        <button onClick={() => sidepanelSend?.({ type: 'SIDEPANEL_TOOGLE' })}>
          toggle sidepanel {isSidepanelOpen ? 'open' : 'close'}
        </button>
      </Box>
      <Container css={{ bc: '$gray400' }}>
        <Textarea
          value={title}
          onChange={setTitle}
          data-testid="editor_title"
          name="title"
          placeholder="document title"
        />
        <Textarea
          value={subtitle}
          onChange={setSubtitle}
          data-testid="editor_subtitle"
          name="subtitle"
          placeholder="subtitle"
        />
      </Container>
      {isSidepanelOpen ? (
        <Box css={{ bc: '$gray700' }}>sidepanel here</Box>
      ) : null}
    </Grid>
  );
};

export default Editor;
