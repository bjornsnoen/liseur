import {makeScene2D} from '@revideo/2d';
import {all, createRef, easeInOutCubic, easeOutCubic, waitFor} from '@revideo/core';
import {Phone} from '../components/Phone';
import {Caption} from '../components/Caption';
import {palette} from '../theme';
import {holdUntilCut} from '../cut';

export default makeScene2D('reading', function* (view) {
  view.fill(palette.paper);
  const light = createRef<Phone>();
  const sepia = createRef<Phone>();
  const dark = createRef<Phone>();
  const caption = createRef<Caption>();
  view.add(<>
    <Phone ref={light} x={560} y={20} screenshot="02-reading" footage="reading-light" opacity={0} />
    <Phone ref={sepia} x={470} y={20} screenshot="28-reading-sepia" footage="reading-sepia" opacity={0} />
    <Phone ref={dark} x={470} y={20} screenshot="11-reading-dark" footage="reading-dark" opacity={0} />
    <Caption ref={caption} text={'A reader that gets\nout of the way'} />
  </>);
  yield view.toPromise();
  light().video?.play();
  yield* all(caption().enter(), light().x(470, 0.6, easeOutCubic), light().opacity(1, 0.4));
  yield* waitFor(0.45);
  sepia().video?.play();
  yield* all(view.fill(palette.sepia, 0.4), sepia().opacity(1, 0.4), light().opacity(0, 0.4));
  yield* waitFor(0.6);
  dark().video?.play();
  yield* all(view.fill(palette.night, 0.45), dark().opacity(1, 0.45), sepia().opacity(0, 0.45), caption().fill(palette.plate, 0.45));
  yield* all(dark().scale(1.035, 0.8, easeInOutCubic), holdUntilCut(1));
});
