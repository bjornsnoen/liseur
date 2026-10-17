# 55. Speech audio is kept on the phone, and chapters can be downloaded

Status: proposed

## Context

Speech from a server is held in memory only. `SpeechCache` keeps at
most 16 MiB of audio for the sentences around the voice and drops it on
every jump or change of voice. Listening to a chapter again asks for
every sentence again: money on paid servers (Gemini, OpenAI and other
paid OpenAI-compatible services), minutes of work on a small home
server, and a wait for the listener each time.

There is also no way to listen with a server voice without a network.
A train, a plane or a phone on mobile data with a home server behind a
VPN all fall back to the device voices or to silence.

Audio arrives as 24 kHz mono 16-bit PCM, 48 kB a second, about 170 MB
an hour. Stored as it is, a few chapters would fill a phone's spare
space.

ADR-0046 set the pattern for keeping a costly service's output on the
phone: keyed by everything that changes the output, bounded, swept when
a book is removed, never backed up, and listed in `docs/PRIVACY.md`. It
also requires that an answer asked for before a clear or a removal is
not saved after it.

## Decision

### What is kept

Audio made by a server voice (OpenAI-compatible or Gemini) is saved
after it arrives. Device voices are not saved: they are already
offline, they make audio faster than it is spoken, and an engine update
can change how they sound.

Each saved clip is keyed by a SHA-256 over a length-prefixed encoding
of: a format version, the voice's cache identity, and the exact text of
one speech request, the piece actually sent. The cache
identity is built by each client from everything it sends besides the
text: the service, the full normalized request root (scheme, host,
port and path prefix, as `OpenAiTtsClient` normalizes it, without
credentials), the model, the voice, the language and any instructions.
Two services on one host under different paths never share audio.
Playback speed is left out, since speech is always requested at normal
speed and sped up on the phone. The response format is left out too:
it only changes how the audio travels, and the
OpenAI-compatible client picks WAV or MP3 per server at run time, so
including it would make audio saved through an MP3-only server miss
after a restart.

The memory cache keeps its keys as they are: a request's key names the
book's sentence, and for translated read aloud the translation too.
The disk is consulted below that, per piece, after the request has been
prepared. Read in the book's own words, the one piece is the key's text,
filtered by ADR-0053. Read translated, `TranslatedSpeech` first
translates the sentence and may split the translation into several
pieces; each piece is looked up and saved on its own, under the text it
says. Two different translations of one sentence therefore never share
audio, and the same translated words share it wherever they occur.

The lookup happens in `SpeechCache.request` for each piece before it
asks for admission (below), so audio found on disk never waits for the
server.
A clip found on disk is decoded off the main thread and joins the
memory cache like audio that just arrived. A clip that is missing,
truncated or fails to decode is deleted with its row and requested as
if it had never been kept.

### How it is stored

Clips are encoded as AAC-LC at 48 kbit/s with the platform `MediaCodec`
encoder, which every device from Android 8 has, so there is no new
dependency. That is about 22 MB an hour. Each file is raw ADTS. Its
row records the codec name, the sample rate, the exact PCM sample count
and the number of leading samples to drop on decoding.

That number is not guessed. On Android 11 and later the encoder may
report it (`KEY_ENCODER_DELAY`). Otherwise, and to check a reported
value, the delay of the encoder and decoder pair is measured once per
device and codec configuration: a generated click train is encoded and
decoded, and the offset is found by cross-correlation. The measurement
is repeated three times and must agree to the sample. It is stored
under the encoder and decoder names, the sample rate, channel count,
profile and bitrate, and the system build fingerprint. When any of
those changes, as after a system update, it is measured again before
anything new is kept. If it cannot be measured, nothing is kept and
reading aloud works as today.

Each clip's row holds the leading samples to drop that applied when it
was encoded, so a later change does not misread it. A clip whose
decoded length differs from its recorded count is treated as corrupt.

Decoding drops the measured leading samples and keeps exactly the
recorded count, so sentence boundaries gain neither gaps nor lost
syllables. Encoding runs on a background dispatcher after the audio
has arrived, so playback never waits for it.

Files live in `files/speech/`. A Room database,
`speech.db`, separate from `liseur.db`, records each clip's key, codec
data, size, duration and last use, and which books pin it. Neither the
folder nor the database is in the backup or device transfer allowlists.

### Writes, clears and removals

The process is the only writer, and every change to one key's file and
row runs under a lock for that key:

- A kept clip is never overwritten. If a key already has a row, a new
  save for it is dropped; there is nothing to gain from replacing
  audio for the same request.
- A save encodes to a new file named by the key and a random suffix,
  and syncs it. Under the key's lock it opens a `speech.db`
  transaction, checks that the generation it started under is still
  current and that the key has no row, writes the row naming that file,
  and commits. A save that fails either check deletes its own file. A
  row only ever names a file that was complete before the row was
  written, and no file named by a row is ever replaced.
- Eviction and clearing delete a key's file and row under the same
  lock, and skip keys a playing session holds open; those are deleted
  when released.
- At start, files no row names are deleted, and rows whose file is
  missing are dropped. A crash before the commit leaves a file no row
  names, which this removes.
- Clearing kept audio and clearing downloads each bump a generation
  stored in `speech.db`, in the transaction that deletes the rows.

Pins and the library live in two databases, so no transaction spans
both. As for translations (ADR-0046), removal works by a sweep. A
download registers its book in `speech.db` before its first request,
with the book's current pin generation, and the registration is removed
when the job ends. The sweep looks at registered books as well as
pinned ones: at
start, and after each committed change to the library, pins of books
the library no longer holds are deleted and the book's pin generation is
bumped, in one `speech.db` transaction. A pin is written only if the
book's pin generation is the one the download started under. A pin
written before the sweep is removed by it; one written after loses its
generation check. A book removed and added back under the same URL
before the sweep looks keeps its pins, which are still right for its
text. A removal that rolls back never reaches the sweep, since the
sweep follows commits only.

