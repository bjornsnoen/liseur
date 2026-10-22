# Promo music

`music.ogg` is the opening of "BeBop for Joey" by Kevin MacLeod, from
FreePD.

- Source: <https://archive.org/download/freepd/comedy/BeBop%20for%20Joey.mp3>
  (archive.org mirror of freepd.com, which has since closed)
- Licence: CC0. FreePD released its whole catalogue as
  "Creative Commons 0"; no attribution is required.
- Original file SHA-256:
  `c512922521ec30604cc2892d3fc84a7e0ed88f3c758ee3ccad40730c641ed2d8`

The track runs at about 180 BPM. The excerpt starts on the first note
(0.70 s into the file), and the bar-20 downbeat lands at frame 796, where
the fade starts:

```bash
ffmpeg -ss 0.70 -t 28.94 -i 'BeBop for Joey.mp3' \
  -map_metadata -1 -c:a libopus -b:a 160k music.ogg
```

`BEATS` and `FADE` in `../src/theme.ts` are timed to this excerpt. If you
replace it, retime them to the new track.
