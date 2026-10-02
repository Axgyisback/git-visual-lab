// Pure simulation engine: no React in here. Every command is a function
// (state, commandId) -> new state, so it is easy to test and to replay.

export const WORKING = "Working Directory";
export const STAGING = "Staging Area";
export const LOCAL = "Local Repository";
export const REMOTE = "Remote";

export interface FileEntry {
  name: string;
  working: "modified" | "clean";
  staged: boolean;
}

export interface Commit {
  id: string;
  message: string;
  branch: string;
  parents: string[];
  files: string[];
}

export interface LastResult {
  command: string;
  explanation: string;
  touched: string[];
  output?: string;
  success: boolean;
}

export interface LabState {
  files: FileEntry[];
  commits: Commit[];
  branches: Record<string, string>;
  currentBranch: string;
  detached: boolean;
  remoteHead: string;
  remoteBranches: Record<string, string>;
  fetchedHead: string;
  stash: string[];
  selectedFile: string;
  last: LastResult;
  step: number;
}

export type CommandId =
  | "status" | "add" | "restore" | "commit" | "amend"
  | "clone" | "fetch" | "pull" | "push"
  | "branch" | "switch" | "merge" | "rebase"
  | "reset-soft" | "reset-mixed" | "reset-hard" | "revert" | "stash" | "stash-pop"
  | "log" | "diff";

export const COMMAND_GROUPS: { title: string; commands: { id: CommandId; label: string }[] }[] = [
  {
    title: "Saving changes",
    commands: [
      { id: "status", label: "git status" },
      { id: "add", label: "git add" },
      { id: "restore", label: "git restore (unstage)" },
      { id: "commit", label: "git commit" },
      { id: "amend", label: "git commit --amend" },
    ],
  },
  {
    title: "Syncing with remote",
    commands: [
      { id: "clone", label: "git clone" },
      { id: "fetch", label: "git fetch" },
      { id: "pull", label: "git pull" },
      { id: "push", label: "git push" },
    ],
  },
  {
    title: "Branching",
    commands: [
      { id: "branch", label: "git branch" },
      { id: "switch", label: "git switch / checkout" },
      { id: "merge", label: "git merge" },
      { id: "rebase", label: "git rebase" },
    ],
  },
  {
    title: "Undoing",
    commands: [
      { id: "reset-soft", label: "git reset --soft" },
      { id: "reset-mixed", label: "git reset --mixed" },
      { id: "reset-hard", label: "git reset --hard" },
      { id: "revert", label: "git revert" },
      { id: "stash", label: "git stash" },
      { id: "stash-pop", label: "git stash pop" },
    ],
  },
  {
    title: "Inspecting",
    commands: [
      { id: "log", label: "git log" },
      { id: "diff", label: "git diff" },
    ],
  },
];

export const BEGINNER_GROUPS: typeof COMMAND_GROUPS = [
  {
    title: "Saving changes",
    commands: [
      { id: "add", label: "Add" },
      { id: "commit", label: "Commit" },
      { id: "push", label: "Push" },
    ],
  },
];

const CLONE_URL = "https://github.com/example/hello-git.git";

export function initialState(): LabState {
  return {
    files: [
      { name: "index.js", working: "modified", staged: false },
      { name: "styles.css", working: "modified", staged: false },
      { name: "README.md", working: "modified", staged: false },
    ],
    commits: [
      {
        id: "a1b2c3d",
        message: "Initial project",
        branch: "main",
        parents: [],
        files: ["index.js", "styles.css", "README.md"],
      },
    ],
    branches: { main: "a1b2c3d" },
    currentBranch: "main",
    detached: false,
    remoteHead: "a1b2c3d",
    remoteBranches: { main: "a1b2c3d" },
    fetchedHead: "a1b2c3d",
    stash: [],
    selectedFile: "index.js",
    last: {
      command: "$ git status",
      explanation:
        "Three files have unsaved edits. Start by choosing a file and adding it to the staging area.",
      touched: [WORKING, STAGING],
      output: `On branch main
Changes not staged for commit:
  modified: index.js
  modified: styles.css
  modified: README.md`,
      success: true,
    },
    step: 0,
  };
}

// ---- helpers -------------------------------------------------------------

