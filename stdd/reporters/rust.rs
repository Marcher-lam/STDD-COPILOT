// STDD Test Reporter for Rust (cargo test)
// Usage: cargo test -- -Z unstable-options --format json 2>&1 | rustc stdd/reporters/rust.rs -o stdd-reporter && ./stdd-reporter
// Output: Console summary + stdd/reports/test-report.json

use std::collections::HashMap;
use std::fs;
use std::io::{self, BufRead};
use std::path::Path;

#[derive(Debug)]
enum TestStatus {
    Passed,
    Failed,
    Skipped,
}

#[derive(Debug)]
struct TestResult {
    name: String,
    status: TestStatus,
    output: String,
}

#[derive(serde::Serialize)]
struct ReportSummary {
    total: usize,
    passed: usize,
    failed: usize,
    skipped: usize,
}

#[derive(serde::Serialize)]
struct ReportTest {
    name: String,
    status: String,
    output: Option<String>,
}

#[derive(serde::Serialize)]
struct Report {
    timestamp: String,
    framework: String,
    summary: ReportSummary,
    tests: Vec<ReportTest>,
}

fn main() {
    let stdin = io::stdin();
    let mut results: HashMap<String, TestResult> = HashMap::new();
    let mut order: Vec<String> = Vec::new();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => continue,
        };

        // Parse cargo test JSON output
        // Format: {"type":"test","event":"ok"|"failed"|"ignored","name":"test_name"}
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
            if json["type"] == "test" {
                let name = json["name"].as_str().unwrap_or("unknown").to_string();
                if !results.contains_key(&name) {
                    order.push(name.clone());
                    results.insert(
                        name.clone(),
                        TestResult {
                            name: name.clone(),
                            status: TestStatus::Skipped,
                            output: String::new(),
                        },
                    );
                }

                let event = json["event"].as_str().unwrap_or("");
                if let Some(result) = results.get_mut(&name) {
                    match event {
                        "ok" => result.status = TestStatus::Passed,
                        "failed" => result.status = TestStatus::Failed,
                        "ignored" => result.status = TestStatus::Skipped,
                        "stdout" => {
                            if let Some(output) = json["stdout"].as_str() {
                                result.output.push_str(output);
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    let mut passed = 0;
    let mut failed = 0;
    let mut skipped = 0;
    let mut report_tests = Vec::new();

    for name in &order {
        if let Some(result) = results.get(name) {
            let status_str = match result.status {
                TestStatus::Passed => { passed += 1; "passed" }
                TestStatus::Failed => { failed += 1; "failed" }
                TestStatus::Skipped => { skipped += 1; "skipped" }
            };
            report_tests.push(ReportTest {
                name: result.name.clone(),
                status: status_str.to_string(),
                output: if result.output.is_empty() {
                    None
                } else {
                    Some(result.output.clone())
                },
            });
        }
    }

    let total = order.len();

    // Console summary
    println!("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("📊 STDD Rust Test Report");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!(
        "  Total: {}  ✅ Passed: {}  ❌ Failed: {}  ⏭️ Skipped: {}",
        total, passed, failed, skipped
    );
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Write JSON report
    let report = Report {
        timestamp: chrono::Utc::now().to_rfc3339(),
        framework: "rust/cargo-test".to_string(),
        summary: ReportSummary { total, passed, failed, skipped },
        tests: report_tests,
    };

    let _ = fs::create_dir_all("stdd/reports");
    if let Ok(data) = serde_json::to_string_pretty(&report) {
        let _ = fs::write(Path::new("stdd/reports/test-report.json"), data);
    }

    if failed > 0 {
        std::process::exit(1);
    }
}
