"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { SystemLogRow } from "@/types/systemLogs";

import { formatLogTime, statusClassName } from "./LogsTable";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd className="font-mono text-sm break-words">
        {value === null || value === undefined || value === "" ? (
          <span className="text-muted-foreground font-sans">—</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

/** The full record behind one row, including the fields the table has no room for. */
export function LogDetailsDrawer({
  log,
  open,
  onOpenChange,
}: {
  log: SystemLogRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="!w-[36rem] !max-w-[90vw]">
        {log && (
          <>
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <span className="font-mono">{log.action}</span>
                <Badge
                  variant="outline"
                  className={cn("tabular-nums", statusClassName(log.status))}
                >
                  {log.status ?? "no response"}
                </Badge>
              </DrawerTitle>
              <DrawerDescription>
                {formatLogTime(log.occurred_at)} · {log.source}
              </DrawerDescription>
            </DrawerHeader>

            <div className="overflow-y-auto px-4 pb-8">
              <dl className="grid grid-cols-2 gap-4">
                <Row label="User" value={log.user_email} />
                <Row label="Role" value={log.user_role} />
                <Row
                  label="Attribution"
                  value={
                    log.actor_verified ? (
                      "verified"
                    ) : (
                      <span title="Taken from the request itself and not confirmed against a live session — normal when the session had already expired.">
                        claimed
                      </span>
                    )
                  }
                />
                <Row label="Duration" value={log.duration_ms === null ? null : `${log.duration_ms} ms`} />
                <Row label="Method" value={log.method} />
                <Row
                  label="Delivery"
                  value={log.queued ? "queued offline, sent later" : "sent immediately"}
                />
                <div className="col-span-2">
                  <Row label="Path" value={log.path} />
                </div>
                {(log.error_code || log.error_message) && (
                  <>
                    <div className="col-span-2">
                      <Row label="Error code" value={log.error_code} />
                    </div>
                    <div className="col-span-2">
                      <Row label="Error message" value={log.error_message} />
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <Row label="Recorded at" value={formatLogTime(log.received_at)} />
                </div>
                <div className="col-span-2">
                  <Row label="User agent" value={log.user_agent} />
                </div>
                <Row label="IP" value={log.ip} />
                <Row label="User id" value={log.user_id} />
                {log.metadata != null && (
                  <div className="col-span-2">
                    <Row
                      label="Metadata"
                      value={
                        <pre className="bg-muted overflow-x-auto rounded p-2 text-xs">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      }
                    />
                  </div>
                )}
              </dl>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
