# JavaScript + Jest Starter

## 检测条件
- 项目根目录存在 `package.json`
- 无 `tsconfig.json`（纯 JS 项目）

## 测试框架配置

### package.json 依赖
```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "eslint": "^8.56.0"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:single": "jest",
    "lint": "eslint ."
  }
}
```

### jest.config.js
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/types/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### 示例测试 (src/__tests__/example.test.js)
```javascript
describe('Example', () => {
  test('should pass', () => {
    expect(1 + 1).toBe(2);
  });
});
```

## foundation.md 模板
```markdown
# 项目基础约束

## 技术栈
- 语言: JavaScript (ES2022+)
- 测试框架: Jest
- 包管理器: npm/pnpm
- Linter: ESLint

## 测试命令
- 单元测试: npx jest {file}
- 覆盖率: npx jest --coverage
- Lint: npx eslint .
```

## Ralph Loop 适配
- RED: `npx jest {file}`
- CHECK: `npx eslint .`
- GREEN: `npx jest {file}`
