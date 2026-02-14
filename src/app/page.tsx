"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

function SettingsModal({
  open,
  onClose,
  showScores,
  setShowScores,
}: {
  open: boolean;
  onClose: () => void;
  showScores: boolean;
  setShowScores: (v: boolean) => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showScores}
            onChange={(e) => setShowScores(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
          />
          <div>
            <p className="text-sm text-gray-200">Show scores</p>
            <p className="text-xs text-gray-500">
              Display average scores for all options when the poll ends
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}

export default function CreatePoll() {
  const router = useRouter();
  const [options, setOptions] = useState(["", ""]);
  const [showScores, setShowScores] = useState(false);
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
        body: JSON.stringify({ options: filled, showScores }),
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
      <div className="flex items-center justify-between">
        <div className="w-9" />
        <h1 className="text-3xl font-bold text-center">
          People Pleaser Polling
        </h1>
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
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
      <p className="text-gray-400 text-center">
        Create a poll and share it with friends
      </p>

      <div className="space-y-3">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <input
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              placeholder={`Option ${i + 1}`}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            {options.length > 2 && (
              <button
                onClick={() => removeOption(i)}
                className="px-3 py-2 text-gray-400 hover:text-red-400 transition-colors"
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
              className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 cursor-pointer"
            />
          </div>
        )}
      </div>

      <button
        onClick={handleCreate}
        disabled={!canCreate || loading}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold transition-colors"
      >
        {loading ? "Creating..." : "Create Poll"}
      </button>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        showScores={showScores}
        setShowScores={setShowScores}
      />
    </div>
  );
}
