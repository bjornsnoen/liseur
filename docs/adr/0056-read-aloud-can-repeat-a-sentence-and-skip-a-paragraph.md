# 56. Read aloud can repeat a sentence and skip a paragraph

Status: proposed

## Context

The read aloud player has previous and next sentence buttons, play and
pause, speed and a sleep timer. Two listening habits are not served.

Language learners and careful readers want to hear one sentence several
times. Today they press previous sentence after every playback, which
also has to wait for the navigator to step back.

Listeners skimming want to move by paragraph. A paragraph of twelve
sentences takes twelve presses of next sentence.

## Decision

### Repeat

A repeat button in the player turns sentence repeat on and off. While
it is on, the sentence being spoken plays again from its start each
time it ends, until repeat is turned off; then reading goes on to the
next sentence.

Repeat belongs to the `ReadAloudSession`, which outlives the navigators
and engines it replaces on a replay or a voice change. Each
`SpeechTtsEngine` reads it from the session when a request's audio
ends: if repeat is on, the engine plays the same audio again instead of
finishing the request. The request still gets exactly one terminal
call, when it finally finishes or is stopped. The navigator does not
move, no request is made, and the saved place stays on the sentence.

- Pause during any repetition, then play, plays on from where it
  paused, as today, and keeps repeating.
- The sleep timer pauses as it does now, repeat or not. A timer set to
  the end of the chapter never fires while one sentence repeats.
- A skip moves to the next or previous sentence and repeats that one.
- A voice change replays the sentence in the new voice and keeps
  repeating.
- A silent utterance (ADR-0053) is never repeated: reading passes it
  and repeats the next spoken sentence.

When requests carry more than one sentence (the "sentences per request"
setting), what repeats is the whole request, since that is one piece of
audio.

Repeat is off when read aloud starts and is not saved: it is a study
tool for the moment, and a saved repeat would surprise the
listener in the next book.

The media notification gets a repeat command button. The service
advertises a new custom session command for it, routes it in
`onCustomCommand` to the session, and updates the button's icon and
label when repeat changes, so the lock screen shows its state.

### Paragraph skip

A long press on the previous or next sentence button moves by
paragraph. A paragraph is one Readium text element: a block element,
or a run of text between two `<br>` in a block, which is how Readium's
content iterator splits them. Runs split by `<br>` share their block's
CSS selector, so the selector cannot tell them apart.

Paragraphs are numbered within a resource instead. A
`PublicationUtteranceCursor` opened at the start of the resource
reports, with each sentence, the ordinal of the text element it came
from. To place the voice, the walk runs from the resource start to the
current sentence, matched by its locator, text and `before`, recording
where each element begins. That gives the current paragraph and the
start of the previous one without walking backward.

- Next paragraph goes to the first sentence of the following text
  element, continuing into the next resource when the current one is
  the last.
- Previous paragraph goes to the first sentence of the current element.
  If the voice is already on it, it goes to the first sentence of the
  element before, or of the last element of the previous resource.
- Elements whose sentences are all silent under ADR-0053, or all
  dropped for holding no letter or digit, are not counted as paragraphs.

The navigator is reopened at the target's element and stepped to the
target with ADR-0052's pre-location.

A long press is given an accessibility action label ("Previous
paragraph", "Next paragraph") so TalkBack users can reach it. Paragraph
skip is not added to the notification, which keeps the controls
headphones and car systems expect.

## Consequences

- Repeating a sentence costs nothing after the first time, and does not
  disturb the saved place or the prefetch window.
- Paragraph skip depends on ADR-0052 for exact stepping, and is built
  after it.
- `PublicationUtteranceCursor` reports element ordinals, which it can
  count as it reads Readium's elements.
- New strings for the repeat button and command, its on and off states,
  and the two paragraph actions are added in all seven languages.
- Tests:
  - Engine, with the fake PCM output: repeats until turned off, then
    completes once; pause and play during a later repetition; stop
    during a repetition gives one terminal call.
  - Session: repeat survives a replay and a voice change; the sleep
    timer pauses during repeat; the media command toggles repeat and
    updates the button.
  - Paragraph walk on generated books: next and previous across `<br>`
    runs in one block, across language changes inside a paragraph,
    across a resource boundary, and past paragraphs that are silent.
