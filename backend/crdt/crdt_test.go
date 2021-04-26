package crdt

import (
	"bufio"
	"fmt"
	"io/ioutil"
	"mintter/backend/testutil"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	lru "github.com/hashicorp/golang-lru"
	"github.com/hashicorp/golang-lru/simplelru"
	"github.com/stretchr/testify/require"
)

type Cache struct {
	mu  sync.Mutex
	lru *simplelru.LRU
}

func (c *Cache) Get(k interface{}) (interface{}, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.lru.Get(k)
}

func (c *Cache) Add(k, v interface{}) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.lru.Add(k, v)
}

func (c *Cache) Len() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.lru.Len()
}

var cc *lru.Cache

func newCache(size int, cb func(k, v interface{})) *Cache {
	c, err := simplelru.NewLRU(size, simplelru.EvictCallback(cb))
	if err != nil {
		panic(err)
	}

	return &Cache{
		lru: c,
	}
}

var cache = newCache(1, func(k, v interface{}) {
	fmt.Println("Evicting")
	f := v.(*os.File)
	if err := f.Close(); err != nil {
		panic(err)
	}
})

func openFile(name string) (f *os.File, err error) {
	cache.mu.Lock()
	defer cache.mu.Unlock()

	if v, ok := cache.lru.Get(name); ok {
		f = v.(*os.File)
	} else {
		f, err = os.OpenFile(name, os.O_CREATE|os.O_RDWR|os.O_APPEND, 0666)
		cache.lru.Add(name, f)
	}

	return f, err
}

func TestLog(t *testing.T) {
	dir := testutil.MakeRepoPath(t)

	files := make([]*os.File, 5)
	var wg sync.WaitGroup
	wg.Add(5)

	for i := 0; i < len(files); i++ {
		i := i
		go func() {
			defer wg.Done()
			f, err := openFile(filepath.Join(dir, "peer-1.patches"))
			require.NoError(t, err)
			files[i] = f
		}()
	}

	wg.Wait()

	require.Equal(t, 1, cache.Len())

	for _, file := range files {
		fmt.Println(file.Fd())
	}

	f := files[0]
	defer f.Close()

	done := time.After(3 * time.Second)
	wroteC := make(chan struct{}, 20)
	go func() {
		defer close(wroteC)
		var c int
		for {
			select {
			case <-done:
				return
			case <-time.Tick(200 * time.Millisecond):
				if _, err := fmt.Fprintf(f, "Hello-%d\n", c); err != nil {
					panic(err)
				}
				c++
				wroteC <- struct{}{}
			}
		}
	}()

	<-wroteC
	<-wroteC
	<-wroteC

	go func() {
		buf := make([]byte, 8)
		if _, err := f.ReadAt(buf, 0); err != nil {
			panic(err)
		}
		fmt.Println("1", string(buf))
	}()

	go func() {
		buf := make([]byte, 8)
		if _, err := f.ReadAt(buf, 8); err != nil {
			panic(err)
		}
		fmt.Println("2", string(buf))
	}()

	go func() {
		buf := make([]byte, 8)
		if _, err := f.ReadAt(buf, 16); err != nil {
			panic(err)
		}
		fmt.Println("3", string(buf))
	}()

	var c int
	for range wroteC {
		c++
		fmt.Println("Wrote another line", c)
	}

	require.NoError(t, f.Sync())

	data, err := ioutil.ReadAll(bufio.NewReader(f))
	require.NoError(t, err)

	fmt.Println("Whole file content")
	fmt.Println(string(data))
}
