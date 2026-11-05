/**
 * Unit tests for the delta-spec engine (OpenSpec-aligned archive semantics).
 *
 * Covers:
 * - parseDeltaSections: full "## ADDED Requirements" and legacy "## ADDED"
 *   section forms, Purpose extraction, RENAMED FROM/TO parsing
 * - parseSpecRequirements: preamble/requirement block splitting
 * - applyDelta: real header-based merge (ADDED/MODIFIED/REMOVED/RENAMED),
 *   conflict detection, idempotent re-apply, legacy raw-body compatibility
 */

const {
  parseDeltaSections,
  parseSpecRequirements,
  applyDelta,
} = require('../src/utils/delta-spec');

const MAIN_SPEC = `# Auth Capability

## Purpose

Authentication for the app.

### Requirement: User login

The system SHALL authenticate users with email and password.

#### Scenario: Valid credentials
- **WHEN** the user submits valid credentials
- **THEN** the system grants a session

### Requirement: Session timeout

The system SHALL expire sessions after 30 minutes.

#### Scenario: Idle session
- **WHEN** the session is idle for 30 minutes
- **THEN** the session is terminated
`;

describe('parseDeltaSections()', () => {
  it('parses full OpenSpec section headers (## ADDED Requirements)', () => {
    const delta = [
      '## ADDED Requirements',
      '',
      '### Requirement: OAuth login',
      'The system SHALL support OAuth.',
      '',
      '## MODIFIED Requirements',
      '',
      '### Requirement: User login',
      'The system SHALL authenticate with MFA.',
      '',
      '## REMOVED Requirements',
      '',
      '### Requirement: Session timeout',
      '',
      '## RENAMED Requirements',
      '- FROM: `### Requirement: User login`',
      '- TO: `### Requirement: Login flow`',
    ].join('\n');

    const parsed = parseDeltaSections(delta);
    expect(parsed.hasSections).toBe(true);
    expect(parsed.sections.added.requirements).toHaveLength(1);
    expect(parsed.sections.added.requirements[0].name).toBe('OAuth login');
    expect(parsed.sections.modified.requirements).toHaveLength(1);
    expect(parsed.sections.modified.requirements[0].name).toBe('User login');
    expect(parsed.sections.removed.requirements).toHaveLength(1);
    expect(parsed.sections.removed.requirements[0].name).toBe('Session timeout');
    expect(parsed.sections.renamed.entries).toEqual([
      { from: 'User login', to: 'Login flow' },
    ]);
  });

  it('parses legacy short section headers (## ADDED)', () => {
    const parsed = parseDeltaSections('## ADDED\n\nSome legacy content\n');
    expect(parsed.hasSections).toBe(true);
    expect(parsed.sections.added.requirements).toHaveLength(0);
    expect(parsed.sections.added.rawBody).toContain('Some legacy content');
  });

  it('extracts an optional Purpose section', () => {
    const delta = '## Purpose\n\nTheme switching for the app.\n\n## ADDED Requirements\n\n### Requirement: Theme selection\nThe app SHALL support themes.\n';
    const parsed = parseDeltaSections(delta);
    expect(parsed.purpose).toContain('Theme switching');
  });

  it('reports hasSections=false for plain content', () => {
    const parsed = parseDeltaSections('Just a plain spec body\n');
    expect(parsed.hasSections).toBe(false);
    expect(parsed.sections.added.requirements).toHaveLength(0);
  });
});

describe('parseSpecRequirements()', () => {
  it('splits preamble and requirement blocks', () => {
    const parsed = parseSpecRequirements(MAIN_SPEC);
    expect(parsed.preamble).toContain('# Auth Capability');
    expect(parsed.preamble).toContain('## Purpose');
    expect(parsed.requirements.map(r => r.name)).toEqual([
      'User login',
      'Session timeout',
    ]);
  });

  it('keeps requirement bodies intact', () => {
    const parsed = parseSpecRequirements(MAIN_SPEC);
    expect(parsed.requirements[0].body).toContain('#### Scenario: Valid credentials');
  });

  it('returns whole content as preamble when no requirement headers exist', () => {
    const parsed = parseSpecRequirements('# Plain spec\n\nNo requirement headers.\n');
    expect(parsed.requirements).toHaveLength(0);
    expect(parsed.preamble).toContain('No requirement headers.');
  });
});

