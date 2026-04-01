/**
 * STDD Test Reporter - Vitest 适配器
 *
 * 用法: npx vitest run --reporter=stdd/reporters/vitest.js
 * 或在 vitest.config.ts 中配置:
 *   test: { reporters: ['stdd/reporters/vitest.js'] }
 */

const passed = [];
const failed = [];
const skipped = [];

function onStart(files) {
  console.log(`\n[STDD] 开始测试: ${files.length} 个文件\n`);
}

function onTestEnd(result) {
  const status = result.state || result.status;
  if (status === 'passed') {
    passed.push(result);
  } else if (status === 'failed') {
    failed.push(result);
  } else {
    skipped.push(result);
  }
}

function onEnd() {
  const total = passed.length + failed.length + skipped.length;

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║           STDD Test Report                   ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Total:   ${String(total).padEnd(33)}║`);
  console.log(`║  Passed:  ${String(passed.length).padEnd(33)}║`);
  console.log(`║  Failed:  ${String(failed.length).padEnd(33)}║`);
  console.log(`║  Skipped: ${String(skipped.length).padEnd(33)}║`);
  console.log('╚══════════════════════════════════════════════╝');

  if (failed.length > 0) {
    console.log('\n[STDD] 失败测试:');
    failed.forEach((t) => {
      const name = t.name || t.fullName || 'unknown';
      console.log(`  ✗ ${name}`);
      if (t.errors && t.errors.length > 0) {
        t.errors.forEach((e) => {
          console.log(`    ${e.message || e}`);
        });
      }
    });
  }

  // 生成 JSON 报告
  const report = {
    framework: 'vitest',
    timestamp: new Date().toISOString(),
    summary: { total, passed: passed.length, failed: failed.length, skipped: skipped.length },
    passed: passed.map((t) => t.name || t.fullName),
    failed: failed.map((t) => ({
      name: t.name || t.fullName,
      errors: (t.errors || []).map((e) => e.message || String(e)),
    })),
  };

  const fs = require('fs');
  const path = require('path');
  const reportDir = path.join(process.cwd(), 'stdd', 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, 'test-report.json'),
    JSON.stringify(report, null, 2)
  );
  console.log(`\n[STDD] 报告已生成: stdd/reports/test-report.json`);

  // Ralph Loop 集成: 返回退出码
  return failed.length > 0 ? 1 : 0;
}

// Vitest Reporter 导出
module.exports = { onStart, onTestEnd, onEnd };
