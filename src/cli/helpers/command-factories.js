/**
 * Command factory map builder
 *
 * Builds the commandFactories object passed to CommandLoader.
 * Keeps cli.js thin by moving the factory map into its own module.
 */

const {
  InitCommand, UpdateCommand, ListCommand, NewCommand, StatusCommand,
  ApplyCommand, VerifyCommand, ArchiveCommand, FFCommand, TurboCommand,
  MetricsCommand, GuardCommand, ExploreCommand, StartersCommand,
  ContinueCommand, IssueCommand, CommitCommand, ContextCommand,
  CiGeneratorCommand, AuditCommand, WorkspaceCommand, DepcheckCommand,
  SchemaCommand, ContractCommand, MockGenCommand, ValidateCommand,
  LearnCommand, RolesCommand, ExtensionsCommand, StoryCommand,
  UserTestCommand, PipelineCommand, FixPacketCommand, OutsideInCommand,
  ConstitutionFixCommand, MutationCommand, AgentEngine, SudoLangParser,
  BabyStepsCommand, SudoExecutor, ElicitationCommand,
  createAgentExecutor, ProductProposalCommand,
  StartCommand, DoctorCommand,
  SkillsCommand, CommandsCommand,
  GraphHistoryCommand, GraphRunCommand,
  WaiverManagerCommand,
  VisionCommand, PrpCommand, DesignCommand, CertaintyCommand, ComplexityCommand,
  FactoryCommand, MockCommand, IterateCommand, HelpCommand,
  ParallelCommand, SupervisorCommand,
  ProposeCommand, ClarifyCommand, ConfirmCommand, PlanCommand,
  ExecuteCommand, FinalDocCommand, CommitTddCommand,
} = require('../commands/index');
const { BrowserCommand } = require('../commands/browser');
const { SpecGenerator } = require('../commands/spec-generator');
const { ApiSpecCommand } = require('../commands/api-spec');
const { MemoryScanner } = require('../commands/memory-scan');
const { TddInitCommand } = require('../commands/tdd-init');

function buildCommandFactories() {
  return {
    InitCommand, UpdateCommand, ListCommand, NewCommand, StatusCommand,
    ApplyCommand, VerifyCommand, ArchiveCommand, FFCommand, TurboCommand,
    MetricsCommand, GuardCommand, ExploreCommand, StartersCommand,
    ContinueCommand, IssueCommand, CommitCommand, ContextCommand,
    CiGeneratorCommand, AuditCommand, WorkspaceCommand, DepcheckCommand,
    SchemaCommand, ContractCommand, MockGenCommand, ValidateCommand,
    LearnCommand, RolesCommand, ExtensionsCommand, StoryCommand,
    UserTestCommand, PipelineCommand, FixPacketCommand, OutsideInCommand,
    ConstitutionFixCommand, MutationCommand,
    BabyStepsCommand, ElicitationCommand,
    StartCommand, DoctorCommand,
    SkillsCommand, CommandsCommand,
    GraphHistoryCommand, GraphRunCommand,
    WaiverManagerCommand,
    ProductProposalCommand,
    VisionCommand, PrpCommand, DesignCommand, CertaintyCommand, ComplexityCommand,
    FactoryCommand, MockCommand, IterateCommand, HelpCommand,
    ParallelCommand, SupervisorCommand,
    ProposeCommand, ClarifyCommand, ConfirmCommand, PlanCommand,
    ExecuteCommand, FinalDocCommand, CommitTddCommand,
    AgentEngine, SudoLangParser, SudoExecutor, createAgentExecutor,
    RuntimeAgentCommand: AgentEngine,
    RuntimeSudoCommand: SudoLangParser,
    SudoExecutorCommand: SudoExecutor,
    BrowserCommand,
    SpecGenerator,
    ApiSpecCommand,
    MemoryCommand: MemoryScanner,
    TddInitCommand,
  };
}

module.exports = { buildCommandFactories };
