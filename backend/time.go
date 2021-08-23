package backend

import "time"

func nowTruncated() time.Time {
	return time.Now().UTC().Round(time.Second)
}
