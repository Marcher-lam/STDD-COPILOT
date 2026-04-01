# TypeScript + Vitest Starter

## 检测条件
- 项目根目录存在 `tsconfig.json`
- `package.json` 中包含 `typescript` 依赖

## 测试框架配置

### package.json 依赖
```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.2.0",
    "@vitest/coverage-v8": "^1.2.0",
    "tsc --noEmit": "echo 'type check'"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:single": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts"
  }
}
```

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/types/**'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  }
});
```

### 示例测试 (src/__tests__/example.test.ts)
```typescript
import { describe, it, expect } from 'vitest';

describe('Example', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });
});
```

## foundation.md 模板
```markdown
# 项目基础约束

## 技术栈
- 语言: TypeScript 5.x
- 测试框架: Vitest
- 包管理器: npm/pnpm
- Linter: ESLint

## 测试命令
- 单元测试: npx vitest run {file}
- 覆盖率: npx vitest run --coverage
- 类型检查: npx tsc --noEmit
- Lint: npx eslint .
```

## Ralph Loop 适配
- RED: `npx vitest run {file}`
- CHECK: `npx tsc --noEmit && npx eslint .`
- GREEN: `npx vitest run {file}`

---

## String Calculator Kata (标准练习)

用于学习 STDD TDD 流程的标准 Kata：

### 需求描述

创建一个简单的字符串计算器，支持以下规则：

1. `add("")` → `0` (空字符串返回 0)
2. `add("1")` → `1` (单个数字返回自身)
3. `add("1,2")` → `3` (逗号分隔求和)
4. `add("1\n2,3")` → `6` (支持换行分隔)
5. `add("//;\n1;2")` → `3` (自定义分隔符 `//delimiter\n`)
6. 负数抛出异常: `add("1,-2,3")` → `throw "negatives not allowed: -2"`
7. 数字 > 1000 被忽略: `add("2,1001")` → `2`
8. 任意长度分隔符: `add("//[***]\n1***2***3")` → `6`
9. 多个分隔符: `add("//[*][%]\n1*2%3")` → `6`

### TDD 实践顺序

```typescript
// src/__tests__/string-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { add } from '../string-calculator';

describe('StringCalculator', () => {
  it('should return 0 for empty string', () => {
    expect(add('')).toBe(0);
  });

  it('should return number for single number', () => {
    expect(add('1')).toBe(1);
  });

  it('should sum two comma-separated numbers', () => {
    expect(add('1,2')).toBe(3);
  });

  it('should handle newlines as delimiters', () => {
    expect(add('1\n2,3')).toBe(6);
  });

  it('should support custom delimiter', () => {
    expect(add('//;\n1;2')).toBe(3);
  });

  it('should throw on negative numbers', () => {
    expect(() => add('1,-2,3')).toThrow('negatives not allowed: -2');
  });

  it('should ignore numbers > 1000', () => {
    expect(add('2,1001')).toBe(2);
  });

  it('should support arbitrary-length delimiter', () => {
    expect(add('//[***]\n1***2***3')).toBe(6);
  });

  it('should support multiple delimiters', () => {
    expect(add('//[*][%]\n1*2%3')).toBe(6);
  });
});
```

**实践指引**：每个测试单独运行 Ralph Loop (Red → Green → Refactor)，一个测试通过后再写下一个。
