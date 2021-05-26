package backend

import (
	"fmt"
	"testing"
	"time"
)

func TestProviding(t *testing.T) {
	c := make(chan int, 4)

	for i := 0; i < cap(c); i++ {
		go func(i int, c chan int) {
			for num := range c {
				fmt.Println(i, num)
				time.Sleep(500 * time.Millisecond)
			}
		}(i, c)
	}

	go func() {
		start := time.Now()
		fmt.Println("Started sleeping", start)
		time.Sleep(1 * time.Second)
		c <- 8888888
		fmt.Println("Published", time.Now())
	}()

	for i := 0; i < 100; i++ {
		c <- i + 1
	}
}
