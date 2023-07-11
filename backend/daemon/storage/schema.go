package storage

import (
	_ "embed"
	"regexp"
	"strings"
)

//go:embed schema.sql
var schema string

func init() {
	schema = removeSQLComments(schema)
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
