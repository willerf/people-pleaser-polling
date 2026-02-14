"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import confetti from "canvas-confetti";

type PollState = {
  options: string[];
  voteCount: number;
  ended: boolean;
  winner: string | null;
  showScores: boolean;
  scores: number[] | null;
};

type Phase = "loading" | "voting" | "waiting" | "results";

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
    const p = Math.min(elapsed / 2000, 1);
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
      className="relative w-full py-3 rounded-lg font-semibold overflow-hidden select-none touch-none"
    >
      <div className="absolute inset-0 bg-red-900/50" />
      <div
        className="absolute inset-0 bg-red-600 origin-left"
        style={{
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
      colors: ["#818cf8", "#6366f1", "#a5b4fc", "#c7d2fe"],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: ["#818cf8", "#6366f1", "#a5b4fc", "#c7d2fe"],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }

  // Initial burst
  confetti({
    particleCount: 80,
    spread: 100,
    origin: { y: 0.5 },
    colors: ["#818cf8", "#6366f1", "#a5b4fc", "#c7d2fe", "#fbbf24"],
  });

  frame();
}

export default function PollPage() {
  const params = useParams();
  const id = params.id as string;

  const [poll, setPoll] = useState<PollState | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [sliders, setSliders] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const confettiFired = useRef(false);

  const fetchPoll = useCallback(async () => {
    try {
      const res = await fetch(`/api/poll/${id}`);
      if (!res.ok) return;
      const data: PollState = await res.json();
      setPoll(data);

      if (data.ended) {
        setPhase("results");
      } else if (phase === "loading") {
        setSliders(data.options.map(() => 0));
        setPhase("voting");
      }
    } catch {
      // network error, will retry
    }
  }, [id, phase]);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  useEffect(() => {
    if (phase === "waiting") {
      const interval = setInterval(fetchPoll, 3000);
      return () => clearInterval(interval);
    }
  }, [phase, fetchPoll]);

  // Fire confetti when entering results phase
  useEffect(() => {
    if (phase === "results" && !confettiFired.current) {
      confettiFired.current = true;
      fireConfetti();
    }
  }, [phase]);

  async function handleVote() {
    setSubmitting(true);
    try {
      await fetch(`/api/poll/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: sliders }),
      });
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

  if (phase === "loading" || !poll) {
    return (
      <div className="text-center text-gray-400 py-20">Loading poll...</div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-center">
        People Pleaser Polling
      </h1>

      {/* Share link */}
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={typeof window !== "undefined" ? window.location.href : ""}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 truncate"
        />
        <button
          onClick={copyLink}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Vote count */}
      <p className="text-center text-gray-400">
        {poll.voteCount} vote{poll.voteCount !== 1 ? "s" : ""} so far
      </p>

      {/* Voting phase */}
      {phase === "voting" && (
        <div className="space-y-5">
          {poll.options.map((option, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-200">{option}</span>
                <span className="text-gray-400 tabular-nums w-12 text-right">
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
              <div className="flex justify-between text-xs text-gray-500">
                <span>Against</span>
                <span>Neutral</span>
                <span>For</span>
              </div>
            </div>
          ))}

          <button
            onClick={handleVote}
            disabled={submitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 rounded-lg font-semibold transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Vote"}
          </button>
        </div>
      )}

      {/* Waiting phase */}
      {phase === "waiting" && (
        <div className="space-y-4 text-center">
          <p className="text-green-400">Your vote has been submitted!</p>
          <p className="text-gray-400 text-sm">
            Waiting for others to vote...
          </p>
          <HoldToEndButton onEnd={handleEnd} />
        </div>
      )}

      {/* Results phase */}
      {phase === "results" && poll.winner && (
        <div className="space-y-4 text-center">
          <p className="text-gray-400 text-sm uppercase tracking-wide">
            The winner is
          </p>
          <p className="text-4xl font-bold text-indigo-400">{poll.winner}</p>
          <p className="text-gray-500 text-sm">
            Based on {poll.voteCount} vote{poll.voteCount !== 1 ? "s" : ""}
          </p>

          {/* Scores breakdown */}
          {poll.showScores && poll.scores && (
            <div className="mt-4 space-y-2 text-left">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                Average Scores
              </p>
              {poll.options
                .map((option, i) => ({ option, score: poll.scores![i] }))
                .sort((a, b) => b.score - a.score)
                .map(({ option, score }, i) => {
                  const maxScore = Math.max(...poll.scores!.map(Math.abs), 0.1);
                  const barWidth = Math.abs(score) / maxScore;
                  const isWinner = option === poll.winner;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={isWinner ? "text-indigo-400 font-semibold" : "text-gray-300"}>
                          {option}
                        </span>
                        <span className="text-gray-400 tabular-nums">
                          {score > 0 ? "+" : ""}{score.toFixed(1)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            score >= 0 ? "bg-indigo-500" : "bg-red-500"
                          } ${isWinner ? "opacity-100" : "opacity-60"}`}
                          style={{ width: `${barWidth * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          <a
            href="/"
            className="inline-block mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors"
          >
            Create New Poll
          </a>
        </div>
      )}
    </div>
  );
}
