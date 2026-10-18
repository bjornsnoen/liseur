# 59. Forget the furthest position

Status: proposed

Pairs with liseur-sync ADR 0054, which adds the server's floor.

## Context

The manual sync dialog offers the furthest position ever recorded for a
book. A wrong one, such as an accidental jump to 98%, stays there for
good: peaks are never reset by rereading or marking unread, and the
server rebuilds the furthest from its append-only ops log on every
snapshot, so deleting it on one phone would bring it back on the next
sync.

## Decision

The furthest card in the dialog has a Forget button that asks once more
in place. Forgetting is online only and goes to the server first:
`POST /v1/works/{id}/furthest/forget` with the newest sequence the
dialog's preview saw. The server raises a per-work floor to that
sequence (never past what it holds) and from then on ranks only ops
above the floor. Nothing in the ops log is deleted.

Forget clears every past peak for the book, not just the one shown. The
furthest starts again from where devices are now, and reading forward
afterwards counts as usual.

The client stores the highest floor it has heard on `work_alias`. It
learns it from the forget answer, from `furthest_floor` in positions
answers, and from `furthest_floors` in heads and every changes page. A
forget appends no op, so the changes page is how a device already caught
up hears of it. When the floor rises
it drops its cached observations at or below it, ignores such ops in
later pages, and starts its own peak over from the current place if the
server already holds that peak. A peak never sent is newer reading than
the forget and is kept. The device that pressed Forget always starts its
own over.

A peak whose upload lost its answer is ambiguous: the server may already
hold it under the floor. A peak first sent as the current position keeps
that op's exact bytes in `peak_delivery.sent_op`, and the retry sends
those bytes rather than a fresh peak id. Either way the server names the
seq it holds; an accepted retry at or below the floor starts the peak
over, as if it had been acknowledged before the forget.

If the server refuses or cannot be reached, nothing changes on the
phone and the dialog shows the usual failure note. An old server without
the route answers 404 and is treated the same way.

## Consequences

- A forget is per account and per work; it reaches other devices with
  their next changes, positions or heads answer.
- Room 68 adds `work_alias.furthest_floor` and `peak_delivery.sent_op`.
- There is no offline forget and no queue for one.
