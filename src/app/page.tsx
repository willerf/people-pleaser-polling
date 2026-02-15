"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/lib/theme";
import { VotingMethod } from "@/types/poll";

const VOTING_METHOD_OPTIONS: { value: VotingMethod; label: string; description: string }[] = [
  { value: "slider", label: "Slider", description: "Rate each option from -1 to +1" },
  { value: "ranked", label: "Ranked Choice", description: "Rank options in order of preference" },
  { value: "single", label: "Single Choice", description: "Pick your favorite option" },
  { value: "veto", label: "Veto", description: "Pick one option to eliminate" },
];

function SettingsModal({
  open,
  onClose,
  hideScores,
  setHideScores,
  votingMethod,
  setVotingMethod,
}: {
  open: boolean;
  onClose: () => void;
  hideScores: boolean;
  setHideScores: (v: boolean) => void;
  votingMethod: VotingMethod;
  setVotingMethod: (v: VotingMethod) => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0" style={{ background: "var(--overlay)" }} />
      <div
        className="relative theme-surface border theme-border rounded-2xl p-6 w-full max-w-sm space-y-4 theme-shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold theme-text">Settings</h2>
          <button
            onClick={onClose}
            className="theme-muted hover:theme-text text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium theme-text">Voting Method</label>
          <select
            value={votingMethod}
            onChange={(e) => setVotingMethod(e.target.value as VotingMethod)}
            className="w-full border theme-border rounded-xl px-4 py-2.5 theme-text focus:outline-none focus:border-[#3498DB] focus:ring-2 focus:ring-[#3498DB]/20 transition-all text-sm"
            style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
          >
            {VOTING_METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs theme-secondary">
            {VOTING_METHOD_OPTIONS.find((o) => o.value === votingMethod)?.description}
          </p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hideScores}
            onChange={(e) => setHideScores(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-[#2ECC71] focus:ring-[#2ECC71] focus:ring-offset-0"
          />
          <div>
            <p className="text-sm font-medium theme-text">Hide scores</p>
            <p className="text-xs theme-secondary">
              Hide average scores when the poll ends
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}

export default function CreatePoll() {
  const router = useRouter();
  const [title, setTitle] = useState("Vote on it!");
  const [options, setOptions] = useState(["", ""]);
  const [hideScores, setHideScores] = useState(false);
  const [votingMethod, setVotingMethod] = useState<VotingMethod>("slider");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  useEffect(() => {
    if (focusIndex !== null && inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex]?.focus();
      setFocusIndex(null);
    }
  }, [focusIndex, options.length]);

  function updateOption(index: number, value: string) {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index === options.length - 1) {
        setOptions([...options, ""]);
        setFocusIndex(index + 1);
      } else {
        inputRefs.current[index + 1]?.focus();
      }
    }
  }

  function handleGhostFocus() {
    setOptions([...options, ""]);
    setFocusIndex(options.length);
  }

  async function handleCreate() {
    const filled = options.filter((o) => o.trim().length > 0);
    if (filled.length < 2) return;

    setLoading(true);
    try {
      const res = await fetch("/api/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ options: filled, hideScores, votingMethod, title }),
      });
      const data = await res.json();
      if (data.id) {
        const url = `${window.location.origin}/poll/${data.id}`;
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          // clipboard may not be available
        }
        router.push(`/poll/${data.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  const canCreate = options.filter((o) => o.trim().length > 0).length >= 2;
  const allFilled = options.every((o) => o.trim().length > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <img
        src="/logo.png"
        alt="People Pleaser Polling"
        className="w-36 h-36 mx-auto drop-shadow-lg object-contain"
      />
      <p className="theme-secondary text-center text-sm">
        Create a poll and share it with friends
      </p>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Vote on it!"
        className="w-full theme-input border theme-border rounded-xl px-4 py-2.5 theme-text placeholder:theme-muted focus:outline-none focus:border-[#3498DB] focus:ring-2 focus:ring-[#3498DB]/20 transition-all text-center font-bold text-lg"
        style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
      />

      <div className="theme-surface rounded-2xl p-4 theme-shadow border theme-border-light space-y-3">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <input
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              placeholder={`Option ${i + 1}`}
              className="flex-1 theme-input border theme-border rounded-xl px-4 py-2.5 theme-text placeholder:theme-muted focus:outline-none focus:border-[#3498DB] focus:ring-2 focus:ring-[#3498DB]/20 transition-all"
              style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
            />
            {options.length > 2 && (
              <button
                onClick={() => removeOption(i)}
                className="px-3 py-2 theme-muted hover:text-[#E74C3C] transition-colors"
              >
                &times;
              </button>
            )}
          </div>
        ))}

        {allFilled && (
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              onFocus={handleGhostFocus}
              placeholder={`Option ${options.length + 1}`}
              className="flex-1 border border-dashed theme-border rounded-xl px-4 py-2.5 theme-text focus:outline-none focus:border-[#3498DB] cursor-pointer transition-all"
              style={{ background: "var(--bg-input-ghost)", color: "var(--text-primary)" }}
            />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCreate}
          disabled={!canCreate || loading}
          className="flex-1 py-3 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-40 disabled:shadow-none"
          style={{
            background: canCreate && !loading
              ? "linear-gradient(135deg, #2ECC71, #27AE60)"
              : "var(--text-faint)",
          }}
        >
          {loading ? "Creating..." : "Create Poll"}
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-12 h-12 flex items-center justify-center rounded-xl theme-surface border theme-border theme-secondary hover:theme-text theme-shadow transition-all"
          title="Settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        hideScores={hideScores}
        setHideScores={setHideScores}
        votingMethod={votingMethod}
        setVotingMethod={setVotingMethod}
      />
    </div>
  );
}
