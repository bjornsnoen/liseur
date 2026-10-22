import {makeScene2D} from '@revideo/2d';
import {all, createRef, easeOutCubic, waitFor} from '@revideo/core';
import {Phone} from '../components/Phone';
import {Caption} from '../components/Caption';
import {palette} from '../theme';
import {holdUntilCut} from '../cut';

export default makeScene2D('library', function* (view) {
  view.fill(palette.paper);
  const shelf = createRef<Phone>();
  const series = createRef<Phone>();
  const widgets = createRef<Phone>();
  const caption = createRef<Caption>();
  view.add(<>
    <Phone ref={series} x={470} y={20} scale={0.75} opacity={0} screenshot="13-series" />
    <Phone ref={widgets} x={470} y={20} scale={0.75} opacity={0} screenshot="22-widgets-light" />
    <Phone ref={shelf} x={470} y={20} screenshot="01-library" footage="library" />
    <Caption ref={caption} x={-590} width={480} text={'Your shelves,\nseries and\nwidgets'} />
  </>);
  yield view.toPromise();
  shelf().video?.play();
  yield* caption().enter();
  yield* waitFor(0.8);
  yield* all(shelf().scale(0.8, 0.7, easeOutCubic),
    series().opacity(1, 0.3), series().x(160, 0.8, easeOutCubic), series().rotation(-9, 0.8, easeOutCubic),
    widgets().opacity(1, 0.3), widgets().x(700, 0.8, easeOutCubic), widgets().rotation(9, 0.8, easeOutCubic));
  yield* holdUntilCut(5);
});
