/**
 * Unit tests for the stable task identity helpers in change-utils.
 *
 * apply rewrites tasks.md lines with [phase:*] markers at every phase
 * transition (suffix in the agent-facing template, prefix right after the
 * checkbox when updateTaskPhase inserts it), so raw task text must never be
 * compared verbatim across phases (REPORT.md 终测 D01).
 */

const { stripPhaseMarkers, taskKey } = require('../src/utils/change-utils');

describe('stripPhaseMarkers()', () => {
  it('strips a suffix marker', () => {
    expect(stripPhaseMarkers('TASK-001: build the board [phase:red]')).toBe('TASK-001: build the board');
  });

  it('strips a leading marker (apply-inserted form)', () => {
    expect(stripPhaseMarkers('[phase:green] TASK-001 Done thing')).toBe('TASK-001 Done thing');
  });

  it('strips every occurrence', () => {
    expect(stripPhaseMarkers('[phase:red] TASK-001 mixed [phase:green] text')).toBe('TASK-001 mixed text');
  });

  it('leaves marker-free text untouched', () => {
    expect(stripPhaseMarkers('TASK-001 Done thing')).toBe('TASK-001 Done thing');
  });
});

describe('taskKey()', () => {
  it('prefers the TASK id embedded anywhere in the text', () => {
    expect(taskKey('TASK-001: build the board [phase:red]')).toBe('TASK-001');
    expect(taskKey('[phase:green] TASK-003 add parser')).toBe('TASK-003');
  });

  it('falls back to the phase-stripped text when no TASK id exists', () => {
    expect(taskKey('Write the tests [phase:red]')).toBe('Write the tests');
    expect(taskKey('Write the tests')).toBe('Write the tests');
  });

  it('yields the same key for every phase of one task', () => {
    const phases = [
      'TASK-007: filter by priority [phase:red]',
      'TASK-007: filter by priority [phase:green]',
      'TASK-007: filter by priority [phase:refactor]',
    ];
    const keys = new Set(phases.map(taskKey));
    expect(keys.size).toBe(1);
    expect([...keys][0]).toBe('TASK-007');
  });
});
