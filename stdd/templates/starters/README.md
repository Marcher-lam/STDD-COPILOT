# STDD Starter Templates

多语言 TDD 项目启动模板，在 `/stdd-init` 时根据项目技术栈自动匹配。

## 可用模板

| 语言 | 测试框架 | 路径 | Ralph Loop 支持 |
|------|---------|------|----------------|
| TypeScript | Vitest | `starters/typescript/` | ✅ |
| JavaScript | Jest | `starters/javascript/` | ✅ |
| Python | pytest | `starters/python/` | ✅ |
| Go | testing (stdlib) | `starters/go/` | ✅ |
| Rust | cargo test | `starters/rust/` | ✅ |

## 使用方式

Starter 模板在 `/stdd-init` 阶段自动检测并应用：

1. 扫描项目根目录的特征文件（`tsconfig.json`, `go.mod`, `Cargo.toml`, `pyproject.toml` 等）
2. 匹配对应的 Starter 模板
3. 将 `foundation.md 模板` 部分写入 `stdd/memory/foundation.md`
4. 配置 `stdd/config.yaml` 中的测试命令

## 扩展

添加新语言 Starter：
1. 在 `starters/` 下创建新目录（如 `java/`）
2. 添加 `starter.md` 文件，包含：检测条件、测试框架配置、示例测试、foundation.md 模板、Ralph Loop 适配
3. 更新本索引文件
