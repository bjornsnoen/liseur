import {Node, Txt, makeScene2D} from '@revideo/2d';
import {all, createRef, createSignal, easeInOutCubic, easeOutCubic, tween} from '@revideo/core';
import {Phone} from '../components/Phone';
import {Caption} from '../components/Caption';
import {fonts, palette} from '../theme';
import {holdUntilCut} from '../cut';

export default makeScene2D('sync', function* (view) {
  view.fill(palette.plate);
  const caption = createRef<Caption>();
  const names = createRef<Node>();
  const angle = createSignal(-0.12);
  const counter = createRef<Txt>();
  view.add(<>
    <Phone x={460} y={20} scale={0.84} screenshot="18-stats" />
    <Caption ref={caption} text={'Bring your\nlibrary along'} y={-190} />
    <Txt ref={counter} x={-450} y={100} width={760} textAlign="left" fontFamily={fonts.title} fontSize={82} fill={palette.ink} opacity={0}
      text="0 hours of reading" />
    <Node ref={names}>
      {['calibre-web', 'Komga', 'OPDS', 'liseur-sync'].map((name, index) => {
        const phase = index * Math.PI / 2 + Math.PI / 4;
        return <Txt text={name} fontFamily={fonts.body} fontSize={30} fill={palette.ink}
          x={() => 460 + Math.cos(phase + angle()) * 480}
          y={() => Math.sin(phase + angle()) * 460} />;
      })}
    </Node>
  </>);
  yield* all(caption().enter(), angle(0.12, 1.25, easeInOutCubic));
  yield* all(names().opacity(0, 0.35), counter().opacity(1, 0.35), tween(0.7, t => counter().text(`${Math.floor(easeOutCubic(t) * 17)} hours of reading`)));
  yield* holdUntilCut(6);
});
