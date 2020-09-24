package memory

import (
	"fmt"
	"reflect"
	"sync"
	"testing"

	"mintter/backend/kv"
)

func TestAlloc(t *testing.T) {
	txn := New()
	done := make(map[kv.Entity]bool)
	var wg sync.WaitGroup
	ch := make(chan kv.Entity, 100)
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			for k := 0; k < 1000; k++ {
				e, err := txn.Alloc()
				if err != nil {
					panic(err)
				}
				ch <- e
			}
			wg.Done()
		}()
	}
	go func() {
		wg.Wait()
		close(ch)
	}()
	for e := range ch {
		if done[e] {
			t.Fatal("duplicated", e)
		}
		done[e] = true
	}
}

func TestSetGet(t *testing.T) {
	tests := []struct {
		Key   kv.Entity
		Value kv.String
	}{
		{
			Key:   1,
			Value: "",
		},
		{
			Key:   42,
			Value: "what",
		},
	}
	txn := New()
	for _, test := range tests {
		key, err := test.Key.Encode()
		if err != nil {
			t.Fatal(err)
		}
		value, err := test.Value.Encode()
		if err != nil {
			t.Fatal(err)
		}
		if err := txn.Set(key, value); err != nil {
			t.Error(err)
		}
	}
	for _, test := range tests {
		var got kv.String
		key, err := test.Key.Encode()
		if err != nil {
			t.Fatal(err)
		}
		if err := txn.Get(key, got.Decode); err != nil {
			t.Error(err)
		} else if test.Value != got {
			t.Error("want", test.Value, "got", got)
		}
	}
}

func TestIterator(t *testing.T) {
	txn := New()
	for _, salutation := range []string{"hello", "good morning", "good afternoon"} {
		for i, neighbor := range []string{"world", "friend", "desk"} {
			s := fmt.Sprintf("%s%v", salutation, i)
			if err := txn.Set([]byte(s), []byte(neighbor)); err != nil {
				t.Fatal(err)
			}
		}
	}
	got := make(map[string]kv.String)
	iter := txn.PrefixIterator([]byte("good afternoon"))
	defer iter.Discard()
	for iter.Seek(nil); iter.Valid(); iter.Next() {
		sk := string(iter.Key())
		var v kv.String
		if err := iter.Value(v.Decode); err != nil {
			t.Error(err)
		}
		if _, done := got[sk]; done {
			t.Error("got key twice", sk)
		}
		got[sk] = v
	}
	if len(got) != 3 {
		t.Error("want 3 elements, got", len(got))
	}
	want := map[string]kv.String{
		"0": "world",
		"1": "friend",
		"2": "desk",
	}
	if !reflect.DeepEqual(want, got) {
		t.Error("want", want, "got", got)
	}
}
