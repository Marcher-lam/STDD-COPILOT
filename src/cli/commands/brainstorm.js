/**
 * Brainstorm Command
 *
 * Compatibility adapter for the registry-backed elicitation engine.
 * The public CLI action for `stdd brainstorm` is ElicitationCommand; this
 * wrapper keeps older imports working without maintaining a divergent command
 * implementation or option set.
 */

const { ElicitationCommand } = require('./elicitation');

function normalizeTopic(topic) {
  if (Array.isArray(topic)) return topic.join(' ').trim();
  return String(topic || '').trim();
}

class BrainstormCommand {
  constructor(cwdOrSpinner) {
    this.delegate = new ElicitationCommand(cwdOrSpinner);
  }

  async execute(topic, options = {}) {
    const normalizedTopic = normalizeTopic(topic);
    if (!normalizedTopic && !options.list) {
      throw new Error('Topic is required for brainstorming.');
    }

    const args = normalizedTopic ? normalizedTopic.split(/\s+/) : [];
    return this.delegate.execute(args, options);
  }
}

module.exports = { BrainstormCommand, normalizeTopic };
