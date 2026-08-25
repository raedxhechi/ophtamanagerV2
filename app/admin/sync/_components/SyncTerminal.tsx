"use client";

import * as React from "react";
import { ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { SyncLogLevel } from "../types";

export type LogLine = { level: SyncLogLevel; message: string };

const LOG_COLORS: Record<SyncLogLevel, string> = {
  info: "text-zinc-300",
  success: "text-emerald-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

/**
 * How close to the bottom still counts as "at the bottom". A couple of pixels
 * of slack, because fractional scroll positions and sub-pixel line heights mean
 * scrollTop + clientHeight rarely lands exactly on scrollHeight.
 */
const BOTTOM_SLACK_PX = 24;

/**
 * A terminal window streaming an import log, scrolling the way a shell does.
 *
 * The scroll rule is the point of this component. Following the newest line is
 * what you want while you are watching it run, but the moment you scroll up to
 * read something the log must hold still — an autoscroll that fires on every
 * new line makes the output impossible to read, which is exactly what a plain
 * "pin to bottom" effect does.
 *
 * So: pinned while the view is at the bottom, released as soon as you scroll
 * away from it, and re-pinned when you come back — the same contract as a
 * terminal emulator. A button appears while you are detached, both to say that
 * output is still arriving and to get back in one click.
 */
export function SyncTerminal({
  title,
  logs,
  className,
}: {
  /** Shown in the title bar, e.g. "import patients". */
  title: string;
  logs: LogLine[];
  className?: string;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  // A ref, not state: the scroll handler writes it on every scroll event and
  // the append effect reads it, and neither wants a re-render for that. The
  // separate state below exists only to show the button.
  const pinnedRef = React.useRef(true);
  const [pinned, setPinned] = React.useState(true);

  const scrollToBottom = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    pinnedRef.current = true;
    setPinned(true);
  }, []);

  const handleScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_SLACK_PX;
    if (atBottom !== pinnedRef.current) {
      pinnedRef.current = atBottom;
      setPinned(atBottom);
    }
  }, []);

  // Follow the newest line, but only while pinned. `logs` is the dependency
  // rather than a length, so a replaced array still scrolls.
  React.useEffect(() => {
    if (!pinnedRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <span className="size-3 rounded-full bg-red-500/80" />
        <span className="size-3 rounded-full bg-amber-500/80" />
        <span className="size-3 rounded-full bg-emerald-500/80" />
        <span className="ml-2 font-mono text-xs text-zinc-400">{title}</span>
        <span className="ml-auto font-mono text-xs text-zinc-600 tabular-nums">
          {logs.length} lines
        </span>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-96 overflow-auto p-3 font-mono text-xs leading-relaxed"
        >
          {logs.length === 0 ? (
            <span className="text-zinc-500">Waiting for output…</span>
          ) : (
            logs.map((line, idx) => (
              <div
                key={idx}
                className={cn(
                  "whitespace-pre-wrap break-words",
                  LOG_COLORS[line.level]
                )}
              >
                <span className="select-none text-zinc-600">$ </span>
                {line.message}
              </div>
            ))
          )}
        </div>

        {!pinned && logs.length > 0 ? (
          <Button
            type="button"
            size="sm"
            onClick={scrollToBottom}
            className="absolute right-3 bottom-3 h-7 gap-1.5 bg-zinc-800 text-xs text-zinc-100 shadow-lg hover:bg-zinc-700"
          >
            <ArrowDown className="size-3.5" />
            Follow output
          </Button>
        ) : null}
      </div>
    </div>
  );
}
