package kv

import (
	"reflect"
	"testing"
)

var (
	testPrefixes = []struct {
		Name   string
		Prefix Prefix
	}{
		{"empty", Prefix{}},
		{"spacious", make(Prefix, 1, 512)},
		{"zero filled", Prefix{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}},
		{"monotonic", Prefix{0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xfb}},
	}
	testEntities = []struct {
		Name   string
		Entity Entity
	}{
		{"zero", 0},
		{"HHGttG", 42},
		{"monotonic", 0x0123456789ABCDEF},
	}
	testComponents = []struct {
		Name      string
		Component Component
	}{
		{"zero", 0},
		{"HHGttG", 42},
		{"monotonic lo", 0x1234},
		{"monotonic hi", 0xCDEF},
	}
)

func TestPrefixConcatEntity(t *testing.T) {
	for _, p := range testPrefixes {
		for _, e := range testEntities {
			t.Run(p.Name+"/"+e.Name, func(t *testing.T) {
				got := p.Prefix.ConcatEntity(e.Entity)
				if len(p.Prefix) > 0 && &got[0] == &p.Prefix[0] {
					t.Error("want concat result to use different backing array")
				} else if string(p.Prefix) != string(got[:len(p.Prefix)]) {
					t.Error("want concat result to share content of original")
				}
			})
		}
	}
}

func TestPrefixConcatEntityComponent(t *testing.T) {
	for _, p := range testPrefixes {
		for _, e := range testEntities {
			for _, c := range testComponents {
				t.Run(p.Name+"/"+e.Name+"/"+c.Name, func(t *testing.T) {
					got := p.Prefix.ConcatEntityComponent(e.Entity, c.Component)
					if len(got) != len(p.Prefix)+8+2 {
						t.Error("want", len(p.Prefix)+8+2, "bytes, got", len(got))
					} else if len(p.Prefix) > 0 && &got[0] == &p.Prefix[0] {
						t.Error("want concat result to use different backing array")
					} else if string(p.Prefix) != string(got[:len(p.Prefix)]) {
						t.Error("want concat result to share content of original")
					}
				})
			}
		}
	}
}

func TestPrefixConcatEntityComponentBytes(t *testing.T) {
	for _, p := range testPrefixes {
		for _, e := range testEntities {
			for _, c := range testComponents {
				for _, bs := range testPrefixes {
					t.Run(p.Name+"/"+e.Name+"/"+c.Name+"/"+bs.Name, func(t *testing.T) {
						got := p.Prefix.ConcatEntityComponentBytes(e.Entity, c.Component, []byte(bs.Prefix))
						if len(got) != len(p.Prefix)+8+2+len(bs.Prefix) {
							t.Error("want", len(p.Prefix)+8+2+len(bs.Prefix), "bytes, got", len(got))
						} else if len(p.Prefix) > 0 && &got[0] == &p.Prefix[0] {
							t.Error("want concat result to use different backing array")
						} else if string(p.Prefix) != string(got[:len(p.Prefix)]) {
							t.Error("want concat result to share content of original")
						}
					})
				}
			}
		}
	}
}

func TestPrefixAppendComponent(t *testing.T) {
	for _, p := range testPrefixes {
		for _, c := range testComponents {
			t.Run(p.Name+"/"+c.Name, func(t *testing.T) {
				wantShare := cap(p.Prefix) >= len(p.Prefix)+len(c.Name)
				got := p.Prefix.AppendComponent(c.Component)
				if wantShare && len(p.Prefix) > 0 && &got[0] != &p.Prefix[0] {
					t.Error("want append result to share memory with original")
				} else if string(p.Prefix) != string(got[:len(p.Prefix)]) {
					t.Error("want append result to share content of original")
				}
			})
		}
	}
}

func TestComponentEncode(t *testing.T) {
	for _, c := range testComponents {
		t.Run(c.Name, func(t *testing.T) {
			got := c.Component.Encode()
			want0 := byte((c.Component & 0xff00) >> 8)
			if want0 != got[0] {
				t.Errorf("want %x, got %x", want0, got[0])
			}
			want1 := byte(c.Component & 0xff)
			if want1 != got[1] {
				t.Errorf("want %x, got %x", want1, got[1])
			}
		})
	}
}

func TestEntityEncodeDecode(t *testing.T) {
	for _, want := range []Entity{0, 42, 0x0123456789ABCDEF} {
		var (
			e   Encoder = want
			got Entity
			d   Decoder = &got
		)
		data, err := e.Encode()
		if err != nil {
			t.Fatal(err)
		}
		if err := d.Decode(data); err != nil {
			t.Error("want", want, "got", err)
		} else if want != got {
			t.Error("want", want, "got", got)
		}
	}
}

