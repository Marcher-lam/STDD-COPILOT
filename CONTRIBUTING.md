# 贡献指南

感谢你对 STDD Copilot 的关注！欢迎提交 Issue 和 Pull Request。

## 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/Marcher-lam/STDD-COPLOIT.git
cd STDD-COPLOIT

# 安装依赖
npm install

# 链接全局 CLI (可选)
npm link
```

## 提交规范

请使用约定式提交格式：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具相关

## 添加新的 Skill

1. 在 `.claude/skills/` 下创建新目录
2. 添加 `SKILL.md` 文件，格式如下：

```yaml
---
name: stdd-xxx
description: |
  功能描述。
  触发场景：用户说 '/stdd-xxx', 'xxx', ...
metadata:
  author: your-name
  version: "1.0.0"
---

# Skill 标题

[具体步骤...]
```

## 代码风格

- 保持 Markdown 文档格式整洁
- SKILL.md 中的步骤要清晰、可执行
- 避免过度抽象，保持简单

## 问题反馈

- 使用 GitHub Issues 提交 bug 报告或功能建议
- 请提供复现步骤和环境信息
