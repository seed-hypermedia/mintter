// Package posstrings is a straight port of https://github.com/mweidner037/position-strings.
// Read the docs, the motivation, and everything else over there.
package posstrings

import (
	"fmt"
	"math"
	"strings"

	"golang.org/x/exp/slices"
)

const (
	first = ""
	last  = "~"
)

var log52 = math.Log(52)

type PositionSource struct {
	id            string
	longName      string
	firstName     string
	lastValueSeqs map[string]float64
}

func NewPositionSource(id string) *PositionSource {
	if id == "" {
		panic("Must specify ID")
	}
	if !(id < last) {
		panic("ID must be less than" + last)
	}
	if strings.ContainsAny(id, ",.") {
		panic("ID must not contain . or , symbols")
	}

	return &PositionSource{
		id:            id,
		longName:      "," + id + ".",
		firstName:     id + ".",
		lastValueSeqs: map[string]float64{},
	}
}

func (src *PositionSource) MustCreateBetween(left, right string) string {
	s, err := src.CreateBetween(left, right)
	if err != nil {
		panic(err)
	}
	return s
}

func (src *PositionSource) CreateBetween(left, right string) (string, error) {
	if left == "" {
		left = first
	}

	if right == "" {
		right = last
	}

	if left >= right {
		return "", fmt.Errorf("left must be < than right")
	}

	if right > last {
		return "", fmt.Errorf("last must be less or equal to LAST")
	}

	leftFixed := left
	if left == first {
		leftFixed = ""
	}
	rightFixed := right
	if right == last {
		rightFixed = ""
	}

	var ans string

	if rightFixed != "" &&
		(leftFixed == "" || strings.HasPrefix(rightFixed, leftFixed)) {
		ancestor, err := leftVersion(rightFixed)
		if err != nil {
			return "", err
		}
		ans = src.appendWaypoint(ancestor)
	} else {
		if leftFixed == "" {
			ans = src.appendWaypoint("")
		} else {
			prefix, err := getPrefix(leftFixed)
			if err != nil {
				return "", err
			}
			lastValueSeq, ok := src.lastValueSeqs[prefix]
			if ok && !(rightFixed != "" && strings.HasPrefix(rightFixed, prefix)) {
				// Reuse
				valueSeq := nextOddValueSeq(lastValueSeq)
				ans = prefix + stringifyBase52(valueSeq)
				src.lastValueSeqs[prefix] = valueSeq
			} else {
				ans = src.appendWaypoint(leftFixed)
			}
		}
	}

	if !(left < ans && ans < right) {
		return "", fmt.Errorf("bad position: %s %s %s", left, ans, right)
	}

	return ans, nil
}

func (src *PositionSource) appendWaypoint(ancestor string) string {
	var waypointName string
	if ancestor == "" {
		waypointName = src.firstName
	} else {
		waypointName = src.longName
	}

	existing := strings.LastIndex(ancestor, src.longName)
	if strings.HasPrefix(ancestor, src.firstName) {
		existing = 0
	}
	if existing >= 0 {
		index := -1
		for i := existing; i < len(ancestor); i++ {
			if ancestor[i] == '.' {
				index++
			}
		}
		waypointName = stringifyShortName(float64(index))
	}

	prefix := ancestor + waypointName
	lastValueSeq, ok := src.lastValueSeqs[prefix]
	var valueSeq float64
	if !ok {
		valueSeq = 1
	} else {
		valueSeq = nextOddValueSeq(lastValueSeq)
	}
	src.lastValueSeqs[prefix] = valueSeq
	return prefix + stringifyBase52(valueSeq)
}

func getPrefix(position string) (string, error) {
	for i := len(position) - 2; i >= 0; i-- {
		char := position[i]
		if char == '.' || ('0' <= char && char <= '9') {
			return position[0 : i+1], nil
		}
	}
	return "", fmt.Errorf("no last waypoint char found (not a position?): %v", position)
}

func leftVersion(position string) (string, error) {
	last := parseBase52(string(position[len(position)-1]))
	if !(math.Mod(last, 2) == 1) {
		return "", fmt.Errorf("bad value seq (not a position?): %v %v", last, position)
	}
	return position[0:len(position)-1] + stringifyBase52(last-1), nil
}

func stringifyShortName(n float64) string {
	if n < 10 {
		return string(rune(48) + rune(n))
	}
	return stringifyBase52(math.Floor(n/10)) + string(rune(48)+rune(math.Mod(n, 10)))
}

func stringifyBase52(n float64) string {
	if n == 0 {
		return "A"
	}

	var codes []rune
	for n > 0 {
		digit := math.Mod(n, 52)
		var insert float64
		if digit >= 26 {
			insert = 71
		} else {
			insert = 65
		}
		codes = slices.Insert(codes, 0, rune(digit+insert))
		n = math.Floor(n / 52)
	}

	return string(codes)
}

func parseBase52(s string) float64 {
	n := float64(0)
	for i := 0; i < len(s); i++ {
		code := float64(s[i])
		var x float64
		if code >= 97 {
			x = 71
		} else {
			x = 65
		}
		digit := code - x
		n = 52*n + digit
	}
	return n
}

func nextOddValueSeq(n float64) float64 {
	var d float64
	if n == 0 {
		d = 1
	} else {
		d = math.Floor(math.Log(n)/log52) + 1
	}

	if n == (math.Pow(52, d) - math.Pow(26, d) - 1) {
		return (n+1)*52 + 1
	} else {
		return n + 2
	}
}
