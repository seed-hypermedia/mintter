import * as React from 'react';
import { useMutation } from 'react-query';
// import {Icons} from 'components/icons'
import { useEditor } from '@mintter/editor/use-editor';
import { EditorComponent } from '@mintter/editor/editor-component';
import { useEditorValue } from '@mintter/editor/use-editor-value';
import { createPlugins } from '@mintter/editor/plugins';
import { options } from '@mintter/editor/options';
import { ReactEditor } from 'slate-react';
import SplitPane from 'react-split-pane';
// import Seo from 'components/seo';
// import { DebugValue } from 'components/debug';
import { Textarea } from '@mintter/ui/textarea';
import { useDebounce } from './hooks';
import { useDraft, usePublication } from './mintter-hooks';
import { publishDraft, updateDraft } from './mintter-client';
import { useParams, useHistory, useLocation } from 'react-router-dom';
// import { FullPageSpinner } from 'components/fullpage-spinner';
// import { FullPageErrorMessage } from 'components/error-message';
import { useTheme } from './theme-context';
// import { Page } from 'components/page';
import { MainColumn } from './main-column';
import { SidePanelObject } from './sidepanel-object';
import { useSidePanel } from './sidepanel';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function Editor(): JSX.Element {
  const { push } = useHistory();
  const { documentId } = useParams<{ documentId: string }>();
  const { theme } = useTheme();
  const query = useQuery();
  // const { state: sidePanel, dispatch: sidePanelDispatch } = useSidePanel();
  const sidePanel = {
    visible: false,
    objects: [],
  };

  const sidePanelDispatch = () => true;

  const plugins = createPlugins(options);
  const editor: ReactEditor = useEditor(plugins, options) as ReactEditor;

  const titleRef = React.useRef(null);
  const subtitleRef = React.useRef(null);
  const [readyToAutosave, setReadyToAutosave] = React.useState<boolean>(false);

  // const saveDocument = React.useMemo(() => updateDraft(editor), [editor]);
  const { isLoading, isError, error, data } = useDraft(documentId, {
    onSuccess: () => {
      setReadyToAutosave(true);
    },
  });
  const { mutateAsync: publish } = useMutation(publishDraft, {
    onSuccess: (publication) => {
      const {} = publication.toObject();

      push(`/p/${version}`);
    },
  });

  // const { createTransclusion } = useTransclusion();

  const { state, setTitle, setSubtitle, setBlocks } = useEditorValue({
    document: data,
  });
  const { title, blocks, subtitle, mentions } = state;

  // React.useEffect(() => {
  //   if (mentions.length) {
  //     sidePanelDispatch({ type: 'add_object', payload: mentions });
  //   }

  //   const object = query.get('object');
  //   if (object) {
  //     sidePanelDispatch({ type: 'add_object', payload: object });
  //   }
  // }, []);

  const { mutateAsync: autosaveDraft } = useMutation(async (state) => {
    if (data?.document) {
      // saveDocument({ document: data.document, state });
    } else {
      console.error('no document???');
    }
  });

  const debouncedValue = useDebounce(state, 1000);

  // React.useEffect(() => {
  //   if (readyToAutosave) {
  //     autosaveDraft(state);
  //   }

  //   return () => {
  //     // unmount screen, autosave.
  //     autosaveDraft(state);
  //   };
  // }, [debouncedValue]);

  async function handlePublish() {
    // await saveDocument({ document: data.document, state });
    // publish(documentId);
    console.log('PUBLISH!');
  }

  if (isError) {
    console.error('editor error', error);
    return <p>Editor ERROR</p>;
  }

  if (isLoading) {
    return <p>loading editor...</p>;
  }

  return (
    <div>
      {/* <Seo title="Compose" /> */}
      {/* <DebugValue value={state} /> */}
      <SplitPane
        style={{
          height: '100%',
          width: '100%',
        }}
        split="vertical"
        maxSize={-100}
        defaultSize="66%"
        minSize={300}
        pane1Style={
          sidePanel.visible
            ? {
                minWidth: 600,
                overflow: 'auto',
              }
            : {
                width: '100%',
                minWidth: '100%',
                height: '100%',
                minHeight: '100%',
                overflow: 'auto',
              }
        }
        pane2Style={{
          overflow: 'auto',
        }}
      >
        <div className="overflow-auto">
          <div className="px-4 flex justify-end pt-4">
            <button
              onClick={handlePublish}
              className="bg-primary rounded-full px-12 py-2 text-white font-bold shadow transition duration-200 hover:shadow-lg ml-4"
            >
              Publish
            </button>
            {/* <Tippy
              content={
                <span
                  className={`px-2 py-1 text-xs font-light transition duration-200 rounded bg-muted-hover ${css`
                    background-color: #333;
                    color: #ccc;
                  `}`}
                >
                  Interact with this document
                </span>
              }
            > */}
            <button onClick={() => sidePanelDispatch({ type: 'toggle_panel' })}>
              {/* <Icons.Sidebar color="currentColor" /> */}
              icon sidebar
            </button>
            {/* </Tippy> */}
          </div>

          <MainColumn
          // className={`mx-4 md:mx-16 ${css`
          //   max-width: 50ch;
          // `}`}
          >
            <div
            // className={`pb-2 mb-4 relative ${css`
            //   &:after {
            //     content: '';
            //     position: absolute;
            //     bottom: 0;
            //     left: 0;
            //     width: 50%;
            //     max-width: 360px;
            //     height: 1px;
            //     z-index: 20;
            //     background-color: var(--color-muted-hover);
            //   }
            // `}`}
            >
              <Textarea
                // TODO: fix types
                ref={(t: any) => {
                  titleRef.current = t;
                }}
                value={title}
                data-test-id="editor_title"
                onChange={setTitle}
                name="title"
                placeholder="Document title"
                // className={`text-2xl md:text-4xl text-heading font-bold italic leading-tight ${css`
                //   word-wrap: break-word;
                //   white-space: pre-wrap;
                //   min-height: 56px;
                // `}`}
                onEnterPress={() => {
                  // TODO: fix types
                  // subtitleRef.current?.focus();
                }}
              />
              <Textarea
                // TODO: fix types
                ref={(d: any) => {
                  subtitleRef.current = d;
                }}
                value={subtitle}
                onChange={setSubtitle}
                name="subtitle"
                placeholder="Subtitle"
                // className={`text-md md:text-lg font-light text-heading-muted italic mt-4 leading-tight ${css`
                //   word-wrap: break-word;
                //   white-space: pre-wrap;
                //   min-height: 28px;
                // `}`}
                onEnterPress={() => {
                  ReactEditor.focus(editor);
                }}
              />
            </div>
            <div className="prose prose-xl">
              <EditorComponent
                editor={editor}
                plugins={plugins}
                value={blocks}
                onChange={(blocks: any) => {
                  setBlocks(blocks);
                }}
                theme={theme}
              />
            </div>
          </MainColumn>
        </div>
        {sidePanel.visible ? (
          <div
            className="bg-background-muted"
            style={{
              visibility: sidePanel.visible ? 'visible' : 'hidden',
              maxWidth: sidePanel.visible ? '100%' : 0,
              width: sidePanel.visible ? '100%' : 0,
              height: '100%',
              minHeight: '100%',
              overflow: 'auto',
              zIndex: 0,
            }}
          >
            <ul aria-label="sidepanel list">
              {sidePanel.objects.map((object) => (
                <SidePanelObject key={object} isEditor id={object} />
              ))}
            </ul>
          </div>
        ) : (
          <div />
        )}
      </SplitPane>
    </div>
  );
}
