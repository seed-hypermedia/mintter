package backend

import (
	"io/ioutil"
	"os"
	"path/filepath"

	"github.com/ipfs/go-cid"

	"mintter/backend/atomicfile"
)

type draftStore struct {
	basePath string
}

func (d *draftStore) DeleteDraft(id cid.Cid) error {
	return os.Remove(d.filename(id))
}

func (d *draftStore) StoreDraft(id cid.Cid, data []byte) error {
	return atomicfile.WriteFile(d.filename(id), data, 0666)
}

func (d *draftStore) GetDraft(id cid.Cid) ([]byte, error) {
	return ioutil.ReadFile(d.filename(id))
}

func (d *draftStore) ListDrafts() ([]cid.Cid, error) {
	dir, err := os.Open(d.basePath)
	if err != nil {
		return nil, err
	}

	files, err := dir.ReadDir(-1)
	if err != nil {
		return nil, err
	}

	out := make([]cid.Cid, len(files))

	for i, f := range files {
		c, err := cid.Decode(f.Name())
		if err != nil {
			return nil, err
		}

		out[i] = c
	}

	return out, nil
}

func (d *draftStore) filename(id cid.Cid) string {
	if d.basePath == "" {
		panic("BUG: draft store without base path")
	}

	return filepath.Join(d.basePath, id.String())
}
