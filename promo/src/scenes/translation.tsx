import {Img, Rect, makeScene2D} from '@revideo/2d';
import {createRef, createSignal, easeInOutCubic, waitFor} from '@revideo/core';
import {Caption} from '../components/Caption';
import {palette, shot} from '../theme';
import {holdUntilCut} from '../cut';

export default makeScene2D('translation', function* (view) {
  view.fill(palette.paper);
  const caption = createRef<Caption>();
  const wipe = createSignal(0);
  view.add(<>
    <Rect x={470} y={20} width={428} height={948} radius={42} fill={palette.ink} shadowColor="#18345330" shadowBlur={40} shadowOffsetY={22}>
      <Rect width={408} height={928} radius={32} clip>
        <Img src={shot('27-translation-original')} width={408} height={928} />
        <Rect width={() => wipe() * 408} height={928} x={() => (wipe() - 1) * 204} clip>
          <Img src={shot('27-translation')} width={408} height={928} x={() => (1 - wipe()) * 204} />
        </Rect>
      </Rect>
    </Rect>
    <Caption ref={caption} text={'Read in another\nlanguage,\npage by page'} />
  </>);
  yield* caption().enter();
  yield* waitFor(0.25);
  yield* wipe(1, 1.25, easeInOutCubic);
  yield* holdUntilCut(3);
});
