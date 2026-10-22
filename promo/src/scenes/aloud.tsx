import {makeScene2D} from '@revideo/2d';
import {all, createRef, easeInOutCubic, useScene, waitFor} from '@revideo/core';
import {Phone} from '../components/Phone';
import {Caption} from '../components/Caption';
import {palette} from '../theme';
import {holdUntilCut} from '../cut';

export default makeScene2D('aloud', function* (view) {
  view.fill(palette.plate);
  const focusY = useScene().variables.get('stills', true)() ? -110 : 200;
  const phone = createRef<Phone>();
  const caption = createRef<Caption>();
  view.add(<>
    <Phone ref={phone} x={470} y={20} screenshot="24-read-aloud" footage="read-aloud" />
    <Caption ref={caption} text={'Listen, with the text\nfollowing along'} />
  </>);
  yield view.toPromise();
  phone().video?.play();
  yield* caption().enter();
  yield* waitFor(0.25);
  yield* all(phone().scale(1.65, 1.25, easeInOutCubic), phone().y(focusY, 1.25, easeInOutCubic), phone().x(590, 1.25, easeInOutCubic));
  yield* holdUntilCut(2);
});
