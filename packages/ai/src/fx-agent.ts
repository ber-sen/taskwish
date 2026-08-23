import { spawn } from "node:child_process";
import * as acp from "@agentclientprotocol/sdk";
import {
  CodexAgent,
  type CodexAcpCommand,
  type CodexAgentMode,
  type CodexAgentOptions,
} from "./codex-agent";

/**
 * fx ACP permission modes. Unlike Codex's "read-only" mode, fx uses "ask" to
 * gate unresolved sensitive tool calls behind a permission request.
 *
 * @see https://fx.sh/docs/using-fx/acp
 */
export type FxAgentMode = "ask" | "code";

export type FxLogLevel = "trace" | "debug" | "info" | "warn" | "error";

/**
 * Options specific to the fx ACP server. These augment {@link CodexAgentOptions}
 * (shared ACP client behavior) with fx-specific launch configuration.
 *
 * @see https://fx.sh/docs/using-fx/acp
 */
export interface FxAgentOptions extends CodexAgentOptions {
  /**
   * Absolute path to the fx binary. Defaults to the "fx" found on PATH.
   */
  fxPath?: string;
  /**
   * Override the model for the server process and any loaded sessions.
   * Equivalent to `fx acp --model <id>`.
   */
  model?: string;
  /**
   * Write ACP diagnostics to an absolute file path. Equivalent to
   * `fx acp --log-file <path>`.
   */
  logFile?: string;
  /**
   * Log level passed to fx via `FX_LOG`. Falls back to the `FX_LOG` env var.
   */
  logLevel?: FxLogLevel;
  /**
   * Default mode applied by {@link FxAgent.streamAsk} when no mode is given.
   * Defaults to "ask", the fx equivalent of Codex "read-only".
   */
  defaultAskMode?: FxAgentMode;
}

/**
 * Maps a Codex {@link CodexAgentMode} to the closest fx ACP mode. fx has no
 * "read-only" mode; "ask" gates tool calls behind permission requests while
 * "code" auto-approves them.
 */
export function toFxMode(mode: CodexAgentMode | FxAgentMode | string): FxAgentMode {
  switch (mode) {
    case "read-only":
    case "ask":
      return "ask";
    case "agent":
    case "agent-full-access":
    case "code":
      return "code";
    default:
      return "ask";
  }
}

/**
 * Resolves the command used to launch the fx ACP server. If {@link FxAgentOptions.fxPath}
 * is provided it is used directly; otherwise the "fx" found on PATH is invoked
 * through the shell so the subclass does not need to locate the binary itself.
 */
export function resolveFxAcpCommand(options: FxAgentOptions = {}): CodexAcpCommand {
  const command = options.fxPath ?? "fx";
  const args = ["acp"];

  if (options.model) {
    args.push("--model", options.model);
  }

  if (options.logFile) {
    args.push("--log-file", options.logFile);
  }

  return { command, args };
}

/**
 * An ACP client for the fx agent, spawned via `fx acp`.
 *
 * fx speaks the same Agent Client Protocol as Codex, so this class reuses
 * {@link CodexAgent} as its ACP client and only overrides how the server
 * process is located, launched, and configured. Model selection is performed
 * with the `--model` flag rather than the `set_config_option` ACP method, and
 * the default ask mode is fx's "ask" instead of Codex "read-only".
 *
 * @see https://fx.sh/docs/using-fx/acp
 */
export class FxAgent extends CodexAgent {
  private readonly fxOptions: FxAgentOptions;

  constructor(options: FxAgentOptions = {}) {
    super({ ...options, name: options.name ?? "fx" });
    this.fxOptions = options;
  }

  protected override get defaultAskMode(): FxAgentMode {
    return this.fxOptions.defaultAskMode ?? "ask";
  }

  protected override resolveCommand(): CodexAcpCommand {
    return resolveFxAcpCommand(this.fxOptions);
  }

  protected override spawnOptions(): Parameters<typeof spawn>[2] {
    const options = super.spawnOptions();
    return {
      ...options,
      // fx uses the process working directory as its primary workspace.
      cwd: this.fxOptions.cwd ?? process.cwd(),
      env: this.createFxEnv(options.env as Record<string, string>),
    };
  }

  /**
   * fx configures the model with `--model` at launch, so the ACP
   * `set_config_option` calls Codex makes for the model are unnecessary.
   * Reasoning effort is not a fx concept and is ignored.
   */
  protected override async applySessionDefaults(
    _sessionId: acp.SessionId
  ): Promise<void> {
    // No-op: model is configured via `--model`; fx has no reasoning effort.
  }

  /**
   * Builds the fx process environment, mirroring the env produced by the base
   * class but applying fx-specific overrides (e.g. `FX_LOG`).
   */
  private createFxEnv(base: Record<string, string>): Record<string, string> {
    const env = { ...base };

    if (this.fxOptions.logLevel) {
      env.FX_LOG = this.fxOptions.logLevel;
    }

    return env;
  }
}

export function createFxAgent(options: FxAgentOptions = {}): FxAgent {
  return new FxAgent(options);
}
