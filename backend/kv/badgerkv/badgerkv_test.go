package badgerkv

import (
	"io/ioutil"
	"os"
	"testing"
)

func TestNew(t *testing.T) {
	dir, err := ioutil.TempDir("", "TestNew-*")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(dir)
	db, err := Open(DefaultOptions(dir))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	txn := db.NewTxn(true)
	defer txn.Discard()
	want := "value"
	if err = txn.Set([]byte("key"), []byte(want)); err != nil {
		t.Fatal(err)
	}
	var got string
	err = txn.Get([]byte("key"), func(bs []byte) error {
		got = string(bs)
		return nil
	})
	if err != nil {
		t.Fatal(err)
	} else if want != got {
		t.Errorf("want %#v, got %#v", want, got)
	}
}
