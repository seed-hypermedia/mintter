package strbytes

import (
	"bytes"
	"testing"
)

func TestAll(t *testing.T) {
	roundTripString(t, "Hello")
	roundTripString(t, "Привет! Как дела?")
	roundTripString(t, "Hello, 世界")
	roundTripString(t, "Hello, 👨‍👩‍👧‍👦")
	roundTripBytes(t, []byte{143, 11, 254, 254, 168})
}

func roundTripString(t *testing.T, s string) {
	b := Bytes(s)
	s2 := String(b)
	if s != s2 {
		t.Fatalf("expected %q, got %q", s, s2)
	}
}

func roundTripBytes(t *testing.T, b []byte) {
	s := String(b)
	b2 := Bytes(s)
	if string(b) != string(b2) {
		t.Fatalf("expected %q, got %q", b, b2)
	}

	if !bytes.Equal(b, b2) {
		t.Fatalf("expected %q, got %q", b, b2)
	}
}
