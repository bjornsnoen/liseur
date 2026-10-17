# 53. Read aloud skips notes, ruby readings and hidden text

Status: proposed

## Context

Read aloud speaks whatever text Readium's `HtmlResourceContentIterator`
finds in a chapter's body. In Readium 3.4 that iterator has no notion
of what a reader would leave out. Liseur only drops utterances that hold
no letter or digit, so a lone "*" is dropped but a note marker "12" is
not.

What a listener hears today, and would rather not:

- Note references. "He left the city.12 Nobody followed." is read with
  "twelve" in the middle, in every chapter of an annotated edition.
- Footnote bodies placed in the chapter, as `<aside epub:type="footnote">`
  or with the `doc-footnote` role. They are read where they sit,
  usually at the end of the chapter, cut off from the sentence that
  referred to them.
- Ruby. Japanese and Chinese books annotate characters with their
  reading in `<rt>`, and `<rp>` holds fallback parentheses. Both the
  base text and the reading are spoken, so every annotated word is said
  twice.
- Text the book hides: `hidden`, `aria-hidden="true"`, or an inline
  `display: none`. Publishers use these for alternative text, page
  numbers kept for print and similar material that is not part of the
  reading.

The text read aloud walks is not only spoken. The navigator's utterance
locators become the saved place (`ListeningCheckpoints`), whose
progression Readium computes from each element's index in its resource.
The same utterances, cut the same way by `PublicationUtteranceCursor`,
name sentences for page translation (`TranslatedPages.sentences`), so a
translated sentence is shared by the page and the voice, and the
translated page finds the sentence the voice is on by its exact text.
Changing the content the navigator walks would move saved places and
break that sharing.

## Decision

### Navigation stays on the book's text

The navigator, the prefetcher's cursor, checkpoints, highlights and
translation keep walking the unfiltered content exactly as today. Only
the text sent to the speech service changes. Every utterance is still
visited, placed and saved; some are spoken shorter, and some are not
spoken at all.

### What is left out

- Elements whose `epub:type` contains `footnote`, `endnote` or
  `rearnote`, or whose role is `doc-footnote` or `doc-endnote`, with
  everything inside them, unless the resource is a notes resource (below).
- Elements whose `epub:type` contains `noteref`, or whose role is
  `doc-noteref`.
- `rt` and `rp`, so ruby is read as its base text.
- Elements with the `hidden` attribute, with `aria-hidden="true"`, or
  with `display: none` in their own `style` attribute, with everything
  inside them.

A resource is a notes resource when at least half of the characters of
its body lie inside note elements or inside an element whose
`epub:type` contains `footnotes`, `endnotes` or `rearnotes` (or role
`doc-endnotes`). In a notes resource, note bodies are read; the other
rules still apply. A listener who reaches a notes chapter chose to hear
it, while a chapter with a few notes at its end is mostly story.

Text hidden by a style sheet is not detected. Finding it would need the
computed style, which only the WebView knows.

There is no setting.

### How it is left out

A `SpokenText` helper, built per resource from the same HTML Readium
reads, parses it once with Jsoup, records the left-out character ranges
of each block element's text, and decides whether the resource is a
notes resource. It is cached per resource for the session.

For an utterance, it finds the utterance's block by the locator's CSS
selector, finds the utterance in that block's text from the locator's
`before` and `highlight`, and returns the utterance's text with the
left-out ranges removed and whitespace tidied. When every character is
left out, the utterance is silent. When the block or the utterance
cannot be found, the text is spoken unchanged: a stray "12" is better
than a lost sentence.

The helper runs where a request's key is made. Both
the navigator's requests (`ReadAloudPlayback` asks the session for each
key) and the prefetcher's walk build keys from the utterance and its
locator, so both call `SpokenText` there. Read in the book's own words,
the key's text becomes the filtered text. The memory cache, which
shares a request between identical keys before anything else runs, then
shares audio only between utterances that are spoken with the same
words, wherever their markup differs. Translated read aloud keeps its
key as today, naming the book's sentence, so it keeps sharing the
page's translation; a note marker inside such a sentence is left to the
translation.

A silent utterance gets a key marked silent. The cache answers it with
empty audio without a request. The engine sees the mark, skips the
audio output and sentence repeat (ADR-0056), and finishes the request at
once with its one terminal call, so Readium moves on. Its location is
still published, so checkpoints, the chapter-end sleep timer and page
following see it pass like any other utterance. Translated read aloud
skips silent utterances the same way, without translating them.

### Checks before building

A spike on the emulator, with a generated book holding note references,
an in-chapter footnote, an endnotes resource, ruby and hidden text,
confirms:

1. `SpokenText` finds the blocks and utterances Readium produces,
   including runs split by `<br>` and by language, for every case in
   the book.
2. A silent utterance completes without a stall, a click or a wrong
   highlight, and checkpoints treat it like any utterance passed.
3. Saved places and translated read aloud behave exactly as they do
   without the feature: same checkpoints, same translation keys.

## Consequences

- Annotated editions and ruby text read the way a person would read
  them aloud.
- Saved places, sync and translation sharing do not change, since the
  walk does not change.
- The highlight still covers the book's sentence, note marker included.
- Each chapter's HTML is parsed once more when read aloud reaches it.
- The rule for notes resources is a heuristic. A book that marks most
  of a chapter as notes, or none of its notes, is read accordingly.
- JVM tests cover `SpokenText` on generated HTML: inline markers, note
  bodies in a chapter and in a notes resource, ruby, the hidden forms,
  repeated sentences told apart by `before`, and the unchanged fallback.
- Cache tests cover the same sentence text once inside hidden markup
  and once visible, met in both orders: the hidden one is never heard
  and the visible one always is.
- An engine test runs several silent utterances in a row, one at the
  end of a resource, with repeat on and off: each finishes once,
  nothing is written to the output, and reading reaches the next
  spoken sentence.
