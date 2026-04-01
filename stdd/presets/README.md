# STDD Presets

按项目类型的预设配置。在 `/stdd-init` 时根据项目特征自动应用。

## 使用方式

```bash
# 自动检测（推荐）
/stdd-init

# 手动指定
/stdd-init --preset react
```

## 可用 Presets

| Preset | 检测条件 | 测试框架 | 特色配置 |
|--------|---------|---------|---------|
| react | `package.json` 含 `react` | Vitest + React Testing Library | 组件测试、快照测试 |
| express | `package.json` 含 `express` | Vitest + supertest | API 测试、中间件测试 |
| fastapi | `requirements.txt` 含 `fastapi` | pytest + httpx | API 测试、异步测试 |
| cli-node | `package.json` 含 `commander`/`yargs` | Vitest | CLI 参数测试、stdout 捕获 |
| library | `package.json` 无框架依赖 | Vitest | 纯函数测试、覆盖率严格 |

## Preset 文件结构

每个 preset 是一个 YAML 文件：

```yaml
# presets/react.yaml
name: react
description: React 组件开发预设
detect:
  - file: package.json
    contains: "react"
test_framework: vitest
test_command: "npx vitest run"
single_test_command: "npx vitest run {file}"
coverage_command: "npx vitest run --coverage"
typecheck_command: "npx tsc --noEmit"
lint_command: "npx eslint ."
dev_dependencies:
  - vitest
  - "@vitest/coverage-v8"
  - "@testing-library/react"
  - "@testing-library/jest-dom"
  - jsdom
vitest_config:
  environment: jsdom
  setup_files:
    - "./src/test-setup.ts"
article_overrides:
  article_02_tdd:
    enabled: true
  article_08_performance:
    enabled: false
    reason: "React 组件性能由 React DevTools 覆盖"
```

## 扩展

创建自定义 Preset：

1. 在 `stdd/presets/` 下创建 `my-preset.yaml`
2. 参考上方 YAML 结构填写
3. 运行 `/stdd-init` 时可通过 `--preset my-preset` 指定
