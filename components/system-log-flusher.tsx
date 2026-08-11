"use client";

import * as React from "react";

import { startSystemLogQueue } from "@/lib/logging/queue";

/**
 * Drives the system log outbox for the lifetime of the app.
 *
 * Renders nothing — it exists to start the queue's flush triggers (reconnect,
 * tab hidden, periodic, and on startup for whatever a previous session left
 * behind). Mounted at the root so a backlog is picked up on any page, including
 * /login: entries written as a session expired are delivered from the login
 * screen the user was just bounced to.
 */
export function SystemLogFlusher() {
  React.useEffect(() => startSystemLogQueue(), []);
  return null;
}
