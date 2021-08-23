package mttdoc

import "time"

type Doc struct {
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	Subtitle   string    `json:"subtitle"`
	Author     string    `json:"author"`
	CreateTime time.Time `json:"createTime"`
	UpdateTime time.Time `json:"updateTime"`
	List       *List     `json:"list,omitempty"`
}

type List struct {
	Type       string      `json:"type"`
	Statements []Statement `json:"statements,omitempty"`
}

type Statement struct {
	ID         string                 `json:"id"`
	Type       string                 `json:"type"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
	Content    *Content               `json:"content,omitempty"`
	List       *List                  `json:"list,omitempty"`
}

type Content struct {
	Type       string                 `json:"type"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
	Children   []Phrasing             `json:"children"`
}

type Phrasing interface {
	phrasing()
}

type Literal struct {
	Type       string                 `json:"type"` // This will always be "text"
	Value      string                 `json:"value"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
}

func (l Literal) phrasing() {}

type Entity struct {
	Type       string                 `json:"type"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
	Children   []Literal              `json:"children,omitempty"`
}

func (l Entity) phrasing() {}
