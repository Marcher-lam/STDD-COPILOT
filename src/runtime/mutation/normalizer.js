const crypto = require('crypto');

function normalizeMutationResult(input = {}, context = {}) {
  const tool = context.tool || input.tool || context.mode || input.mode || 'quick';
  const unixTimestamp = context.unixTimestamp || input.unixTimestamp || Date.now();
  const threshold = Number.isFinite(Number(context.threshold)) ? Number(context.threshold) : Number(input.threshold || 80);
  const mutationScore = input.score === null || input.score === undefined
    ? (input.mutationScore === undefined ? null : input.mutationScore)
    : input.score;
  const status = input.status || (Number(mutationScore) >= threshold ? 'pass' : 'fail');
  const normalized = {
    type: 'mutation',
    schemaVersion: 1,
    id: context.id || crypto.createHash('sha256').update(JSON.stringify({ tool, unixTimestamp, input })).digest('hex').slice(0, 16),
    timestamp: new Date(unixTimestamp).toISOString(),
    unixTimestamp,
    tool,
    mode: context.mode || input.mode || tool,
    // Quick mode never runs mutants (killed/survived/timeout stay null);
    // mark the score kind so evidence readers cannot mistake the heuristic
    // health score for a real mutation score (report finding P1-1).
    scoreKind: (context.mode || input.mode || tool) === 'quick' ? 'heuristic' : 'mutation',
    status,
    score: mutationScore,
    mutationScore,
    threshold,
    killed: numberOrNull(input.killed),
    survived: numberOrNull(input.survived),
    timeout: numberOrNull(input.timeout),
    assertions: Number(input.assertions || 0),
    placeholders: Number(input.placeholders || 0),
    reportPath: input.reportPath || null,
    reason: input.reason || null,
    exitCode: input.exitCode,
    output: input.output,
    workspace: context.workspace || input.workspace || null,
    changeName: context.changeName || input.changeName || null,
    results: input,
    metadata: {
      cwd: context.cwd || null,
      workspace: context.workspace || input.workspace || null,
      changeName: context.changeName || input.changeName || null,
    },
  };

  return normalized;
}

function numberOrNull(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

module.exports = { normalizeMutationResult };
