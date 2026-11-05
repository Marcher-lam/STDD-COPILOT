/**
 * Suggested fresh-look engines for failure delegation (superpowers
 * fix-loop: hand off to a different engine than the one that failed).
 * Shared by apply's delegation evidence and graph-run's node failures.
 */
const DELEGATION_ENGINES = ['claude_code', 'cursor', 'copilot', 'qwen_code'];

module.exports = { DELEGATION_ENGINES };
