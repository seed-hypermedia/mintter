import * as React from 'react';
import { useHistory, useParams } from 'react-router';
import { Container } from '@mintter/ui/container';
import { Grid } from '@mintter/ui/grid';
import { useTheme } from './theme-context';
import { useSidePanel } from './sidepanel';
import { useDraft } from './mintter-hooks';
import { createPlugins } from '@mintter/editor/plugins';
import { options } from '@mintter/editor/options';
import type { ReactEditor } from 'slate-react';
import { useEditor } from '@mintter/editor/use-editor';
import { useMutation } from 'react-query';
import { publishDraft } from './mintter-client';
import { Box } from '@mintter/ui/box';
import { Button } from '@mintter/ui/button';
import { Textarea } from '@mintter/ui/textarea';
import { useEditorValue } from '@mintter/editor/use-editor-value';
import { EditorComponent } from '@mintter/editor/editor-component';
import { FormControl } from '@mintter/ui/form-control';

const Editor: React.FC = () => {
  const { theme } = useTheme();
  const history = useHistory();
  const query = new URLSearchParams(window.location.search);
  const { documentId } = useParams<{ documentId: string }>();
  const { isLoading, isError, error, data } = useDraft(documentId);

  const titleRef = React.useRef<HTMLInputElement>(null);
  const subtitleRef = React.useRef<HTMLInputElement>(null);

  // editor
  const plugins = createPlugins(options);
  const editor: ReactEditor = useEditor(plugins, options) as ReactEditor;

  const {
    state: editorState,
    setTitle,
    setSubtitle,
    onEditorChange,
    setValue,
  } = useEditorValue({ document: data });
  const { title, subtitle, editorValue } = editorState;

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
          css={{
            $$borderColor: 'transparent',
            $$borderColorHover: 'transparent',
            fontSize: '$6',
            fontWeight: '$4',
            lineHeight: '1.25',
            fontFamily: '$heading',
            marginTop: '$6',
            px: '0',
          }}
        />

        <Textarea
          value={subtitle}
          onChange={setSubtitle}
          data-testid="editor_subtitle"
          name="subtitle"
          placeholder="subtitle"
          css={{
            $$borderColor: 'transparent',
            $$borderColorHover: 'transparent',
            fontSize: '$4',
            lineHeight: '1.25',
            marginTop: '$4',
            px: '0',
          }}
        />

        <Box>
          <EditorComponent
            editor={editor}
            plugins={plugins}
            value={editorValue}
            onChange={onEditorChange}
            readOnly={false}
          />
        </Box>
      </Container>
      {isSidepanelOpen ? (
        <Box css={{ bc: '$gray700' }}>sidepanel here</Box>
      ) : null}
    </Grid>
  );
};

export default Editor;
