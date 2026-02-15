"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import confetti from "canvas-confetti";
import { ThemeToggle } from "@/lib/theme";
import { VotingMethod } from "@/types/poll";

type PollState = {
  title: string;
  options: string[];
  voteCount: number;
  ended: boolean;
  winner: string | null;
  hideScores: boolean;
  votingMethod: VotingMethod;
  scores: number[] | null;
};

type Phase = "loading" | "voting" | "waiting" | "results" | "not_found";

function HoldToEndButton({ onEnd }: { onEnd: () => void }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const startTime = useRef<number>(0);
  const animFrame = useRef<number>(0);

  function startHold() {
    setHolding(true);
    startTime.current = Date.now();
    tick();
  }

  function tick() {
    const elapsed = Date.now() - startTime.current;
    const p = Math.min(elapsed / 1000, 1);
    setProgress(p);
    if (p >= 1) {
      setHolding(false);
      setProgress(0);
      onEnd();
    } else {
      animFrame.current = requestAnimationFrame(tick);
    }
  }

  function cancelHold() {
    setHolding(false);
    setProgress(0);
    cancelAnimationFrame(animFrame.current);
  }

  useEffect(() => {
    return () => cancelAnimationFrame(animFrame.current);
  }, []);

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      onTouchCancel={cancelHold}
      className="relative w-full py-3 rounded-xl font-bold overflow-hidden select-none touch-none text-white shadow-md"
    >
      <div className="absolute inset-0 bg-[#E74C3C]/30" />
      <div
        className="absolute inset-0 origin-left"
        style={{
          background: "linear-gradient(135deg, #E74C3C, #C0392B)",
          transform: `scaleX(${progress})`,
          transition: holding ? "none" : "transform 0.2s ease-out",
        }}
      />
      <span className="relative z-10">
        {holding
          ? `Hold${".".repeat(Math.min(Math.floor(progress * 4) + 1, 3))}`
          : "Hold to End Poll"}
      </span>
    </button>
  );
}

function fireConfetti() {
  const duration = 2000;
  const end = Date.now() + duration;

  function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: ["#2ECC71", "#3498DB", "#F39C12", "#E74C3C", "#F1C40F"],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: ["#2ECC71", "#3498DB", "#F39C12", "#E74C3C", "#F1C40F"],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }

  confetti({
    particleCount: 80,
    spread: 100,
    origin: { y: 0.5 },
    colors: ["#2ECC71", "#3498DB", "#F39C12", "#F1C40F", "#1ABC9C"],
  });

  frame();
}

function getVotedKey(id: string) {
  return `voted_${id}`;
}

/* ── Voting UIs ── */