func TestEntitySliceEncodeDecode(t *testing.T) {
	for _, want := range []EntitySlice{
		{},
		{42},
		{0, 42, 0x0123456789ABCDEF},
	} {
		var (
			e   Encoder = want
			got EntitySlice
			d   Decoder = &got
		)
		data, err := e.Encode()
		if err != nil {
			t.Fatal(err)
		}
		if err := d.Decode(data); err != nil {
			t.Error("want", want, "got", err)
		} else if !want.Equal(got) {
			t.Error("want", want, "got", got)
		}
	}
}

func TestEntitySliceEqual(t *testing.T) {
	for _, test := range [][2]EntitySlice{
		{{42}, {0, 42}},
		{{42, 43}, {0, 42}},
	} {
		if test[0].Equal(test[1]) {
			t.Error("want test[0].Equal(test[1])==false, got true")
		}
		if test[1].Equal(test[0]) {
			t.Error("want test[1].Equal(test[0])==false, got true")
		}
	}
}

func TestEntitySliceSortInsert(t *testing.T) {
	for _, test := range []struct {
		In, Out  EntitySlice
		Insert   []Entity
		Inserted []bool
	}{
		{
			Insert:   []Entity{42, 0, 0, 42},
			Inserted: []bool{true, true, false, false},
			Out:      EntitySlice{0, 42},
		},
		{
			In:       EntitySlice{42},
			Insert:   []Entity{0xfedcba9876543210, 0},
			Inserted: []bool{true, true},
			Out:      EntitySlice{0, 42, 0xfedcba9876543210},
		},
		{
			In:       EntitySlice{0xfedcba9876543210, 42, 0},
			Insert:   []Entity{2, 42},
			Inserted: []bool{true, false},
			Out:      EntitySlice{0, 2, 42, 0xfedcba9876543210},
		},
	} {
		test.In.Sort()
		for i, x := range test.Insert {
			if test.In.Insert(x) != test.Inserted[i] {
				t.Errorf("want Insert(%v)==%v, got %v",
					x, !test.Inserted[i], test.Inserted[i])
			}
		}
		if !test.In.Equal(test.Out) {
			t.Error("want", test.Out, "got", test.In)
		}
	}
}

func TestEntitySliceSortRemove(t *testing.T) {
	for _, test := range []struct {
		In, Out EntitySlice
		Remove  []Entity
		Removed []bool
	}{
		{
			Remove:  []Entity{42},
			Removed: []bool{false},
			Out:     EntitySlice{},
		},
		{
			In:      EntitySlice{42},
			Remove:  []Entity{0xfedcba9876543210, 0},
			Removed: []bool{false, false},
			Out:     EntitySlice{42},
		},
		{
			In:      EntitySlice{0xfedcba9876543210, 42, 0},
			Remove:  []Entity{2, 42},
			Removed: []bool{false, true},
			Out:     EntitySlice{0, 0xfedcba9876543210},
		},
	} {
		test.In.Sort()
		for i, x := range test.Remove {
			if test.In.Remove(x) != test.Removed[i] {
				t.Errorf("want %v.Remove(%v)==%v, got %v",
					test.In, x, !test.Removed[i], test.Removed[i])
			}
		}
		if !test.In.Equal(test.Out) {
			t.Error("want", test.Out, "got", test.In)
		}
	}
}

func TestStringEncodeDecode(t *testing.T) {
	for _, want := range []String{"", "Hello, World!", "0x0123456789ABCDEF"} {
		var (
			e   Encoder = want
			got String
			d   Decoder = &got
		)
		data, err := e.Encode()
		if err != nil {
			t.Fatal(err)
		}
		if err := d.Decode(data); err != nil {
			t.Error("want", want, "got", err)
		} else if want != got {
			t.Error("want", want, "got", got)
		}
	}
}

func TestStringSliceEncodeDecode(t *testing.T) {
	for _, want := range []StringSlice{
		{},
		{""},
		{"Hello, World!", "0x0123456789ABCDEF"},
	} {
		var (
			e   Encoder = want
			got StringSlice
			d   Decoder = &got
		)
		data, err := e.Encode()
		if err != nil {
			t.Fatal(err)
		}
		if err := d.Decode(data); err != nil {
			t.Error("want", want, "got", err)
		} else if len(want) == 0 && len(got) == 0 {
			// Handle the nil case that reflect.DeepEqual doesn't.
		} else if !reflect.DeepEqual(want, got) {
			t.Error("want", want, "got", got)
		}
	}
}