const tip = (s: LabState) => s.branches[s.currentBranch];
const findCommit = (s: LabState, id: string) => s.commits.find((c) => c.id === id);
// Next commit id, derived from the step counter (7 hex chars).
const nextId = (s: LabState) => (s.step + 1).toString(16).padStart(7, "0");
const hasUncommitted = (s: LabState) =>
  s.files.some((f) => f.staged || f.working === "modified");

/** True if `ancestor` is `descendant` or is reachable from it through parents. */
export function isAncestor(s: LabState, ancestor: string, descendant: string): boolean {
  if (ancestor === descendant) return true;
  const seen = new Set<string>();
  const stack = [descendant];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const parents = findCommit(s, id)?.parents ?? [];
    if (parents.includes(ancestor)) return true;
    stack.push(...parents);
  }
  return false;
}

function ok(
  s: LabState,
  command: string,
  explanation: string,
  touched: string[],
  output?: string,
  success = true,
): LabState {
  s.last = { command: `$ ${command}`, explanation, touched, output, success };
  return s;
}

function fail(s: LabState, command: string, explanation: string, touched: string[], output?: string) {
  return ok(s, command, explanation, touched, output, false);
}

function makeCommit(s: LabState, message: string, files: string[], parents = [tip(s)]): Commit {
  const c: Commit = { id: nextId(s), message, branch: s.currentBranch, parents, files };
  s.commits.push(c);
  s.branches[s.currentBranch] = c.id;
  return c;
}

function statusOutput(s: LabState) {
  const staged = s.files.filter((f) => f.staged).map((f) => `  modified: ${f.name}`);
  const unstaged = s.files.filter((f) => f.working === "modified").map((f) => `  modified: ${f.name}`);
  return [
    `On branch ${s.currentBranch}`,
    staged.length ? `Changes to be committed:\n${staged.join("\n")}` : "No changes staged for commit.",
    unstaged.length
      ? `Changes not staged for commit:\n${unstaged.join("\n")}`
      : "Working tree has no unstaged changes.",
  ].join("\n\n");
}

function setFiles(s: LabState, names: string[], working: FileEntry["working"], staged = false) {
  for (const name of names) {
    const f = s.files.find((x) => x.name === name);
    if (f) {
      f.working = working;
      f.staged = staged;
    } else {
      s.files.push({ name, working, staged });
    }
  }
}

const plural = (n: number, word = "file") => `${word}${n === 1 ? "" : "s"}`;

// ---- commands ------------------------------------------------------------

