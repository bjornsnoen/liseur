import {Img, Rect, Txt, makeScene2D} from '@revideo/2d';
import {all, createRef, easeInOutSine, easeOutCubic, sequence, useThread, waitFor} from '@revideo/core';
import {BEATS, FADE, fonts, palette} from '../theme';
import {holdUntilCut} from '../cut';

export default makeScene2D('outro', function* (view) {
  view.fill(palette.plate);
  const emblem = createRef<Img>();
  const title = createRef<Txt>();
  const promise = createRef<Txt>();
  const stores = createRef<Txt>();
  const black = createRef<Rect>();
  view.add(<>
    <Img ref={emblem} src="/emblem.webp" width={360} y={-160} scale={0.8} opacity={0} />
    <Txt ref={title} fontFamily={fonts.title} fontSize={144} fill={palette.ink} y={85} opacity={0} text="Liseur" />
    <Txt ref={promise} fontFamily={fonts.body} fontSize={36} fill={palette.soft} y={230} opacity={0} text="Free & open source · No ads · No account" />
    <Txt ref={stores} fontFamily={fonts.body} fontSize={42} fill={palette.ink} y={375} opacity={0} text="On Google Play and F-Droid" />
    <Rect ref={black} width={1920} height={1080} fill="#000" opacity={0} />
  </>);
  yield* all(emblem().scale(1, 0.8, easeOutCubic), emblem().opacity(1, 0.4),
    sequence(0.3, title().opacity(1, 0.5), promise().opacity(1, 0.5), stores().opacity(1, 0.5)));
  yield* waitFor(FADE - BEATS[7] - useThread().time());
  yield* black().opacity(1, BEATS[8] - FADE, easeInOutSine);
  yield* holdUntilCut(7);
});
