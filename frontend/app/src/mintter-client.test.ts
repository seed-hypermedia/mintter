import { expect } from '@esm-bundle/chai';

import * as client from './mintter-client';

describe('Mintter Client: Drafts', () => {
  it.skip('createDraft()', () => {
    return;
  });
  it.skip('deleteDraft()', () => {
    return;
  });
  it.skip('getDraft()', () => {
    return;
  });
  it.skip('updateDraft()', () => {
    return;
  });
  it.skip('listDrafts()', () => {
    return;
  });
  it.skip('publishDraft()', () => {
    return;
  });
});

describe('Mintter Client: Publications', () => {
  it.skip('getPublication()', () => {
    return;
  });
  it.skip('deletePublication()', () => {
    return;
  });
  it.skip('listPublications()', () => {
    return;
  });
});

describe('Mintter Client: Profile', () => {
  it('genSeed()', async () => {
    const res = await client.genSeed();
    expect(res.getMnemonicList()).to.have.length(24);
  });

  it.skip('initProfile()', () => {
    return;
  });
  it.skip('getProfile()', () => {
    return;
  });
  it.skip('updateProfile()', () => {
    return;
  });
  it.skip('listProfiles()', () => {
    return;
  });
  it.skip('listSuggestedProfiles()', () => {
    return;
  });
  it.skip('getProfileAddress()', () => {
    return;
  });
  it.skip('connectTuPeer()', () => {
    return;
  });
});
