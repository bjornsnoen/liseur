import {Img, Txt, makeScene2D} from '@revideo/2d';
import {all, createRef, tween} from '@revideo/core';
import {fonts, palette} from '../theme';
import {holdUntilCut} from '../cut';

export default makeScene2D('intro', function* (view) {
  view.fill(palette.plate);
  const emblem = createRef<Img>();
  const title = createRef<Txt>();
  const tagline = createRef<Txt>();
  view.add(<>
    <Img ref={emblem} src="/emblem.webp" width={360} y={-120} scale={0.7} opacity={0} />
    <Txt ref={title} fontFamily={fonts.title} fontSize={144} fill={palette.ink} y={130} text="" />
    <Txt ref={tagline} fontFamily={fonts.body} fontSize={32} fill={palette.soft} y={270} opacity={0} text="Make time for a good book." />
  </>);
  yield* all(tween(0.7, t => emblem().scale(1 - 0.3 * Math.exp(-7 * t) * Math.cos(10 * t))), emblem().opacity(1, 0.35), title().text('Liseur', 0.65));
  yield* tagline().opacity(1, 0.4);
  yield* holdUntilCut(0);
});
