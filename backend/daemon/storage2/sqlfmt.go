package storage

import (
	"regexp"
	"strings"
)

var (
	whitespaceOnly    = regexp.MustCompile("(?m)^[ \t]+$")
	leadingWhitespace = regexp.MustCompile("(?m)(^[ \t]*)(?:[^ \t\n])")
)

// sqlfmt removes any common leading whitespace from every line in text,
// and replaces tabs with spaces to make the output compatible with schema.sql
//
// This can be used to make multiline strings to line up with the left edge of
// the display, while still presenting them in the source code in indented
// form.
func sqlfmt(text string) string {
	var margin string

	text = whitespaceOnly.ReplaceAllString(text, "")
	indents := leadingWhitespace.FindAllStringSubmatch(text, -1)

	// Look for the longest leading string of spaces and tabs common to all
	// lines.
	for i, indent := range indents {
		if i == 0 {
			margin = indent[1]
		} else if strings.HasPrefix(indent[1], margin) {
			// Current line more deeply indented than previous winner:
			// no change (previous winner is still on top).
			continue
		} else if strings.HasPrefix(margin, indent[1]) {
			// Current line consistent with and no deeper than previous winner:
			// it's the new winner.
			margin = indent[1]
		} else {
			// Current line and previous winner have no common whitespace:
			// there is no margin.
			margin = ""
			break
		}
	}

	if margin != "" {
		text = regexp.MustCompile("(?m)^"+margin).ReplaceAllString(text, "")
	}

	return removeSQLComments(
		strings.Replace(text, "\t", "    ", -1),
	)
}

// removeSQLComments is written with the help of ChatGPT, but it seems to work.
// We don't need to store comments in the database file, but we want to use them for ourselves.
func removeSQLComments(sql string) string {
	re := regexp.MustCompile(`('[^']*')|--.*|/\*[\s\S]*?\*/`) // Regular expression to match SQL comments and string literals
	lines := strings.Split(sql, "\n")                         // Split SQL statement into lines
	outLines := make([]string, 0, len(lines))
	for _, line := range lines {
		line = re.ReplaceAllStringFunc(line, func(match string) string {
			if strings.HasPrefix(match, "--") {
				return "" // Remove single-line comments
			} else if strings.HasPrefix(match, "/*") {
				return "" // Remove multi-line comments
			} else {
				return match // Preserve string literals
			}
		})
		// Lines with only comments end up being empty, and we don't want those.
		if strings.TrimSpace(line) == "" {
			continue
		}
		// We don't want trailing new lines, because we'll be joining lines later.
		line = strings.Trim(line, "\r\n")
		// For more convenient formatting, all of our migration statement would have
		// an extra tab at the beginning of the line, we can get rid of it.
		if line[0] == '\t' {
			line = line[1:]
		}
		outLines = append(outLines, line)
	}
	return strings.Join(outLines, "\n") // Join lines back together
}
