import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { initialState, runCommand, teammatePush, type CommandId, type LabState } from "./engine";
import WorkflowMap from "./components/WorkflowMap";
import CommandPalette from "./components/CommandPalette";
import Feedback from "./components/Feedback";
import InfoTip from "./components/InfoTip";

// What the user did, recorded so "Replay" can re-run it step by step.
type Action = { kind: "command"; id: CommandId; file: string } | { kind: "teammate" };

const REPLAY_STEP_MS = 650;

export default function App() {
  const [state, setState] = useState<LabState>(initialState);
  const [beginner, setBeginner] = useState(true);
  const [history, setHistory] = useState<Action[]>([]);
  const [replaying, setReplaying] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const run = (id: CommandId) => {
    if (replaying) return;
    setState((s) => runCommand(s, id));
    setHistory((h) => [...h, { kind: "command", id, file: state.selectedFile }]);
  };

  const simulateTeammate = () => {
    if (replaying) return;
    setState((s) => teammatePush(s));
    setHistory((h) => [...h, { kind: "teammate" }]);
  };

  const selectFile = (name: string) => setState((s) => ({ ...s, selectedFile: name }));

  const reset = () => {
    clearTimers();
    setReplaying(false);
    setHistory([]);
    setState(initialState());
  };

  const replay = () => {
    if (!history.length || replaying) return;
    clearTimers();
    setReplaying(true);
    setState(initialState());
    history.forEach((action, i) => {
      timers.current.push(
        setTimeout(
          () =>
            setState((s) =>
              action.kind === "teammate"
                ? teammatePush(s)
                : runCommand({ ...s, selectedFile: action.file }, action.id),
            ),
          (i + 1) * REPLAY_STEP_MS,
        ),
      );
    });
    timers.current.push(setTimeout(() => setReplaying(false), (history.length + 1) * REPLAY_STEP_MS));
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <span aria-hidden="true" />
        <div className="brand">
          <span className="brand-name">
            git_<strong>VISUAL</strong>_lab
          </span>
        </div>
        <div className="topbar-right">
          <InfoTip label="What is Git?" title="What is Git?" align="right" size={20} className="header-info">
            <p>
              Git is a free tool that saves <strong>snapshots of your project</strong>. You can go back to any
              earlier version, try ideas safely, and work with other people without overwriting each other's
              files.
            </p>
            <p>
              <strong>Good for:</strong> developers, students, designers, writers: anyone whose files change
              over time or who works in a team.
            </p>
            <p>
              <strong>GitHub</strong> is a website that keeps a shared copy of your Git project online.
            </p>
          </InfoTip>
        </div>
      </header>
      <main className="main">
        <aside className="personal-note" aria-label="About this project">
          <div>
            <p>
              <strong>Hey! Daniel here.</strong> I am learning Git version control and wanted to share some visuals that
              would have helped me tremendously when I was starting out. Enjoy! Hope it helps!
            </p>
          </div>
          <a
            className="linkedin-link"
            href="https://www.linkedin.com/in/daniel-dvoracek-479743353/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Let's connect on LinkedIn (Daniel Dvoracek)"
          >
            <span>Let's connect on LinkedIn</span>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
            </svg>
          </a>
        </aside>
        <div className="intro">
          <div>
            <h1>
              See where your code <em>goes.</em>
            </h1>
            <p className="intro-copy">Choose a file. Run a command. Watch Git work.</p>
          </div>
          <div className="intro-actions">
            <button
              className="outline-button primary"
              type="button"
              onClick={replay}
              disabled={!history.length || replaying}
              data-testid="button-replay"
            >
              <Play size={13} fill="currentColor" /> {replaying ? "Replaying..." : "Replay"}
            </button>
            <button className="outline-button" type="button" onClick={reset} data-testid="button-reset">
              <RotateCcw size={14} /> Reset lab
            </button>
          </div>
        </div>
        <WorkflowMap state={state} selectFile={selectFile} teammatePush={simulateTeammate} replaying={replaying} />
        <div className="workspace">
          <CommandPalette state={state} beginner={beginner} setBeginner={setBeginner} run={run} />
          <div id="legend">
            <Feedback state={state} />
          </div>
        </div>
      </main>
    </div>
  );
}
