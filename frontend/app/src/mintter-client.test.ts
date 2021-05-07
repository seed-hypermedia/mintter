import * as client from './mintter-client';
import { expect } from '@esm-bundle/chai';
describe('Mintter Client: Drafts', () => {
  it.skip('createDraft()', () => {});
  it.skip('deleteDraft()', () => {});
  it.skip('getDraft()', () => {});
  it.skip('updateDraft()', () => {});
  it.skip('listDrafts()', () => {});
  it.skip('publishDraft()', () => {});
});

describe('Mintter Client: Publications', () => {
  it.skip('getPublication()', () => {});
  it.skip('deletePublication()', () => {});
  it.skip('listPublications()', () => {});
});

describe('Mintter Client: Profile', () => {
  it('genSeed()', async () => {
    const res = await client.genSeed();
    expect(res.getMnemonicList()).to.have.length(24);
  });

  it('');
});