export function runCommand(prev: LabState, id: CommandId): LabState {
  const s = structuredClone(prev);
  s.step++;
  const sel = s.files.find((f) => f.name === s.selectedFile) ?? s.files[0];
  const name = sel?.name ?? "index.js";
  const staged = s.files.filter((f) => f.staged);
  const head = tip(s);
  const headCommit = findCommit(s, head);

  switch (id) {
    case "status":
      return ok(
        s,
        "git status",
        "Git reports what is staged, what is modified, and which branch is checked out; nothing moves.",
        [WORKING, STAGING, LOCAL],
        statusOutput(s),
      );

    case "add":
      if (!sel || sel.working !== "modified") {
        return fail(
          s,
          `git add ${name}`,
          `There are no unstaged edits in ${name} to add. Select another modified file.`,
          [WORKING, STAGING],
          "nothing to add",
        );
      }
      sel.staged = true;
      sel.working = "clean";
      return ok(
        s,
        `git add ${name}`,
        `A snapshot of ${name} moved from the working directory into the staging area.`,
        [WORKING, STAGING],
        `Changes to be committed:\n  modified: ${name}`,
      );

    case "restore": {
      if (!staged.length) {
        return fail(s, `git restore --staged ${name}`, "Nothing is staged yet; add a file first.", [
          STAGING,
          WORKING,
        ]);
      }
      const target = sel?.staged ? sel : staged[0];
      target.staged = false;
      target.working = "modified";
      return ok(
        s,
        `git restore --staged ${target.name}`,
        `${target.name} left the staging area; its edits are still safely in the working directory.`,
        [STAGING, WORKING],
      );
    }

    case "commit": {
      if (!staged.length) {
        return fail(
          s,
          'git commit -m "Update files"',
          "There are no staged changes to commit. Add a file first.",
          [STAGING, LOCAL],
          "nothing to commit",
        );
      }
      const names = staged.map((f) => f.name);
      const c = makeCommit(s, `Update ${names.length === 1 ? names[0] : `${names.length} files`}`, names);
      staged.forEach((f) => {
        f.staged = false;
        f.working = "clean";
      });
      return ok(
        s,
        `git commit -m "${c.message}"`,
        `${names.length} staged ${plural(names.length)} became commit ${c.id} on ${s.currentBranch}; the remote has not changed.`,
        [STAGING, LOCAL],
        `[${s.currentBranch} ${c.id}] ${c.message}`,
      );
    }

    case "amend": {
      if (!headCommit?.parents.length) {
        return fail(
          s,
          "git commit --amend --no-edit",
          "The initial commit is the only local commit; make another commit before amending it.",
          [STAGING, LOCAL],
        );
      }
      const files = [...new Set([...headCommit.files, ...staged.map((f) => f.name)])];
      const c: Commit = {
        id: nextId(s),
        message: headCommit.message,
        branch: s.currentBranch,
        parents: [...headCommit.parents],
        files,
      };
      s.commits.push(c);
      s.branches[s.currentBranch] = c.id;
      staged.forEach((f) => {
        f.staged = false;
        f.working = "clean";
      });
      return ok(
        s,
        "git commit --amend --no-edit",
        `The latest commit was replaced by ${c.id}${
          staged.length ? ` with ${staged.length} staged ${plural(staged.length)}` : ""
        }; its old ID is no longer the branch tip.`,
        [STAGING, LOCAL],
        `[${s.currentBranch} ${c.id}] ${c.message}`,
      );
    }

    case "clone": {
      const remote = s.remoteHead;
      s.currentBranch = "main";
      s.branches = { main: remote };
      s.fetchedHead = remote;
      s.stash = [];
      const names = [
        ...new Set([
          ...s.files.map((f) => f.name),
          ...s.commits.filter((c) => isAncestor(s, c.id, remote)).flatMap((c) => c.files),
        ]),
      ];
      s.files = names.map((n) => ({ name: n, working: "clean", staged: false }));
      s.selectedFile = s.files[0]?.name ?? "index.js";
      return ok(
        s,
        `git clone ${CLONE_URL}`,
        "A fresh local checkout was copied from the remote; this view now shows that new directory with a clean working tree.",
        [REMOTE, LOCAL, STAGING, WORKING],
        `Cloning into 'hello-git'...\nChecked out ${remote}`,
      );
    }

    case "fetch": {
      const moved = s.fetchedHead !== s.remoteHead;
      s.fetchedHead = s.remoteHead;
      return ok(
        s,
        "git fetch origin",
        moved
          ? "Remote commits were downloaded into origin/main; your local branch and working files did not change."
          : "The remote was checked, but origin/main was already up to date; your files did not change.",
        [REMOTE, LOCAL],
        moved ? `origin/main moved to ${s.remoteHead}` : "Already up to date.",
      );
    }

    case "pull": {
      s.fetchedHead = s.remoteHead;
      if (head === s.remoteHead) {
        return ok(s, "git pull origin main", "Git fetched from the remote, but the local branch was already up to date.", [REMOTE, LOCAL], "Already up to date.");
      }
      if (hasUncommitted(s)) {
        return fail(
          s,
          "git pull origin main",
          "Git fetched the remote commits, but stopped before merging because local edits could be overwritten; commit or stash them first.",
          [REMOTE, LOCAL, WORKING],
          "error: local changes would be overwritten by merge",
        );
      }
      if (isAncestor(s, head, s.remoteHead)) {
        s.branches[s.currentBranch] = s.remoteHead;
        setFiles(s, findCommit(s, s.remoteHead)?.files ?? [], "clean");
        return ok(
          s,
          "git pull origin main",
          `Remote changes were fetched and your ${s.currentBranch} branch fast-forwarded to ${s.remoteHead}; your working tree now matches it.`,
          [REMOTE, LOCAL, WORKING],
          `Fast-forward to ${s.remoteHead}`,
        );
      }
      if (isAncestor(s, s.remoteHead, head)) {
        return ok(s, "git pull origin main", "Git fetched the remote, but your local branch already contains its commits.", [REMOTE, LOCAL], "Already up to date.");
      }
      const files = findCommit(s, s.remoteHead)?.files ?? [];
      const c = makeCommit(s, "Merge origin/main", files, [head, s.remoteHead]);
      setFiles(s, files, "clean");
      return ok(
        s,
        "git pull origin main",
        `Git fetched and merged the remote branch into ${s.currentBranch}, creating merge commit ${c.id}.`,
        [REMOTE, LOCAL, WORKING],
        `Merge made by the ort strategy.\n[${c.id}] Merge origin/main`,
      );
    }

    case "push": {
      const remote = s.remoteBranches[s.currentBranch];
      const cmd = `git push origin ${s.currentBranch}`;
      if (head === remote) {
        return ok(s, cmd, "The remote already has this commit; there is nothing new to send.", [LOCAL, REMOTE], "Everything up-to-date");
      }
      if (remote && !isAncestor(s, remote, head)) {
        return fail(
          s,
          cmd,
          `The remote ${s.currentBranch} branch has commits your local branch does not contain. Integrate them before pushing.`,
          [LOCAL, REMOTE],
          "rejected (non-fast-forward)",
        );
      }
      s.remoteBranches[s.currentBranch] = head;
      if (s.currentBranch === "main") {
        s.remoteHead = head;
        s.fetchedHead = head;
      }
      return ok(
        s,
        cmd,
        `Commits through ${head} were uploaded to remote ${s.currentBranch}; working and staged files were not sent.`,
        [LOCAL, REMOTE],
        `To github.com/example/hello-git.git\n   ${head} -> ${s.currentBranch}`,
      );
    }

    case "branch": {
      if (s.branches.feature) {
        return ok(
          s,
          "git branch",
          "Git listed the existing branches; creating a branch never changes files or checks it out.",
          [LOCAL],
          Object.keys(s.branches)
            .map((b) => `${b === s.currentBranch ? "*" : " "} ${b}`)
            .join("\n"),
        );
      }
      s.branches.feature = head;
      return ok(
        s,
        "git branch feature",
        `A new feature branch points at ${head}; you are still on ${s.currentBranch}.`,
        [LOCAL],
        `Created branch feature at ${head}`,
      );
    }

    case "switch": {
      const target = s.currentBranch === "main" ? "feature" : "main";
      if (!s.branches[target]) {
        return fail(
          s,
          `git switch ${target}`,
          `The ${target} branch does not exist. Create it with git branch first.`,
          [LOCAL, WORKING],
        );
      }
      if (hasUncommitted(s)) {
        return fail(
          s,
          `git switch ${target}`,
          "Commit or stash your edits before switching branches in this lesson, so nothing is accidentally carried across.",
          [WORKING, STAGING, LOCAL],
          "error: local changes would be overwritten by checkout",
        );
      }
      s.currentBranch = target;
      return ok(
        s,
        `git switch ${target}`,
        `HEAD now points to ${target} at ${tip(s)}; the checked-out version of files follows that branch.`,
        [LOCAL, WORKING],
        `Switched to branch '${target}'`,
      );
    }

    case "merge": {
      const other = s.currentBranch === "main" ? "feature" : "main";
      const cmd = `git merge ${other}`;
      if (!s.branches[other]) {
        return fail(s, cmd, `Create the ${other} branch before merging it.`, [LOCAL]);
      }
      if (hasUncommitted(s)) {
        return fail(s, cmd, "Commit or stash local edits before merging in this lesson.", [WORKING, STAGING, LOCAL]);
      }
      const otherTip = s.branches[other];
      if (isAncestor(s, otherTip, head)) {
        return ok(s, cmd, `${other} is already included in ${s.currentBranch}; no new commit is needed.`, [LOCAL], "Already up to date.");
      }
      if (isAncestor(s, head, otherTip)) {
        s.branches[s.currentBranch] = otherTip;
        setFiles(s, findCommit(s, otherTip)?.files ?? [], "clean");
        return ok(
          s,
          cmd,
          `${s.currentBranch} fast-forwarded to ${other} without creating a merge commit.`,
          [LOCAL, WORKING],
          `Fast-forward to ${otherTip}`,
        );
      }
      const files = findCommit(s, otherTip)?.files ?? [];
      const c = makeCommit(s, `Merge branch '${other}'`, files, [head, otherTip]);
      setFiles(s, files, "clean");
      return ok(
        s,
        cmd,
        `Both branches had new commits, so Git created merge commit ${c.id} with two parents.`,
        [LOCAL, WORKING],
        `Merge made by the ort strategy.\n[${c.id}] Merge branch '${other}'`,
      );
    }

    case "rebase": {
      if (s.currentBranch !== "feature") {
        return fail(s, "git rebase main", "Switch to feature first; this lesson replays feature commits on top of main.", [LOCAL]);
      }
      if (hasUncommitted(s)) {
        return fail(s, "git rebase main", "Commit or stash edits before rebasing.", [WORKING, STAGING, LOCAL]);
      }
      const main = s.branches.main;
      if (isAncestor(s, main, head)) {
        return ok(s, "git rebase main", "Feature is already based on the latest main commit; history did not change.", [LOCAL], "Current branch feature is up to date.");
      }
      if (isAncestor(s, head, main)) {
        s.branches.feature = main;
        return ok(
          s,
          "git rebase main",
          `Feature had no unique commits, so its pointer moved to the latest main commit ${main}.`,
          [LOCAL, WORKING],
          `Successfully rebased feature onto ${main}`,
        );
      }
      // Collect the feature-only commits (oldest first), then replay them on main.
      const unique: Commit[] = [];
      let cursor: string | undefined = head;
      while (cursor && !isAncestor(s, cursor, main)) {
        const c = findCommit(s, cursor);
        if (!c) break;
        unique.unshift(c);
        cursor = c.parents[0];
      }
      let base = main;
      for (const c of unique) {
        const copy: Commit = {
          ...c,
          id: nextId(s) + unique.indexOf(c).toString(16),
          parents: [base],
          branch: "feature",
        };
        s.commits.push(copy);
        base = copy.id;
      }
      s.branches.feature = base;
      return ok(
        s,
        "git rebase main",
        `${unique.length} feature commit${unique.length === 1 ? " was" : "s were"} replayed on main with new IDs; main did not move.`,
        [LOCAL, WORKING],
        "Successfully rebased and updated refs/heads/feature.",
      );
    }

    case "reset-soft":
    case "reset-mixed":
    case "reset-hard": {
      const mode = id.split("-")[1];
      const cmd = `git reset --${mode} HEAD~1`;
      if (!headCommit?.parents.length) {
        return fail(s, cmd, "The branch is at its initial commit, so there is no previous commit to reset to.", [LOCAL, STAGING, WORKING]);
      }
      const files = headCommit.files;
      s.branches[s.currentBranch] = headCommit.parents[0];
      if (mode === "soft") {
        setFiles(s, files, "clean", true);
        return ok(
          s,
          cmd,
          `The branch moved back one commit; its ${files.length} changed ${plural(files.length)} stayed staged.`,
          [LOCAL, STAGING],
          `HEAD is now at ${tip(s)}`,
        );
      }
      if (mode === "mixed") {
        setFiles(s, files, "modified", false);
        return ok(
          s,
          cmd,
          "The branch moved back one commit and its staged changes became unstaged working edits.",
          [LOCAL, STAGING, WORKING],
          `Unstaged changes after reset:\n${files.join("\n")}`,
        );
      }
      s.files.forEach((f) => {
        f.staged = false;
        f.working = "clean";
      });
      return ok(
        s,
        cmd,
        "The branch moved back one commit; staged and working edits were discarded in this simulated checkout.",
        [LOCAL, STAGING, WORKING],
        `HEAD is now at ${tip(s)}`,
      );
    }

    case "revert": {
      const cmd = `git revert ${head}`;
      if (!headCommit?.parents.length) {
        return fail(s, cmd, "There is no later commit to undo yet. Make a commit first.", [LOCAL, WORKING]);
      }
      if (hasUncommitted(s)) {
        return fail(s, cmd, "Commit or stash current edits before reverting in this lesson.", [WORKING, STAGING, LOCAL]);
      }
      const c = makeCommit(s, `Revert "${headCommit.message}"`, headCommit.files);
      return ok(
        s,
        cmd,
        `A new commit ${c.id} records the inverse of ${head}; earlier history remains intact.`,
        [LOCAL, WORKING],
        `[${s.currentBranch} ${c.id}] Revert "${headCommit.message}"`,
      );
    }

    case "stash": {
      const cmd = 'git stash push -m "WIP"';
      if (!hasUncommitted(s)) {
        return fail(s, cmd, "The working directory and staging area are already clean; there is nothing to stash.", [WORKING, STAGING]);
      }
      s.stash = [
        ...new Set([
          ...s.stash,
          ...s.files.filter((f) => f.staged || f.working === "modified").map((f) => f.name),
        ]),
      ];
      s.files.forEach((f) => {
        f.staged = false;
        f.working = "clean";
      });
      return ok(
        s,
        cmd,
        `${s.stash.length} ${plural(s.stash.length)} with uncommitted edits were put aside; the checkout is clean.`,
        [WORKING, STAGING, LOCAL],
        "Saved working directory and index state On main: WIP",
      );
    }

    case "stash-pop": {
      if (!s.stash.length) {
        return fail(s, "git stash pop", "There is no saved stash to restore. Stash some edits first.", [LOCAL, WORKING]);
      }
      if (hasUncommitted(s)) {
        return fail(s, "git stash pop", "Commit or clear current edits before applying the saved stash in this lesson.", [WORKING, STAGING, LOCAL]);
      }
      const names = [...s.stash];
      setFiles(s, names, "modified");
      s.stash = [];
      return ok(
        s,
        "git stash pop",
        `${names.length} saved ${plural(names.length)} returned as unstaged working edits and the stash entry was removed.`,
        [LOCAL, WORKING],
        `Dropped refs/stash@{0}\n${names.join("\n")}`,
      );
    }

    case "log": {
      const lines: string[] = [];
      const seen = new Set<string>();
      let cursor: string | undefined = head;
      while (cursor && !seen.has(cursor)) {
        seen.add(cursor);
        const c = findCommit(s, cursor);
        if (!c) break;
        lines.push(`commit ${c.id}${cursor === head ? ` (HEAD -> ${s.currentBranch})` : ""}\n    ${c.message}`);
        cursor = c.parents[0];
      }
      return ok(
        s,
        "git log --oneline --decorate",
        "Git displayed the commits reachable from the current branch without changing any files.",
        [LOCAL],
        lines.join("\n\n"),
      );
    }

    case "diff": {
      const modified = s.files.filter((f) => f.working === "modified").map((f) => f.name);
      return ok(
        s,
        "git diff",
        modified.length
          ? "Git compared unstaged working edits with the staging area; staged changes are not included."
          : "There are no unstaged edits to compare with the staging area.",
        [WORKING, STAGING],
        modified.length
          ? modified
              .map((n) => `diff --git a/${n} b/${n}\n@@ -1 +1 @@\n- previous version\n+ edited version`)
              .join("\n\n")
          : "(no unstaged differences)",
      );
    }
  }
}

