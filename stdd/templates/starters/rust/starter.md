# Rust + cargo test Starter

## 检测条件
- 项目根目录存在 `Cargo.toml`
- 存在 `.rs` 文件

## 测试框架配置

### Cargo.toml
Rust 内置测试支持，`cargo test` 即可运行。

```toml
[package]
name = "my-project"
version = "0.1.0"
edition = "2021"

[dev-dependencies]
# 可选: 属性宏简化测试
```

### 示例测试 (src/lib.rs)
```rust
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_addition() {
        assert_eq!(add(1, 1), 2);
    }
}
```

### 集成测试 (tests/integration_test.rs)
```rust
use my_project::add;

#[test]
fn test_add_integration() {
    assert_eq!(add(2, 3), 5);
}
```

### clippy 配置 (.clippy.toml)
```toml
cognitive-complexity-threshold = 25
```

## foundation.md 模板
```markdown
# 项目基础约束

## 技术栈
- 语言: Rust (Edition 2021)
- 测试框架: cargo test (内置)
- Linter: clippy

## 测试命令
- 单元测试: cargo test --lib {test_name}
- 集成测试: cargo test --test {file}
- 全量测试: cargo test
- Lint: cargo clippy -- -D warnings
- 格式化: cargo fmt --check
```

## Ralph Loop 适配
- RED: `cargo test --lib {test_name}`
- CHECK: `cargo clippy -- -D warnings && cargo fmt --check`
- GREEN: `cargo test --lib {test_name}`
