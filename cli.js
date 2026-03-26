#!/usr/bin/env node

const args = process.argv.slice(2);

console.log("STDD Copilot CLI");
console.log("================");

if (args.length === 0) {
  console.log(`
使用方式:
  stdd /stdd-init          初始化 STDD 工作区
  stdd /stdd-propose <需求>  提出需求草案
  stdd /stdd-clarify       需求澄清
  stdd /stdd-confirm       需求确认
  stdd /stdd-spec          生成 BDD 规格
  stdd /stdd-plan          任务拆解
  stdd /stdd-execute       TDD 执行循环
  stdd /stdd-commit        原子化提交
  stdd /stdd-turbo <需求>  一键防疲劳模式

提示: STDD 主要依赖于 .agents/skills/ 下的 SKILL.md 工作流文件。
      在 Claude Code 中可直接引用这些文件执行。
`);
  process.exit(0);
}

const command = args[0];

// 指令映射到 SKILL.md 路径
const skillMap = {
  '/stdd-init': 'stdd-init',
  '/stdd-propose': 'stdd-propose',
  '/stdd-clarify': 'stdd-clarify',
  '/stdd-confirm': 'stdd-confirm',
  '/stdd-spec': 'stdd-spec',
  '/stdd-plan': 'stdd-plan',
  '/stdd-execute': 'stdd-execute',
  '/stdd-apply': 'stdd-apply',
  '/stdd-final-doc': 'stdd-final-doc',
  '/stdd-commit': 'stdd-commit',
  '/stdd-turbo': 'stdd-turbo'
};

const skillName = skillMap[command];

if (skillName) {
  console.log(`指令: ${command}`);
  console.log(`对应 Skill: .agents/skills/${skillName}/SKILL.md`);
  console.log(`\n请在 Claude Code 中执行:`);
  console.log(`  参考 .agents/skills/${skillName}/SKILL.md 的步骤执行`);

  if (args.length > 1) {
    console.log(`\n参数: ${args.slice(1).join(' ')}`);
  }
} else {
  console.log(`未知指令: ${command}`);
  console.log(`可用指令: ${Object.keys(skillMap).join(', ')}`);
}