function SliderVoting({
  options,
  sliders,
  setSliders,
}: {
  options: string[];
  sliders: number[];
  setSliders: (v: number[]) => void;
}) {
  return (
    <div className="theme-surface rounded-2xl p-5 theme-shadow border theme-border-light space-y-6">
      {options.map((option, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium theme-text">{option}</span>
            <span className="theme-secondary tabular-nums w-12 text-right font-medium">
              {sliders[i]?.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.1}
            value={sliders[i] ?? 0}
            onChange={(e) => {
              const next = [...sliders];
              next[i] = parseFloat(e.target.value);
              setSliders(next);
            }}
          />
          <div className="flex justify-between text-xs theme-muted">
            <span>Against</span>
            <span>Neutral</span>
            <span>For</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RankedVoting({
  options,
  rankings,
  setRankings,
}: {
  options: string[];
  rankings: number[];
  setRankings: (v: number[]) => void;
}) {
  // Build ordered list: index of option at each rank position
  const ordered = options
    .map((_, i) => i)
    .sort((a, b) => rankings[a] - rankings[b]);

  const [dragState, setDragState] = useState<{
    pos: number;        // position being dragged
    startY: number;     // pointer Y at drag start
    currentY: number;   // current pointer Y
    itemHeight: number; // height of one item (including gap)
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  function moveUp(pos: number) {
    if (pos === 0) return;
    const newRankings = [...rankings];
    const thisIdx = ordered[pos];
    const aboveIdx = ordered[pos - 1];
    newRankings[thisIdx] = rankings[aboveIdx];
    newRankings[aboveIdx] = rankings[thisIdx];
    setRankings(newRankings);
  }

  function moveDown(pos: number) {
    if (pos === ordered.length - 1) return;
    const newRankings = [...rankings];
    const thisIdx = ordered[pos];
    const belowIdx = ordered[pos + 1];
    newRankings[thisIdx] = rankings[belowIdx];
    newRankings[belowIdx] = rankings[thisIdx];
    setRankings(newRankings);
  }

  function handlePointerDown(pos: number, e: React.PointerEvent) {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    // Item height + gap (8px from space-y-2)
    const itemHeight = rect.height + 8;
    target.setPointerCapture(e.pointerId);
    setDragState({ pos, startY: e.clientY, currentY: e.clientY, itemHeight });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState) return;
    setDragState({ ...dragState, currentY: e.clientY });
  }

  function handlePointerUp() {
    if (!dragState) return;
    const offset = dragState.currentY - dragState.startY;
    const moveBy = Math.round(offset / dragState.itemHeight);
    const fromPos = dragState.pos;
    const toPos = Math.max(0, Math.min(ordered.length - 1, fromPos + moveBy));

    if (fromPos !== toPos) {
      // Reorder: remove from fromPos, insert at toPos
      const newOrdered = [...ordered];
      const [moved] = newOrdered.splice(fromPos, 1);
      newOrdered.splice(toPos, 0, moved);
      // Rebuild rankings from new order
      const newRankings = [...rankings];
      newOrdered.forEach((optIdx, pos) => {
        newRankings[optIdx] = pos + 1;
      });
      setRankings(newRankings);
    }
    setDragState(null);
  }

  // Compute which position the dragged item is currently over
  const overPos = dragState
    ? Math.max(0, Math.min(ordered.length - 1, dragState.pos + Math.round((dragState.currentY - dragState.startY) / dragState.itemHeight)))
    : -1;

  return (
    <div ref={containerRef} className="theme-surface rounded-2xl p-5 theme-shadow border theme-border-light space-y-2">
      <p className="text-xs theme-secondary uppercase tracking-widest font-bold mb-3">
        Drag to rank — #1 is your top choice
      </p>
      {ordered.map((optIdx, pos) => {
        const isDragging = dragState?.pos === pos;
        const offsetY = isDragging ? dragState.currentY - dragState.startY : 0;

        // Shift other items out of the way
        let shiftY = 0;
        if (dragState && !isDragging) {
          const dragFrom = dragState.pos;
          if (dragFrom < overPos && pos > dragFrom && pos <= overPos) {
            shiftY = -dragState.itemHeight;
          } else if (dragFrom > overPos && pos < dragFrom && pos >= overPos) {
            shiftY = dragState.itemHeight;
          }
        }

        return (
          <div
            key={optIdx}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all select-none ${
              isDragging ? "theme-border ring-2 ring-[#3498DB]/30 z-10 relative" : "theme-border"
            }`}
            style={{
              background: "var(--bg-input)",
              transform: isDragging
                ? `translateY(${offsetY}px) scale(1.02)`
                : `translateY(${shiftY}px)`,
              transition: isDragging ? "box-shadow 0.15s" : "transform 0.2s ease",
              zIndex: isDragging ? 10 : 1,
              touchAction: "none",
            }}
          >
            {/* Drag handle */}
            <div
              onPointerDown={(e) => handlePointerDown(pos, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="cursor-grab active:cursor-grabbing theme-muted hover:theme-text px-0.5 py-1 touch-none"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="5" cy="3" r="1.5" />
                <circle cx="11" cy="3" r="1.5" />
                <circle cx="5" cy="8" r="1.5" />
                <circle cx="11" cy="8" r="1.5" />
                <circle cx="5" cy="13" r="1.5" />
                <circle cx="11" cy="13" r="1.5" />
              </svg>
            </div>
            <span className="text-sm font-bold theme-secondary w-6 text-center">
              {pos + 1}
            </span>
            <span className="flex-1 text-sm font-medium theme-text">
              {options[optIdx]}
            </span>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => moveUp(pos)}
                disabled={pos === 0}
                className="px-1.5 py-0.5 text-xs rounded theme-secondary hover:theme-text disabled:opacity-20 transition-all"
              >
                &#9650;
              </button>
              <button
                onClick={() => moveDown(pos)}
                disabled={pos === ordered.length - 1}
                className="px-1.5 py-0.5 text-xs rounded theme-secondary hover:theme-text disabled:opacity-20 transition-all"
              >
                &#9660;
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SingleChoiceVoting({
  options,
  selected,
  setSelected,
}: {
  options: string[];
  selected: number | null;
  setSelected: (v: number) => void;
}) {
  return (
    <div className="theme-surface rounded-2xl p-5 theme-shadow border theme-border-light space-y-2">
      <p className="text-xs theme-secondary uppercase tracking-widest font-bold mb-3">
        Pick your favorite
      </p>
      {options.map((option, i) => {
        const isSelected = selected === i;
        return (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`w-full text-left rounded-xl px-4 py-3 border transition-all text-sm font-medium ${
              isSelected
                ? "border-[#3498DB] ring-2 ring-[#3498DB]/20 text-[#3498DB]"
                : "theme-border theme-text hover:border-[#3498DB]/50"
            }`}
            style={{ background: isSelected ? "var(--bg-input)" : "var(--bg-input)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? "border-[#3498DB]" : "theme-border"
                }`}
              >
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-[#3498DB]" />
                )}
              </div>
              {option}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function VetoVoting({
  options,
  selected,
  setSelected,
}: {
  options: string[];
  selected: number | null;
  setSelected: (v: number) => void;
}) {
  return (
    <div className="theme-surface rounded-2xl p-5 theme-shadow border theme-border-light space-y-2">
      <p className="text-xs theme-secondary uppercase tracking-widest font-bold mb-3">
        Select one option to veto
      </p>
      {options.map((option, i) => {
        const isSelected = selected === i;
        return (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`w-full text-left rounded-xl px-4 py-3 border transition-all text-sm font-medium ${
              isSelected
                ? "border-[#E74C3C] ring-2 ring-[#E74C3C]/20 text-[#E74C3C]"
                : "theme-border theme-text hover:border-[#E74C3C]/50"
            }`}
            style={{ background: isSelected ? "var(--bg-input)" : "var(--bg-input)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border-2 ${
                  isSelected ? "border-[#E74C3C] bg-[#E74C3C]" : "theme-border"
                }`}
              >
                {isSelected && (
                  <span className="text-white text-xs leading-none">&times;</span>
                )}
              </div>
              {option}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Results UIs ── */

function SliderResults({
  options,
  scores,
  winner,
}: {
  options: string[];
  scores: number[];
  winner: string | null;
}) {
  return (
    <div className="theme-surface rounded-2xl p-5 theme-shadow border theme-border-light space-y-3 text-left">
      <p className="text-xs theme-secondary uppercase tracking-widest font-bold">
        Average Scores
      </p>
      {options
        .map((option, i) => ({ option, score: scores[i] }))
        .sort((a, b) => b.score - a.score)
        .map(({ option, score }, i) => {
          const maxScore = Math.max(...scores.map(Math.abs), 0.1);
          const barPercent = (Math.abs(score) / maxScore) * 50;
          const isWinner = option === winner;
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className={isWinner ? "font-bold text-[#2ECC71]" : "theme-text"}>
                  {option}
                </span>
                <span className="theme-secondary tabular-nums font-medium">
                  {score > 0 ? "+" : ""}{score.toFixed(1)}
                </span>
              </div>
              <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-bar)" }}>
                <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ background: "var(--border)" }} />
                <div
                  className={`absolute top-0 bottom-0 rounded-full ${isWinner ? "opacity-100" : "opacity-60"}`}
                  style={{
                    background: score >= 0
                      ? "linear-gradient(90deg, #2ECC71, #27AE60)"
                      : "linear-gradient(270deg, #E74C3C, #C0392B)",
                    ...(score >= 0
                      ? { left: "50%", width: `${barPercent}%` }
                      : { right: "50%", width: `${barPercent}%` }),
                  }}
                />
              </div>
            </div>
          );
        })}
      <div className="flex justify-between text-xs theme-faint mt-1">
        <span>-1.0</span>
        <span>0</span>
        <span>+1.0</span>
      </div>
    </div>
  );
}

function RankedResults({
  options,
  scores,
  winner,
}: {
  options: string[];
  scores: number[];
  winner: string | null;
}) {
  const maxScore = Math.max(...scores, 0.1);
  return (
    <div className="theme-surface rounded-2xl p-5 theme-shadow border theme-border-light space-y-3 text-left">
      <p className="text-xs theme-secondary uppercase tracking-widest font-bold">
        Borda Scores — Winner by ranked choice
      </p>
      {options
        .map((option, i) => ({ option, score: scores[i] }))
        .sort((a, b) => b.score - a.score)
        .map(({ option, score }, i) => {
          const barPercent = (score / maxScore) * 100;
          const isWinner = option === winner;
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className={isWinner ? "font-bold text-[#2ECC71]" : "theme-text"}>
                  {option}
                </span>
                <span className="theme-secondary tabular-nums font-medium">
                  {score.toFixed(1)}
                </span>
              </div>
              <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-bar)" }}>
                <div
                  className={`absolute top-0 bottom-0 left-0 rounded-full ${isWinner ? "opacity-100" : "opacity-60"}`}
                  style={{
                    background: "linear-gradient(90deg, #3498DB, #2F80ED)",
                    width: `${barPercent}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
    </div>
  );
}

function SingleChoiceResults({
  options,
  scores,
  winner,
}: {
  options: string[];
  scores: number[];
  winner: string | null;
}) {
  const maxScore = Math.max(...scores, 1);
  return (
    <div className="theme-surface rounded-2xl p-5 theme-shadow border theme-border-light space-y-3 text-left">
      <p className="text-xs theme-secondary uppercase tracking-widest font-bold">
        Vote Counts
      </p>
      {options
        .map((option, i) => ({ option, score: scores[i] }))
        .sort((a, b) => b.score - a.score)
        .map(({ option, score }, i) => {
          const barPercent = (score / maxScore) * 100;
          const isWinner = option === winner;
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className={isWinner ? "font-bold text-[#2ECC71]" : "theme-text"}>
                  {option}
                </span>
                <span className="theme-secondary tabular-nums font-medium">
                  {score} vote{score !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-bar)" }}>
                <div
                  className={`absolute top-0 bottom-0 left-0 rounded-full ${isWinner ? "opacity-100" : "opacity-60"}`}
                  style={{
                    background: "linear-gradient(90deg, #2ECC71, #27AE60)",
                    width: `${barPercent}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
    </div>
  );
}

function VetoResults({
  options,
  scores,
  winner,
}: {
  options: string[];
  scores: number[];
  winner: string | null;
}) {
  const maxScore = Math.max(...scores, 1);
  return (
    <div className="theme-surface rounded-2xl p-5 theme-shadow border theme-border-light space-y-3 text-left">
      <p className="text-xs theme-secondary uppercase tracking-widest font-bold">
        Veto Counts — Fewest vetoes wins
      </p>
      {options
        .map((option, i) => ({ option, score: scores[i] }))
        .sort((a, b) => a.score - b.score)
        .map(({ option, score }, i) => {
          const barPercent = (score / maxScore) * 100;
          const isWinner = option === winner;
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className={isWinner ? "font-bold text-[#2ECC71]" : "theme-text"}>
                  {option}
                </span>
                <span className="theme-secondary tabular-nums font-medium">
                  {score} veto{score !== 1 ? "es" : ""}
                </span>
              </div>
              <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-bar)" }}>
                <div
                  className={`absolute top-0 bottom-0 left-0 rounded-full ${isWinner ? "opacity-100" : "opacity-60"}`}
                  style={{
                    background: "linear-gradient(90deg, #E74C3C, #C0392B)",
                    width: `${barPercent}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
    </div>
  );
}

export default function PollPage() {
  const params = useParams();
  const id = params.id as string;

  const [poll, setPoll] = useState<PollState | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [sliders, setSliders] = useState<number[]>([]);
  const [rankings, setRankings] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const confettiFired = useRef(false);

  const hasVoted = useCallback(() => {
    try {
      return localStorage.getItem(getVotedKey(id)) === "true";
    } catch {
      return false;
    }
  }, [id]);

  const markVoted = useCallback(() => {
    try {
      localStorage.setItem(getVotedKey(id), "true");
    } catch {
      // localStorage not available
    }
  }, [id]);

  const fetchPoll = useCallback(async () => {
    try {
      const res = await fetch(`/api/poll/${id}`);
      if (!res.ok) {
        if (res.status === 404) setPhase("not_found");
        return;
      }
      const data: PollState = await res.json();
      setPoll(data);

      if (data.ended) {
        setPhase("results");
      } else if (phase === "loading") {
        if (hasVoted()) {
          setPhase("waiting");
        } else {
          // Initialize voting state based on method
          const method = data.votingMethod || "slider";
          if (method === "slider") {
            setSliders(data.options.map(() => 0));
          } else if (method === "ranked") {
            setRankings(data.options.map((_, i) => i + 1));
          }
          setPhase("voting");
        }
      }
    } catch {
      // network error, will retry
    }
  }, [id, phase, hasVoted]);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  useEffect(() => {
    if (phase === "waiting") {
      const interval = setInterval(fetchPoll, 3000);
      return () => clearInterval(interval);
    }
  }, [phase, fetchPoll]);

  useEffect(() => {
    if (phase === "results" && !confettiFired.current) {
      confettiFired.current = true;
      fireConfetti();
    }
  }, [phase]);

  function getVoteValues(): number[] | null {
    if (!poll) return null;
    const method = poll.votingMethod || "slider";
    switch (method) {
      case "slider":
        return sliders;
      case "ranked":
        return rankings;
      case "single": {
        if (selectedOption === null) return null;
        return poll.options.map((_, i) => (i === selectedOption ? 1 : 0));
      }
      case "veto": {
        if (selectedOption === null) return null;
        return poll.options.map((_, i) => (i === selectedOption ? 1 : 0));
      }
      default:
        return null;
    }
  }

  function canSubmitVote(): boolean {
    if (!poll) return false;
    const method = poll.votingMethod || "slider";
    if (method === "single" || method === "veto") {
      return selectedOption !== null;
    }
    return true;
  }

  async function handleVote() {
    if (hasVoted()) return;
    const values = getVoteValues();
    if (!values) return;
    setSubmitting(true);
    try {
      await fetch(`/api/poll/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      markVoted();
      setPhase("waiting");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnd() {
    await fetch(`/api/poll/${id}/end`, { method: "POST" });
    await fetchPoll();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  async function sharePoll() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Vote on this poll!", url });
      } catch {
        // user cancelled or share failed
      }
    } else {
      await copyLink();
    }
  }

  if (phase === "not_found") {
    return (
      <div className="text-center py-20 space-y-4">
        <img
          src="/logo.png"
          alt="People Pleaser Polling"
          className="w-20 h-20 mx-auto drop-shadow-md object-contain"
        />
        <p className="theme-text font-bold text-lg">Poll not found</p>
        <p className="theme-secondary text-sm">
          This poll may have expired or the link may be incorrect.
        </p>
        <a
          href="/"
          className="inline-block mt-2 px-6 py-3 text-white font-bold rounded-xl shadow-md"
          style={{ background: "linear-gradient(135deg, #F39C12, #E67E22)" }}
        >
          Create New Poll
        </a>
      </div>
    );
  }

  if (phase === "loading" || !poll) {
    return (
      <div className="text-center theme-secondary py-20">Loading poll...</div>
    );
  }

  const votingMethod = poll.votingMethod || "slider";

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <img
        src="/logo.png"
        alt="People Pleaser Polling"
        className="w-20 h-20 mx-auto drop-shadow-md object-contain"
      />

      {/* Poll title */}
      <h1 className="text-2xl font-black text-center theme-text">
        {poll.title || "Vote on it!"}
      </h1>

      {/* Share link */}
      <div className="flex gap-2">
        <button
          onClick={copyLink}
          className="flex-1 theme-surface border theme-border rounded-xl px-3 py-2 text-sm theme-secondary truncate theme-shadow text-left transition-all hover:border-[#3498DB]"
          style={{ background: "var(--bg-input)" }}
        >
          {copied ? "Copied!" : typeof window !== "undefined" ? window.location.href : ""}
        </button>
        <button
          onClick={sharePoll}
          className="w-10 h-10 flex items-center justify-center theme-surface border theme-border hover:border-[#3498DB] rounded-xl theme-text theme-shadow transition-all"
          title="Share"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
      </div>

      {/* Vote count */}
      <p className="text-center theme-secondary text-sm font-medium">
        {poll.voteCount} vote{poll.voteCount !== 1 ? "s" : ""} so far
      </p>

      {/* Voting phase */}
      {phase === "voting" && (
        <div className="space-y-5">
          {votingMethod === "slider" && (
            <SliderVoting options={poll.options} sliders={sliders} setSliders={setSliders} />
          )}
          {votingMethod === "ranked" && (
            <RankedVoting options={poll.options} rankings={rankings} setRankings={setRankings} />
          )}
          {votingMethod === "single" && (
            <SingleChoiceVoting options={poll.options} selected={selectedOption} setSelected={setSelectedOption} />
          )}
          {votingMethod === "veto" && (
            <VetoVoting options={poll.options} selected={selectedOption} setSelected={setSelectedOption} />
          )}

          <button
            onClick={handleVote}
            disabled={submitting || !canSubmitVote()}
            className="w-full py-3 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-40"
            style={{
              background: submitting || !canSubmitVote()
                ? "var(--text-faint)"
                : "linear-gradient(135deg, #3498DB, #2F80ED)",
            }}
          >
            {submitting ? "Submitting..." : "Submit Vote"}
          </button>
        </div>
      )}

      {/* Waiting phase */}
      {phase === "waiting" && (
        <div className="space-y-4 text-center">
          <div className="theme-surface rounded-2xl p-5 theme-shadow border theme-border-light space-y-2">
            <p className="text-[#2ECC71] font-bold">Your vote has been submitted!</p>
            <p className="theme-secondary text-sm">
              Waiting for others to vote...
            </p>
          </div>
          <HoldToEndButton onEnd={handleEnd} />
        </div>
      )}

      {/* Results phase */}
      {phase === "results" && poll.winner && (
        <div className="space-y-4 text-center">
          <div className="theme-surface rounded-2xl p-6 theme-shadow border theme-border-light space-y-3">
            <p className="theme-secondary text-xs uppercase tracking-widest font-bold">
              {votingMethod === "veto" ? "The survivor is" : "The winner is"}
            </p>
            <p className="text-4xl font-black" style={{ color: "#2ECC71" }}>
              {poll.winner}
            </p>
            <p className="theme-muted text-sm">
              Based on {poll.voteCount} vote{poll.voteCount !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Scores breakdown */}
          {!poll.hideScores && poll.scores && (
            <>
              {votingMethod === "slider" && (
                <SliderResults options={poll.options} scores={poll.scores} winner={poll.winner} />
              )}
              {votingMethod === "ranked" && (
                <RankedResults options={poll.options} scores={poll.scores} winner={poll.winner} />
              )}
              {votingMethod === "single" && (
                <SingleChoiceResults options={poll.options} scores={poll.scores} winner={poll.winner} />
              )}
              {votingMethod === "veto" && (
                <VetoResults options={poll.options} scores={poll.scores} winner={poll.winner} />
              )}
            </>
          )}

          <a
            href="/"
            className="inline-block mt-2 px-6 py-3 text-white font-bold rounded-xl shadow-md transition-all"
            style={{ background: "linear-gradient(135deg, #F39C12, #E67E22)" }}
          >
            Create New Poll
          </a>
        </div>
      )}
    </div>
  );
}