/** The "Teammate pushes" button: a new commit appears on the remote only. */
export function teammatePush(prev: LabState): LabState {
  const s = structuredClone(prev);
  s.step++;
  const c: Commit = {
    id: nextId(s),
    message: "Teammate updates docs",
    branch: "origin/main",
    parents: [s.remoteHead],
    files: ["README.md"],
  };
  s.commits.push(c);
  s.remoteHead = c.id;
  s.remoteBranches.main = c.id;
  return ok(
    s,
    "teammate: git push origin main",
    `A teammate pushed ${c.id} to GitHub. Try fetch or pull to see how your local copy catches up.`,
    [REMOTE],
    `Remote main moved to ${c.id}`,
  );
}

/** The exact command text shown on each button (depends on selected file / branch). */
export const COMMAND_LABELS: Record<CommandId, (file: string, s: LabState) => string> = {
  status: () => "git status",
  add: (file) => `git add ${file}`,
  restore: (file) => `git restore --staged ${file}`,
  commit: (_f, s) => {
    const names = s.files.filter((f) => f.staged).map((f) => f.name);
    return `git commit -m "Update ${names.length === 1 ? names[0] : names.length ? `${names.length} files` : "files"}"`;
  },
  amend: () => "git commit --amend --no-edit",
  clone: () => `git clone ${CLONE_URL}`,
  fetch: () => "git fetch origin",
  pull: () => "git pull origin main",
  push: (_f, s) => `git push origin ${s.currentBranch}`,
  branch: (_f, s) => (s.branches.feature ? "git branch" : "git branch feature"),
  switch: (_f, s) => `git switch ${s.currentBranch === "main" ? "feature" : "main"}`,
  merge: (_f, s) => `git merge ${s.currentBranch === "main" ? "feature" : "main"}`,
  rebase: () => "git rebase main",
  "reset-soft": () => "git reset --soft HEAD~1",
  "reset-mixed": () => "git reset --mixed HEAD~1",
  "reset-hard": () => "git reset --hard HEAD~1",
  revert: (_f, s) => `git revert ${s.branches[s.currentBranch] || "HEAD"}`,
  stash: () => 'git stash push -m "WIP"',
  "stash-pop": () => "git stash pop",
  log: () => "git log --oneline --decorate",
  diff: () => "git diff",
};
