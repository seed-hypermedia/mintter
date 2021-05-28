package providing

import (
	"fmt"
	"testing"
)

func TestFoo(t *testing.T) {
	in := []int{1, 2, 3, 4, 4, 4, 4, 4, 4, 5, 6, 7, 8}
	out := make([]int, 0, len(in))

	var prev int
	for _, n := range in {
		if n == prev {
			continue
		}

		out = append(out, n)
		prev = n
	}

	fmt.Println(out)
}
