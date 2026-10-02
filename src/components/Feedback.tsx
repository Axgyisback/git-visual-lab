import { AnimatePresence, motion } from "framer-motion";
import { Braces, Terminal } from "lucide-react";
import type { LabState } from "../engine";
import { fadeSlide } from "../motion";

const LEGEND = [
  { tone: "orange", label: "Working — edits" },
  { tone: "purple", label: "Staging — selected changes" },
  { tone: "blue", label: "Local — saved commits" },
  { tone: "green", label: "Remote — shared commits" },
];

export default function Feedback({ state }: { state: LabState }) {
  const last = state.last;
  const touched = last.touched || [];
  return (
    <div className="feedback-column">
      <section
        className={`feedback-panel ${last.success ? "" : "feedback-error"}`}
        aria-live="polite"
        aria-label="Command result"
      >
        <div className="feedback-top">
          <h3>
            <Terminal size={19} strokeWidth={1.7} aria-hidden="true" /> What happened
          </h3>
          <span className="step-count" data-testid="text-step-count">
            {state.step ? `Step ${state.step}` : "Ready"}
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${state.step}-${last.command}-${last.success}`}
            className="feedback-content"
            {...fadeSlide}
          >
            <div className="terminal-line" data-testid="text-latest-command">
              <span>$</span>
              {last.command ? last.command.replace(/^\$\s*/, "") : "ready to explore"}
            </div>
            <p className="feedback-explanation" data-testid="text-explanation">
              {last.explanation || "Select a file and run a command to see how changes move through Git."}
            </p>
            {last.output && (
              <pre className="output-box" data-testid="text-command-output">
                {last.output}
              </pre>
            )}
            <div className="touched-wrap">
              <div className="feedback-label">Touched</div>
              <div className="touched-list">
                {touched.map((t, i) => (
                  <span className="touched-tag" key={`${t}-${i}`}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
      <section className="helper-panel" aria-label="Color legend">
        <h3>
          <Braces size={19} strokeWidth={1.7} aria-hidden="true" /> Reading the map
        </h3>
        {LEGEND.map((row) => (
          <div className="legend-row" key={row.tone}>
            <i className={`legend-swatch ${row.tone}`} />
            <span>{row.label}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