describe('applyDelta()', () => {
  it('appends ADDED requirements as proper requirement blocks', () => {
    const delta = [
      '## ADDED Requirements',
      '',
      '### Requirement: OAuth login',
      'The system SHALL support OAuth.',
      '',
      '#### Scenario: OAuth provider',
      '- **WHEN** the user picks an OAuth provider',
      '- **THEN** the system redirects to the provider',
    ].join('\n');

    const result = applyDelta(MAIN_SPEC, delta);
    expect(result.conflicts).toEqual([]);
    expect(result.content).toContain('### Requirement: User login');
    expect(result.content).toContain('### Requirement: OAuth login');
    expect(result.content).toContain('The system SHALL support OAuth.');
    expect(result.operations).toEqual(
      expect.arrayContaining([expect.stringContaining('added "OAuth login"')])
    );
  });

  it('appends legacy raw ADDED bodies inside STDD markers (backward compatible)', () => {
    const result = applyDelta(MAIN_SPEC, '## ADDED\n\nNew section\n');
    expect(result.conflicts).toEqual([]);
    expect(result.content).toContain('STDD:ADDED');
    expect(result.content).toContain('New section');
  });

  it('replaces MODIFIED requirement bodies in place', () => {
    const delta = [
      '## MODIFIED Requirements',
      '',
      '### Requirement: User login',
      'The system SHALL authenticate users with email, password, and MFA.',
      '',
      '#### Scenario: Valid credentials with MFA',
      '- **WHEN** the user submits valid credentials and an MFA code',
      '- **THEN** the system grants a session',
    ].join('\n');

    const result = applyDelta(MAIN_SPEC, delta);
    expect(result.conflicts).toEqual([]);
    expect(result.content).toContain('email, password, and MFA');
    expect(result.content).not.toContain('email and password.');
    // Position preserved: login block still before timeout block
    expect(result.content.indexOf('User login')).toBeLessThan(result.content.indexOf('Session timeout'));
    expect(result.operations).toEqual(
      expect.arrayContaining([expect.stringContaining('modified "User login"')])
    );
  });

  it('removes REMOVED requirement blocks entirely', () => {
    const delta = [
      '## REMOVED Requirements',
      '',
      '### Requirement: Session timeout',
      '(Deprecated because sessions are now JWT based.)',
    ].join('\n');

    const result = applyDelta(MAIN_SPEC, delta);
    expect(result.conflicts).toEqual([]);
    expect(result.content).not.toContain('### Requirement: Session timeout');
    expect(result.content).not.toContain('expire sessions after 30 minutes');
    expect(result.content).toContain('### Requirement: User login');
  });

  it('renames requirement headers via RENAMED entries', () => {
    const delta = [
      '## RENAMED Requirements',
      '- FROM: `### Requirement: User login`',
      '- TO: `### Requirement: Login flow`',
    ].join('\n');

    const result = applyDelta(MAIN_SPEC, delta);
    expect(result.conflicts).toEqual([]);
    expect(result.content).not.toContain('### Requirement: User login');
    expect(result.content).toContain('### Requirement: Login flow');
    expect(result.content).toContain('grants a session');
  });

  it('applies sections in order: RENAMED, REMOVED, MODIFIED, ADDED', () => {
    // RENAMED then MODIFIED-by-new-name must succeed in one delta.
    const delta = [
      '## RENAMED Requirements',
      '- FROM: `### Requirement: User login`',
      '- TO: `### Requirement: Login flow`',
      '',
      '## MODIFIED Requirements',
      '',
      '### Requirement: Login flow',
      'The system SHALL authenticate with passkeys.',
    ].join('\n');

    const result = applyDelta(MAIN_SPEC, delta);
    expect(result.conflicts).toEqual([]);
    expect(result.content).toContain('### Requirement: Login flow');
    expect(result.content).toContain('passkeys');
    expect(result.content).not.toContain('### Requirement: User login');
  });

  it('flags MODIFIED target missing as a conflict and leaves content unchanged', () => {
    const delta = [
      '## MODIFIED Requirements',
      '',
      '### Requirement: Nonexistent requirement',
      'The system SHALL do something.',
    ].join('\n');

    const result = applyDelta(MAIN_SPEC, delta);
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].type).toBe('modified-target-missing');
    expect(result.content).toBe(MAIN_SPEC);
  });

  it('flags ADDED header that already exists with different content', () => {
    const delta = [
      '## ADDED Requirements',
      '',
      '### Requirement: User login',
      'The system SHALL authenticate with magic links.',
    ].join('\n');

    const result = applyDelta(MAIN_SPEC, delta);
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].type).toBe('added-conflict');
    expect(result.content).toBe(MAIN_SPEC);
  });

  it('treats re-adding an identical requirement as already-synced (idempotent)', () => {
    const delta = [
      '## ADDED Requirements',
      '',
      '### Requirement: OAuth login',
      'The system SHALL support OAuth.',
    ].join('\n');

    const first = applyDelta(MAIN_SPEC, delta);
    expect(first.conflicts).toEqual([]);

    const second = applyDelta(first.content, delta);
    expect(second.conflicts).toEqual([]);
    expect(second.warnings.length).toBeGreaterThan(0);
    expect(second.warnings.some(w => w.type === 'already-synced')).toBe(true);
    expect(second.content).toBe(first.content);
  });

  it('warns instead of failing when REMOVED target is already absent', () => {
    const delta = [
      '## REMOVED Requirements',
      '',
      '### Requirement: Already gone',
      '(Removed in an earlier change.)',
    ].join('\n');

    const result = applyDelta(MAIN_SPEC, delta);
    expect(result.conflicts).toEqual([]);
    expect(result.warnings.some(w => w.type === 'already-removed')).toBe(true);
    expect(result.content).toBe(MAIN_SPEC);
  });

  it('flags case/whitespace near-miss REMOVED as a conflict', () => {
    const delta = [
      '## REMOVED Requirements',
      '',
      '### Requirement: user  login',
      '(Typo on purpose.)',
    ].join('\n');

    const result = applyDelta(MAIN_SPEC, delta);
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].type).toBe('removed-case-mismatch');
  });

  it('flags RENAMED source missing and target missing as a conflict', () => {
    const delta = [
      '## RENAMED Requirements',
      '- FROM: `### Requirement: Ghost requirement`',
      '- TO: `### Requirement: Phantom requirement`',
    ].join('\n');

    const result = applyDelta(MAIN_SPEC, delta);
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].type).toBe('renamed-source-missing');
  });

  it('treats RENAMED source missing with target present as already-synced', () => {
    const once = applyDelta(MAIN_SPEC, [
      '## RENAMED Requirements',
      '- FROM: `### Requirement: User login`',
      '- TO: `### Requirement: Login flow`',
    ].join('\n'));

    const twice = applyDelta(once.content, [
      '## RENAMED Requirements',
      '- FROM: `### Requirement: User login`',
      '- TO: `### Requirement: Login flow`',
    ].join('\n'));

    expect(twice.conflicts).toEqual([]);
    expect(twice.warnings.some(w => w.type === 'already-synced')).toBe(true);
    expect(twice.content).toBe(once.content);
  });

  it('flags RENAMED when the target name already exists', () => {
    const delta = [
      '## RENAMED Requirements',
      '- FROM: `### Requirement: User login`',
      '- TO: `### Requirement: Session timeout`',
    ].join('\n');

    const result = applyDelta(MAIN_SPEC, delta);
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].type).toBe('renamed-target-exists');
  });

  it('flags a REMOVED entry that names the FROM side of a RENAMED in the same delta', () => {
    const delta = [
      '## RENAMED Requirements',
      '- FROM: `### Requirement: User login`',
      '- TO: `### Requirement: Login flow`',
      '',
      '## REMOVED Requirements',
      '',
      '### Requirement: User login',
      '(Conflicts with the rename above.)',
    ].join('\n');

    const result = applyDelta(MAIN_SPEC, delta);
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].type).toBe('removed-renamed-conflict');
  });

  it('flags duplicate requirement headers inside one delta section', () => {
    const delta = [
      '## ADDED Requirements',
      '',
      '### Requirement: OAuth login',
      'The system SHALL support OAuth.',
      '',
      '### Requirement: OAuth login',
      'The system SHALL support OAuth via SSO.',
    ].join('\n');

    const result = applyDelta(MAIN_SPEC, delta);
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].type).toBe('duplicate-header');
  });

  it('passes plain content through as a legacy append when no sections exist', () => {
    const result = applyDelta(MAIN_SPEC, 'Just plain delta content\n');
    expect(result.conflicts).toEqual([]);
    expect(result.content).toContain('Just plain delta content');
    expect(result.content).toContain('### Requirement: User login');
  });

  it('ends the merged document with a single trailing newline', () => {
    const delta = '## ADDED Requirements\n\n### Requirement: OAuth login\nThe system SHALL support OAuth.\n';
    const result = applyDelta(MAIN_SPEC, delta);
    expect(result.content.endsWith('\n')).toBe(true);
    expect(result.content.endsWith('\n\n')).toBe(false);
  });
});
