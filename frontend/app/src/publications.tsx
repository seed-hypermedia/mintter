import * as React from 'react';
import { useHistory, useRouteMatch } from 'react-router';
// import {Icons} from 'components/icons'
import { DocumentList } from './document-list';
import { getPath } from './routes';
import { createDraft, deletePublication } from './mintter-client';
import { useOthersPublications } from './mintter-hooks';
import type { Document } from '@mintter/api/documents/v1alpha/documents_pb';

export function Publications() {
  const history = useHistory();
  const match = useRouteMatch();

  const { isLoading, isError, error, data } = useOthersPublications();

  async function handleCreateDraft() {
    const newDraft = await createDraft();

    history.push({
      pathname: `${getPath(match)}/editor/${newDraft.getId()}`,
    });
  }

  async function handleDeleteDocument(version: string) {
    await deletePublication(version);
  }

  if (isError) {
    return <p>ERROR</p>;
  }

  if (isLoading) {
    return <p className="text-body text-sm mt-2">loading...</p>;
  }

  return (
    <>
      {/*
      // TODO: implement Seo with hoofd
      <Seo title="Feed" /> */}
      {data?.length === 0 && (
        <>
          <hr className="border-t-2 border-muted border-solid my-8" />
          <div className="bg-background-muted border-muted border-solid border-2 rounded px-8 pt-6 pb-8 mb-4 text-center flex flex-col items-center">
            <h3 className="text-xl font-semibold text-primary">
              No Publications (yet)
            </h3>
            <button
              onClick={handleCreateDraft}
              className="bg-primary hover:shadow-lg text-white font-bold py-3 px-4 rounded-full flex items-center mt-5 justify-center"
            >
              {/*
              //TODO: add icons
              <Icons.FilePlus color="currentColor" /> */}
              <span className="ml-2">Start your first document</span>
            </button>
          </div>
        </>
      )}
      {/* TODO: fix data type */}
      <DocumentList
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={data as any}
        onDeleteDocument={handleDeleteDocument}
      />
    </>
  );
}
