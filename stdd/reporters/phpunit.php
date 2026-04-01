<?php
/**
 * STDD Test Reporter for PHPUnit
 * Usage: phpunit --log-junit=phpunit-report.xml && php stdd/reporters/phpunit.php
 * Or: phpunit | php stdd/reporters/phpunit.php (parse text output)
 * Output: Console summary + stdd/reports/test-report.json
 */

$passed = 0;
$failed = 0;
$skipped = 0;
$errors = 0;
$tests = [];

// Read from stdin (PHPUnit text output)
$handle = fopen('php://stdin', 'r');
$output = '';
while (($line = fgets($handle)) !== false) {
    $output .= $line;
}
fclose($handle);

// Parse PHPUnit text output
// Look for summary line: "Tests: 15, Assertions: 23, Errors: 0, Failures: 0."
if (preg_match('/Tests:\s*(\d+),\s*Assertions:\s*(\d+)(?:,\s*Errors:\s*(\d+))?(?:,\s*Failures:\s*(\d+))?/', $output, $matches)) {
    $total = (int)$matches[1];
    $errors = isset($matches[3]) ? (int)$matches[3] : 0;
    $failures = isset($matches[4]) ? (int)$matches[4] : 0;
    $failed = $errors + $failures;
}

// Parse individual test results from OK/WARNING/FAILURE lines
if (preg_match_all('/^(\s*)(✓|✔|OK|PASS)\s+(.+)$/m', $output, $matches, PREG_SET_ORDER)) {
    foreach ($matches as $match) {
        $tests[] = [
            'name' => trim($match[3]),
            'status' => 'passed'
        ];
        $passed++;
    }
}

if (preg_match_all('/^(\s*)(✘|✗|FAIL|ERROR|WARNING)\s+(.+)$/m', $output, PREG_SET_ORDER)) {
    foreach ($matches as $match) {
        $tests[] = [
            'name' => trim($match[3]),
            'status' => 'failed'
        ];
    }
}

if (preg_match_all('/^(\s*)(⏭|SKIP|SKIPPED|INCOMPLETE)\s+(.+)$/m', $output, PREG_SET_ORDER)) {
    foreach ($matches as $match) {
        $tests[] = [
            'name' => trim($match[3]),
            'status' => 'skipped'
        ];
        $skipped++;
    }
}

$total = count($tests) > 0 ? count($tests) : ($passed + $failed + $skipped);

// Console summary
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "📊 STDD PHPUnit Test Report\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "  Total: {$total}  ✅ Passed: {$passed}  ❌ Failed: {$failed}  ⏭️ Skipped: {$skipped}\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

// Write JSON report
@mkdir('stdd/reports', 0755, true);

$report = [
    'timestamp' => date('c'),
    'framework' => 'phpunit',
    'summary' => [
        'total' => $total,
        'passed' => $passed,
        'failed' => $failed,
        'skipped' => $skipped,
    ],
    'tests' => $tests,
];

file_put_contents(
    'stdd/reports/test-report.json',
    json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
);

exit($failed > 0 ? 1 : 0);
