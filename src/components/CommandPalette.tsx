import { ArrowRight, BookOpen, CircleQuestionMark, SquareTerminal } from "lucide-react";
import { BEGINNER_GROUPS, COMMAND_GROUPS, COMMAND_LABELS, type CommandId, type LabState } from "../engine";

interface Props {
  state: LabState;
  beginner: boolean;
  setBeginner: (value: boolean) => void;
  run: (id: CommandId) => void;
}

export default function CommandPalette({ state, beginner, setBeginner, run }: Props) {
  const groups = beginner ? BEGINNER_GROUPS : COMMAND_GROUPS;
  return (
    <section aria-label="Command palette">
      <div className="console-header">
        <div className="section-heading" style={{ marginBottom: 0 }}>
          <h2>
            <SquareTerminal size={19} strokeWidth={1.8} aria-hidden="true" /> Try a command
          </h2>
        </div>
        <div className="mode-switch" role="group" aria-label="Command visibility">
          <button
            type="button"
            className={beginner ? "active" : ""}
            aria-pressed={beginner}
            onClick={() => setBeginner(true)}
            data-testid="button-beginner-mode"
          >
            Beginner
          </button>
          <button
            type="button"
            className={beginner ? "" : "active"}
            aria-pressed={!beginner}
            onClick={() => setBeginner(false)}
            data-testid="button-all-commands"
          >
            All commands
          </button>
        </div>
      </div>
      <div className="command-panel">
        {beginner && (
          <div className="beginner-banner">
            <BookOpen size={19} strokeWidth={1.6} aria-hidden="true" />
            <span>
              Select a file, then try <strong>add → commit → push.</strong>
            </span>
          </div>
        )}
        <div className="command-groups">
          {groups.map((group) => (
            <div className="command-group" key={group.title}>
              <h3>{group.title}</h3>
              <div className="command-list">
                {group.commands.map((cmd) => {
                  const text = COMMAND_LABELS[cmd.id](state.selectedFile || "index.js", state);
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      className={`command-button ${beginner ? "primary-command" : ""}`}
                      onClick={() => run(cmd.id)}
                      aria-label={`Run ${text}`}
                      title={cmd.label}
                      data-testid={`button-command-${cmd.id}`}
                    >
                      <code>{text}</code>
                      <ArrowRight className="mini-chevron" size={16} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="command-hint">
          <CircleQuestionMark size={16} aria-hidden="true" />
          <span>Simulation only — nothing runs on your computer.</span>
        </div>
      </div>
    </section>
  );
}
