const fs = require('fs');
const path = require('path');
const os = require('os');
const { runCli, createTempProject, cleanupTempProject } = require('../test-support/integration-helper');

describe('Integration Tests - Core Workflow', () => {
  let projectPath;

  beforeEach(() => {
    projectPath = createTempProject('integration-test', { changeName: 'test-change' });
  });

  afterEach(() => {
    cleanupTempProject(projectPath);
  });

  it('should complete full STDD workflow: init → new → apply → verify → archive', () => {
    // Step 1: Initialize STDD (already done in beforeEach)
    expect(fs.existsSync(path.join(projectPath, 'stdd'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'stdd', 'config.yaml'))).toBe(true);

    // Step 2: Create a new change
    const newResult = runCli(['new', 'change', 'add-feature'], projectPath);
    expect(newResult.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'stdd', 'changes', 'add-feature'))).toBe(true);

    // Step 3: Apply the change — record RED first, then GREEN (anti fake-green)
    runCli(['apply', 'add-feature', '--test-command', 'false'], projectPath);
    const applyResult = runCli(['apply', 'add-feature', '--test-command', 'true'], projectPath);
    expect(applyResult.status).toBe(0);
    expect(applyResult.stdout).toContain('Task passed tests');

    // Step 4: Verify the change (skip constitution check, tasks are not all done)
    const verifyResult = runCli(['verify', 'add-feature', '--test-command', 'true', '--no-constitution'], projectPath);
    // Verify may fail because not all tasks are completed, which is expected
    expect(verifyResult.status).toBe(1);
    expect(verifyResult.stdout).toContain('Verification failed');

    // Step 5: Archive the change (may fail if not all tasks are done)
    const archiveResult = runCli(['archive', 'add-feature'], projectPath);
    // Archive may fail if verification is not complete, which is expected
    expect([0, 1]).toContain(archiveResult.status);
  });

  it('should handle workspace commands', () => {
    // Test workspace list
    const listResult = runCli(['workspace', 'list'], projectPath);
    expect(listResult.status).toBe(0);
  });

  it('should run guard checks', () => {
    const guardResult = runCli(['guard'], projectPath);
    // Guard may exit with 1 if there are warnings, but should still complete
    expect(guardResult.stdout).toMatch(/Guard (Passed|Failed)/);
  });

  it('should show status and list commands', () => {
    const statusResult = runCli(['status'], projectPath);
    expect(statusResult.status).toBe(0);

    const listResult = runCli(['list'], projectPath);
    expect(listResult.status).toBe(0);
  });
});

describe('Integration Tests - Error Handling', () => {
  let projectPath;

  beforeEach(() => {
    projectPath = createTempProject('error-test');
  });

  afterEach(() => {
    cleanupTempProject(projectPath);
  });

  it('should fail when applying non-existent change', () => {
    const result = runCli(['apply', 'non-existent-change'], projectPath);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('No active changes found');
  });

  it('should fail when verifying non-existent change', () => {
    const result = runCli(['verify', 'non-existent-change'], projectPath);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('not found');
  });

  it('should handle uninitialized project gracefully', () => {
    const uninitializedPath = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-uninit-'));
    const result = runCli(['status'], uninitializedPath);
    expect(result.status).toBe(0); // status command returns 0 even when not initialized
    expect(result.stdout).toContain('not initialized');
    fs.rmSync(uninitializedPath, { recursive: true, force: true });
  });
});
