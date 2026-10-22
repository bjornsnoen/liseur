import {Line, makeScene2D} from '@revideo/2d';
import {all, createRef, easeOutCubic} from '@revideo/core';
import {Phone} from '../components/Phone';
import {Caption} from '../components/Caption';
import {palette} from '../theme';
import {holdUntilCut} from '../cut';

export default makeScene2D('companion', function* (view) {
  view.fill(palette.plate);
  const left = createRef<Phone>();
  const right = createRef<Phone>();
  const line = createRef<Line>();
  const caption = createRef<Caption>();
  view.add(<>
    <Line ref={line} points={[[80, -100], [295, 60], [510, -170]]} stroke={palette.soft} lineWidth={3} end={0} />
    <Phone ref={left} x={40} y={650} scale={0.86} screenshot="25-companion-profile" />
    <Phone ref={right} x={590} y={-650} scale={0.86} screenshot="26-codex-relationships" />
    <Caption ref={caption} x={-600} width={470} fontSize={68} lineHeight={84} text={'Who is who,\nwithout\nspoilers'} />
  </>);
  yield* all(caption().enter(), left().y(100, 0.65, easeOutCubic), right().y(-40, 0.8, easeOutCubic));
  yield* line().end(1, 0.7, easeOutCubic);
  yield* holdUntilCut(4);
});