### How much is kept

Audio heard or fetched ahead in normal listening is kept up to a budget,
200 MB by default, with choices of 100 MB, 500 MB, 1 GB and 2 GB in
Read aloud settings. Past the budget the least recently used unpinned
clips are deleted. Pinned clips do not count towards the budget and are
never deleted by it.

Removing a book from the library unpins its clips, by the same kind of
sweep ADR-0046 uses for translations. Unpinned clips then age out
through the budget. Read aloud settings show the space used by kept and
downloaded audio, with buttons to clear each. A full disk stops saving
and downloads; reading aloud goes on from memory.

### One queue per speech service

Downloads and listening must not together exceed what a server is
allowed. Admission moves from each `SpeechCache` to a process-wide
limiter per speech service, keyed by the service and request root of
the cache identity, with that service's concurrency (one for most
OpenAI-compatible servers). The sentence being spoken is admitted
first, then prefetches, then downloads; a download request already in
flight is not cancelled, so at worst the voice waits for one download
request. A request keeps the highest priority anyone gave it:
when the engine claims a prefetch that is still queued, or waiting to
retry, it is raised to the sentence-being-spoken priority.

### Downloading chapters

The read aloud player gets a download action: this chapter, the next
three chapters, or the rest of the book. Before starting, it shows how
many characters will be sent, so a listener on a paid service knows the
cost, and which voice will be used.

The confirmed download is saved as a specification: the book, the
chapters, the cache identity, the sentences-per-request setting, the
language and the tokenizer settings, the connection owner that read
aloud uses to tell connections apart, and that connection's revision.
The revision is a new counter saved with the settings, bumped every
time the server's address or key is saved, the server is deleted, or
settings are restored from a backup. It holds no secret. The work runs
as a WorkManager job, unique per book, so a new confirmation replaces
the old one. WorkManager's own database is not in the backup
allowlists, so a restore brings no queued download.

The job checks the specification against the current settings before
it runs and again right before each request is sent, after waiting for
admission. If the revision, the model, the voice or the language
changed, or the book is gone, the job stops without sending more text
and its notification says why; the listener confirms again for the new
settings.

The job opens the book, walks the chosen chapters with
`PublicationUtteranceCursor` and the same tokenizer, grouping and
language read aloud uses, applies ADR-0053's filtering, and requests
each sentence through the same clients and the shared limiter. Each
clip is pinned to the book. Clips already on disk are pinned without a
request. It shows a progress notification with a cancel button, which
needs the `dataSync` foreground service type.

By default the job waits for an unmetered network, with a setting to
allow mobile data. A rate limit pauses the job and lets WorkManager try
later. An invalid key, voice or terms stops it and reports the error in
the notification. Network errors follow ADR-0054's retries, then the job
is retried by WorkManager.

Downloaded audio only plays for the voice it was made with. When the
listener changes voice, the player says the downloaded audio belongs to
another voice; nothing is converted or deleted.

Translated read aloud cannot be downloaded in this first version: it
would also have to download translations.

### Offline start

Starting read aloud reads the voice catalogue before any audio is
asked for. OpenAI-compatible servers fall back to the voices typed,
chosen or remembered when listing fails; that path is checked offline
from a cold start, after the process was killed, and fixed where it
needs the network.

## Consequences

- A chapter heard once plays again without a request, and a downloaded
  chapter plays without a network.
- Paid services cost less for books read or listened to more than once.
- Book text, as speech, is now on disk, app-private and never backed up.
  `docs/PRIVACY.md` lists it. Downloading also sends whole chapters to
  the speech server before they are read, which the privacy document and
  the download dialog both say.
- Phones gain up to the chosen budget of storage use, plus downloads.
  Both are shown and can be cleared.
- Moving admission out of `SpeechCache` touches every voice; the change
  is tested on its own before downloads are built on it.
- A client change that alters its output for the same request must bump
  the format version or its cache identity, or old audio keeps playing.
- Tests:
  - JVM, with a PCM fake codec: identity encoding, including two
    services on one host with different paths; disk hit before
    admission; corrupt and missing clips; clear during encoding; an
    older and a newer save of the same key overlapping around a clear;
    a crash between writing the file and the commit; removal during a download, a
    pin written on each side of the sweep, and re-addition before it;
    budget eviction skipping pinned clips; admission order with a
    download and playback on one service, and two books downloading;
    a queued prefetch claimed by the engine overtaking waiting
    prefetches and downloads.
  - JVM, for translated pieces: one sentence translated two ways under
    the same voice, one of them split into several pieces, never
    shares audio; a save for a key that already has a row leaves the
    row and its file untouched, including across a crash.
  - JVM, for removal: a book removed after the job's last check but
    before its first clip arrives, with no pins yet, gets no pin.
  - JVM, for calibration: a changed build fingerprint or codec setting
    forces a new measurement before anything is kept.
  - JVM, for the job: confirmed with key A, key B saved on the same
    server, process killed, then the job runs and sends nothing; model,
    voice or server changed while queued and while waiting for
    admission; server deleted; book removed.
  - Emulator: the delay measurement on the emulator's codecs; a tone
    and a spoken clip encoded and decoded with exact length, aligned
    within one sample by cross-correlation and within 30 dB of the
    original over the first and last 50 ms; very short clips; playback
    in airplane mode after the process was killed, through a WAV
    server and an MP3-only one; storage full.
- Strings for the download dialog, the notification and the settings
  are added in all seven languages.
