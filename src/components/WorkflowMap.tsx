import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  Cloud,
  CloudUpload,
  FileCode2,
  FolderCode,
  GitBranch,
  GitCommitHorizontal,
  GitGraph,
  PackageCheck,
  Route,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { LabState } from "../engine";
import InfoTip from "./InfoTip";
import Term from "./Term";
import { fadeSlide } from "../motion";

/** Beginner explanations for the labels shown on commits and the remote. */
function refTip(name: string): { title: string; tip: ReactNode } {
  switch (name) {
    case "HEAD":
      return {
        title: "HEAD",
        tip: <>Where you are right now: the commit you are working from. It normally points to the latest commit on your current branch.</>,
      };
    case "origin/main":
      return {
        title: "origin/main",
        tip: (
          <>
            Your computer's last-known copy of GitHub's <code>main</code> branch. It only updates when you run{" "}
            <code>git fetch</code>, <code>pull</code> or <code>push</code>.
          </>
        ),
      };
    case "GitHub main":
      return {
        title: "GitHub main",
        tip: <>Where <code>main</code> really is on GitHub right now. If a teammate pushes, this moves ahead of <code>origin/main</code> until you fetch.</>,
      };
    case "main":
      return { title: "main", tip: <>A branch: a movable label for a line of work. <code>main</code> is the default one, the project's official history.</> };
    case "feature":
      return { title: "feature", tip: <>A side branch for new work. It stays separate from <code>main</code> until you merge it.</> };
    default:
      return { title: name, tip: <>A branch: a movable label that points to a commit.</> };
  }
}

function FileCard(props: { name: string; selected?: boolean; staged?: boolean; onClick?: () => void }) {
  const { name, selected, staged, onClick } = props;
  const inner = (
    <>
      <FileCode2 size={14} strokeWidth={1.7} aria-hidden="true" />
      <span className="filename">{name}</span>
      {staged ? (
        <Check className="file-check" size={16} aria-hidden="true" />
      ) : (
        <span className="change">modified</span>
      )}
    </>
  );
  return (
    <motion.div
      layout="position"
      layoutId={`file-${name}`}
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.93 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      {onClick ? (
        <button
          type="button"
          className={`file-card ${selected ? "selected" : ""}`}
          onClick={onClick}
          aria-pressed={selected}
          aria-label={`Select ${name} for file commands`}
          data-testid={`button-select-file-${name}`}
        >
          {inner}
        </button>
      ) : (
        <div className="file-card staged" data-testid={`card-staged-file-${name}`}>
          {inner}
        </div>
      )}
    </motion.div>
  );
}

function EmptyZone({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="empty-zone">
      <Icon size={20} strokeWidth={1.4} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function ZoneHeader(props: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone: string;
  tip: ReactNode;
  tipAlign?: "left" | "right";
}) {
  const Icon = props.icon;
  return (
    <>
      <div className="zone-top">
        <span className={`zone-icon ${props.tone}`}>
          <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <InfoTip label={`What is the ${props.title}?`} title={props.title} align={props.tipAlign}>
          {props.tip}
        </InfoTip>
      </div>
      <h3>{props.title}</h3>
      <p className="zone-subtitle">{props.subtitle}</p>
    </>
  );
}

interface Props {
  state: LabState;
  selectFile: (name: string) => void;
  teammatePush: () => void;
  replaying: boolean;
}

export default function WorkflowMap({ state, selectFile, teammatePush, replaying }: Props) {
  const modified = state.files.filter((f) => f.working === "modified");
  const staged = state.files.filter((f) => f.staged);
  const headId = state.branches[state.currentBranch];

  // Commits reachable from any local branch tip or from the fetched origin/main.
  const reachable = new Set<string>();
  const queue = [...Object.values(state.branches), ...(state.fetchedHead ? [state.fetchedHead] : [])];
  while (queue.length) {
    const id = queue.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    queue.push(...(state.commits.find((c) => c.id === id)?.parents ?? []));
  }
  const visibleCommits = state.commits.filter((c) => reachable.has(c.id)).reverse().slice(0, 6);

  const remoteCommit = state.commits.find((c) => c.id === state.remoteHead);
  const inSync = !!(state.remoteHead && headId === state.remoteHead);

  return (
    <section aria-label="Git workflow map">
      <div className="section-heading">
        <h2>
          <Route size={19} strokeWidth={1.7} aria-hidden="true" /> Where changes go
        </h2>
      </div>
      <LayoutGroup id="git-areas">
        <div className="flow-frame">
          <div className="flow-grid">
            {/* Working directory */}
            <div className="zone">
              <ZoneHeader
                title="Working Directory"
                subtitle="Your edited files"
                icon={FolderCode}
                tone="working"
                tip={
                  <p>
                    The project folder on your computer, where you edit files. Git notices which files changed,
                    but <strong>nothing is saved yet</strong>.
                  </p>
                }
              />
              <div className="file-list" aria-label="Modified files">
                <AnimatePresence mode="popLayout">
                  {modified.map((f) => (
                    <FileCard
                      key={f.name}
                      name={f.name}
                      selected={state.selectedFile === f.name}
                      onClick={() => selectFile(f.name)}
                    />
                  ))}
                </AnimatePresence>
              </div>
              {!modified.length && <EmptyZone icon={Check}>No edits here</EmptyZone>}
            </div>

            {/* Staging area */}
            <div className="zone">
              <ZoneHeader
                title="Staging Area"
                subtitle="Ready for the next commit"
                icon={PackageCheck}
                tone="staging"
                tip={
                  <p>
                    A waiting room for your next save. You pick <strong>which changes</strong> to include, then
                    commit them together. <code>git add</code> moves a file here.
                  </p>
                }
              />
              <div className="file-list" aria-label="Staged files">
                <AnimatePresence mode="popLayout">
                  {staged.map((f) => (
                    <FileCard key={f.name} name={f.name} staged />
                  ))}
                </AnimatePresence>
              </div>
              {!staged.length && <EmptyZone icon={ArrowDownToLine}>Use git add to stage a file</EmptyZone>}
            </div>

            {/* Local repository */}
            <div className="zone">
              <ZoneHeader
                title="Local Repository"
                subtitle="Commits on your machine"
                icon={GitGraph}
                tone="local"
                tip={
                  <>
                    <p>Your saved history, stored on your computer.</p>
                    <p>
                      A <strong>commit</strong> is one saved snapshot with a short message, like a checkpoint in a
                      game. You can go back to any commit later.
                    </p>
                  </>
                }
              />
              <div className="branch-row">
                <Term
                  className={`branch-chip ${state.detached ? "detached" : ""}`}
                  title="Current branch"
                  tip={<>The branch you are on. New commits you make are added to it.</>}
                >
                  <span className="branch-chip-inner" data-testid="text-current-branch">
                    <GitBranch size={14} aria-hidden="true" />
                    {state.detached ? "detached HEAD" : state.currentBranch}
                  </span>
                </Term>
              </div>
              <div className="commit-graph" aria-label="Commit history">
                <AnimatePresence mode="popLayout">
                  {visibleCommits.map((c) => {
                    const refs = [
                      ...(c.id === headId ? ["HEAD"] : []),
                      ...Object.entries(state.branches).filter(([, id]) => id === c.id).map(([name]) => name),
                      ...(c.id === state.fetchedHead ? ["origin/main"] : []),
                      ...(c.id === state.remoteHead ? ["GitHub main"] : []),
                    ];
                    return (
                      <motion.div
                        key={c.id}
                        layout="position"
                        className={`commit-node ${c.id === headId ? "is-head" : ""} ${c.id === state.remoteHead ? "is-remote" : ""}`}
                        {...fadeSlide}
                        data-testid={`card-commit-${c.id}`}
                      >
                        <span className="commit-dot" />
                        <span className="commit-copy">
                          <span className="commit-message">{c.message}</span>
                          <Term
                            className="commit-hash"
                            title="Commit ID"
                            tip={<>A short unique ID for this commit, like a fingerprint. It points to this exact snapshot.</>}
                          >
                            {c.id.slice(0, 7)}
                          </Term>
                          <span className="commit-refs">
                            {refs.map((r) => (
                              <Term
                                key={r}
                                {...refTip(r)}
                                className={`commit-ref ${
                                  r === "HEAD" ? "head-ref" : r === "GitHub main" ? "remote-ref" : r === "origin/main" ? "tracking-ref" : ""
                                }`}
                              >
                                {r}
                              </Term>
                            ))}
                          </span>
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              {!visibleCommits.length && <EmptyZone icon={GitCommitHorizontal}>No commits yet</EmptyZone>}
            </div>

            {/* Remote */}
            <div className="zone">
              <ZoneHeader
                title="Remote (GitHub)"
                subtitle="Shared with your team"
                icon={CloudUpload}
                tone="remote"
                tipAlign="right"
                tip={
                  <p>
                    A copy of the project online (for example on GitHub) that your team shares.{" "}
                    <code>git push</code> uploads your commits, <code>git pull</code> downloads theirs.
                  </p>
                }
              />
              <motion.div layout className="remote-visual">
                <div className="remote-line">
                  <Cloud size={18} strokeWidth={1.6} aria-hidden="true" />
                  <Term
                    title="origin / main"
                    tip={<><code>origin</code> is the nickname for the remote copy on GitHub. <code>main</code> is the branch on it.</>}
                  >
                    <strong>origin / main</strong>
                  </Term>
                </div>
                <div className="remote-details">
                  <Term title="Remote HEAD" tip={<>The newest commit on GitHub's <code>main</code> branch.</>}>
                    HEAD
                  </Term>
                  <ArrowRight size={11} aria-hidden="true" />
                  <span data-testid="text-remote-head">{state.remoteHead ? state.remoteHead.slice(0, 7) : "not set"}</span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div key={state.remoteHead} className="remote-commit" {...fadeSlide}>
                    <GitCommitHorizontal size={17} aria-hidden="true" />
                    <span>
                      <strong>{remoteCommit?.message ?? "No remote commit"}</strong>
                    </span>
                  </motion.div>
                </AnimatePresence>
                <div className="remote-note">
                  {inSync ? "In sync with your local branch" : "Different from local — try push or pull"}
                </div>
              </motion.div>
              <div className="remote-branch">
                <Term
                  title="Fetched"
                  tip={<>The newest GitHub commit your computer has downloaded so far (updated by <code>git fetch</code>).</>}
                >
                  Fetched: origin/main
                </Term>{" "}
                <span data-testid="text-fetched-head">{state.fetchedHead ? state.fetchedHead.slice(0, 7) : "none yet"}</span>
              </div>
              {state.remoteBranches.feature && (
                <div className="remote-branch">
                  <Term title="Remote feature" tip={<>The <code>feature</code> branch as it exists on GitHub after you pushed it.</>}>
                    Remote feature
                  </Term>{" "}
                  <span>{state.remoteBranches.feature.slice(0, 7)}</span>
                </div>
              )}
              <button
                type="button"
                className="teammate-button"
                onClick={teammatePush}
                disabled={replaying}
                data-testid="button-simulate-teammate-push"
              >
                <Users size={16} aria-hidden="true" /> Teammate pushes <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </LayoutGroup>
    </section>
  );
}
