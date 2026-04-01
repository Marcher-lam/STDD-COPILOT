// STDD Test Reporter for Go (testing package)
// Usage: go test -json ./... 2>&1 | go run stdd/reporters/go.go
// Output: Console summary + stdd/reports/test-report.json
package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type TestEvent struct {
	Time    time.Time `json:"Time"`
	Action  string    `json:"Action"`
	Package string    `json:"Package"`
	Test    string    `json:"Test"`
	Output  string    `json:"Output"`
	Elapsed float64   `json:"Elapsed"`
}

type ReportSummary struct {
	Total   int `json:"total"`
	Passed  int `json:"passed"`
	Failed  int `json:"failed"`
	Skipped int `json:"skipped"`
}

type Report struct {
	Timestamp string       `json:"timestamp"`
	Framework string       `json:"framework"`
	Summary   ReportSummary `json:"summary"`
	Tests     []TestResult  `json:"tests"`
}

type TestResult struct {
	Name   string  `json:"name"`
	Status string  `json:"status"`
	File   string  `json:"file,omitempty"`
	Time   float64 `json:"time"`
	Output string  `json:"output,omitempty"`
}

func main() {
	scanner := bufio.NewScanner(os.Stdin)
	tests := make(map[string]*TestResult)
	var order []string

	for scanner.Scan() {
		line := scanner.Text()
		var event TestEvent
		if err := json.Unmarshal([]byte(line), &event); err != nil {
			continue
		}

		if event.Test == "" {
			continue
		}

		if _, exists := tests[event.Test]; !exists {
			tests[event.Test] = &TestResult{Name: event.Test}
			order = append(order, event.Test)
		}

		t := tests[event.Test]
		switch event.Action {
		case "pass":
			t.Status = "passed"
			t.Time = event.Elapsed
		case "fail":
			t.Status = "failed"
			t.Time = event.Elapsed
			t.Output = strings.TrimSpace(t.Output)
		case "skip":
			t.Status = "skipped"
			t.Time = event.Elapsed
		case "output":
			t.Output += event.Output
		}
	}

	summary := ReportSummary{}
	var results []TestResult
	for _, name := range order {
		t := tests[name]
		switch t.Status {
		case "passed":
			summary.Passed++
		case "failed":
			summary.Failed++
		case "skipped":
			summary.Skipped++
		default:
			t.Status = "unknown"
		}
		summary.Total++
		results = append(results, *t)
	}

	// Console summary
	fmt.Println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Printf("📊 STDD Go Test Report\n")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Printf("  Total: %d  ✅ Passed: %d  ❌ Failed: %d  ⏭️ Skipped: %d\n",
		summary.Total, summary.Passed, summary.Failed, summary.Skipped)
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// Write JSON report
	report := Report{
		Timestamp: time.Now().Format(time.RFC3339),
		Framework: "go/testing",
		Summary:   summary,
		Tests:     results,
	}

	_ = os.MkdirAll("stdd/reports", 0755)
	data, _ := json.MarshalIndent(report, "", "  ")
	_ = os.WriteFile(filepath.Join("stdd/reports", "test-report.json"), data, 0644)

	if summary.Failed > 0 {
		os.Exit(1)
	}
}
