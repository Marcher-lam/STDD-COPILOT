# Go + testing Starter

## 检测条件
- 项目根目录存在 `go.mod`
- 存在 `.go` 文件

## 测试框架配置

### go.mod
Go 内置 `testing` 包，无需额外依赖。

### 示例测试 (example_test.go)
```go
package main

import "testing"

func TestAddition(t *testing.T) {
	got := 1 + 1
	want := 2
	if got != want {
		t.Errorf("got %d, want %d", got, want)
	}
}
```

### Makefile (可选)
```makefile
.PHONY: test test-coverage vet lint

test:
	go test ./... -v

test-coverage:
	go test ./... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html

test-single:
	go test -v -run

vet:
	go vet ./...

lint:
	golangci-lint run
```

## foundation.md 模板
```markdown
# 项目基础约束

## 技术栈
- 语言: Go 1.21+
- 测试框架: testing (标准库)
- Linter: golangci-lint

## 测试命令
- 单元测试: go test -v -run {Function} {package}
- 全量测试: go test ./... -v
- 覆盖率: go test ./... -coverprofile=coverage.out
- Vet: go vet ./...
```

## Ralph Loop 适配
- RED: `go test -v -run {Function} {package}`
- CHECK: `go vet ./...`
- GREEN: `go test -v -run {Function} {package}`
