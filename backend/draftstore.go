package backend

import (
	"io/ioutil"
	"path/filepath"

	"github.com/ipfs/go-cid"

	"mintter/backend/atomicfile"
)

type draftStore struct {
	basePath string
}

func (d *draftStore) StoreDraft(id cid.Cid, data []byte) error {
	return atomicfile.WriteFile(d.filename(id), data, 0666)
}

func (d *draftStore) GetDraft(id cid.Cid) ([]byte, error) {
	return ioutil.ReadFile(d.filename(id))
}

func (d *draftStore) filename(id cid.Cid) string {
	if d.basePath == "" {
		panic("BUG: draft store without base path")
	}

	return filepath.Join(d.basePath, id.String())
}
