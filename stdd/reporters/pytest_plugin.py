"""
STDD Test Reporter - pytest 适配器

用法: pytest --stdd-report stdd/reporters/pytest_plugin.py
或在 conftest.py 中: pytest_plugins = ["stdd.reporters.pytest_plugin"]
"""

import json
import os
import time


class STDDPytestReporter:
    """STDD pytest 报告器插件"""

    def __init__(self, config):
        self.config = config
        self.passed = []
        self.failed = []
        self.skipped = []
        self.start_time = None

    def pytest_sessionstart(self, session):
        self.start_time = time.time()
        print(f"\n[STDD] 开始测试\n")

    def pytest_runtest_logreport(self, report):
        if report.when == "setup":
            return

        entry = {
            "name": report.nodeid,
            "duration": getattr(report, "duration", 0),
        }

        if report.passed:
            self.passed.append(entry)
        elif report.failed:
            entry["error"] = str(report.longrepr) if report.longrepr else ""
            self.failed.append(entry)
        elif report.skipped:
            self.skipped.append(entry)

    def pytest_sessionfinish(self, session, exitstatus):
        total = len(self.passed) + len(self.failed) + len(self.skipped)

        print("\n╔══════════════════════════════════════════════╗")
        print("║           STDD Test Report                   ║")
        print("╠══════════════════════════════════════════════╣")
        print(f"║  Total:   {total:<33}║")
        print(f"║  Passed:  {len(self.passed):<33}║")
        print(f"║  Failed:  {len(self.failed):<33}║")
        print(f"║  Skipped: {len(self.skipped):<33}║")
        print("╚══════════════════════════════════════════════╝")

        if self.failed:
            print("\n[STDD] 失败测试:")
            for t in self.failed:
                print(f"  ✗ {t['name']}")
                if t.get("error"):
                    for line in t["error"].split("\n")[:3]:
                        print(f"    {line}")

        # 生成 JSON 报告
        report_data = {
            "framework": "pytest",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
            "summary": {
                "total": total,
                "passed": len(self.passed),
                "failed": len(self.failed),
                "skipped": len(self.skipped),
            },
            "passed": [t["name"] for t in self.passed],
            "failed": [
                {"name": t["name"], "errors": [t.get("error", "")]}
                for t in self.failed
            ],
        }

        report_dir = os.path.join(os.getcwd(), "stdd", "reports")
        os.makedirs(report_dir, exist_ok=True)
        report_path = os.path.join(report_dir, "test-report.json")
        with open(report_path, "w") as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        print(f"\n[STDD] 报告已生成: stdd/reports/test-report.json")


def pytest_configure(config):
    config.pluginmanager.register(STDDPytestReporter(config), "stdd_reporter")
