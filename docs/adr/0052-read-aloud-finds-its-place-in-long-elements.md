# 52. Read aloud finds its place in long elements

Status: proposed

## Context

Read aloud places itself in a book by element. Readium's content
iterator names every piece of text by the CSS selector of its block
element, and a navigator can only be opened at the start of an element.
To start on a given sentence, or to keep fetching ahead, Liseur counts
sentences from the start of the element until it meets the one it wants.

Two of those searches have a fixed limit:

- `UtterancePrefetcher.restartFrom` reads at most `MAX_SEEK` (200)
  sentences of a fresh `PublicationUtteranceCursor` to find the sentence
  the voice is on.
- `ReadAloudPlayback.start`, used when reading starts from the page, a
  selection or a recut after a language change, steps a paused
  navigator at most `START_STEPS` (80) sentences, waiting up to two
  seconds on each step.

Most books keep each paragraph in its own `<p>`, and both limits are
never reached. Some books do not. A chapter can be one `<div>` with
lines separated by `<br>`, or one huge paragraph. Readium's iterator
splits text at each `<br>`, but every piece keeps the selector of the
enclosing block, so the whole chapter is one element as far as
placement is concerned. Readium's script for the first visible element
also skips children that are not blocks, so in such a chapter the first
element on screen is the whole `<div>`, whatever page the reader is on.

Past the limits both searches fail without saying so:

- The prefetcher keeps no cursor after a miss. The next sentence the
  voice reaches is outside the (empty) window, so it restarts and reads
  the element from its start again, and again for every following
  sentence. The work grows with the square of the position in the
  chapter, and nothing is fetched ahead: every sentence waits for its
  own audio, with a silence between sentences on network voices.
- Starting from a page past the 80th sentence falls back to the start of
  the element. The reader asks to hear page 40 of a chapter and hears
  its first line, with the "could not find the selection" notice.

Resuming after a failure and replaying a sentence already search
without a limit (`Int.MAX_VALUE`). They work, but step the live
navigator once per sentence and can take a long time.

## Decision

### Reproduce first

Before changing behaviour, add a generated test book: one chapter whose
text is a single `<div>` of 600 short sentences separated by `<br>`,
and a variant with the same text in one `<p>`. The book is built by the
test from strings, so no third-party text enters the repository.

- A JVM test drives `UtterancePrefetcher` with a fake cursor of 600
  sentences sharing one element locator, moves the voice past sentence
  250, and asserts how many restarts and cursor reads happen and that
  the window is full. It fails on today's code.
- A JVM test runs the pre-location on a resource with several short
  paragraphs where the selection is in the third paragraph and the
  starting element is the first, and on the long element with the
  target at sentence 500. Both find the target.
- On the emulator, the book is read aloud from a page near the end of
  the chapter, with timings recorded for the start, for ten next
  sentence skips, and for the gap between sentences on a network voice.

### The prefetcher seeks within the element

`restartFrom` stops counting sentences and walks while the candidate is
still in the element it was asked about: same resource and same CSS
selector, read from `UtteranceText.locator`. A walk that leaves the
element without a match is a miss. A cursor that gives no locators, as
in some tests, keeps the old cap of 200. A hard ceiling of 20,000
sentences guards against a malformed book whose body is one element,
and the walk yields to other coroutines every 100 sentences so a
cancel lands promptly.

A miss is remembered against the element. While the voice stays in
that element, a sentence outside the window does not restart the walk:
those sentences are fetched when spoken, as today. The memory is
cleared by a jump, a voice change or a new element. This turns the
quadratic case into one wasted walk per element.

### Starting from a page locates first, then steps

`start` and the recut path of `replay` first find the target with a
`PublicationUtteranceCursor` opened at the same element with the same
tokenizer and language settings as the navigator. The cursor is plain
text work, without the navigator, the engine or the WebView.

The search keeps today's scope. A selection carries the first element
visible on screen (`SpokenPassage.startingPoint`), not the element the
selection is in, so the target can be several elements further on. The
cursor therefore walks to the end of the resource, as the navigator
search does today with its element fallback, with no sentence count.
It returns the target's offset k from the starting element, or a miss.

The target predicates are made to read what both sides share, the
utterance text, the text before it and its locator, so the same test
runs on the cursor and on the navigator. The looser predicate used
after a recut runs on the cursor too, after the strict one misses.

- On a hit, the paused navigator is stepped exactly k times with no
  count limit, then the landed utterance is checked against the
  target. If it does not match, the cursor and navigator disagree, and
  the old bounded search runs as a fallback.
- On a miss, reading starts at the starting element at once, with the
  existing notice, and the navigator is not stepped at all.

`resume` after a failure and `replay` without a recut already search
without a limit inside the failed sentence's element; they use the same
pre-location, bounded to that element as today.

Stepping a paused navigator a few hundred times is measured on the
emulator. If it is slow, the wait is shown with the existing waiting
state of the play button. Opening a navigator in the middle of an
element is not possible with Readium 3.4, so stepping stays the only
way in.

## Consequences

- Books built from one large element keep their look-ahead to the end
  of the chapter and start where the reader asked.
- Ordinary books see no change in behaviour: their elements are short,
  and an element bound is never wider than the old count.
- Starting reads a chapter's text twice, once in the cursor and once in
  the navigator. That costs less than a second for the largest element
  in the test book and is measured as part of the work.
- The navigator and `PublicationUtteranceCursor` must keep cutting text
  the same way. That was already required for prefetching and is now
  also required for placement; the landing check makes a disagreement
  fall back instead of playing the wrong sentence.
- The generated test book stays in the test sources and is the
  reference case for later changes to placement.
