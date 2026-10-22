import {Txt, type TxtProps} from '@revideo/2d';
import {all, easeOutCubic} from '@revideo/core';
import {fonts, palette} from '../theme';

export class Caption extends Txt {
  constructor(props: TxtProps) {
    super({fontFamily: fonts.title, fontSize: 76, lineHeight: 94,
      width: 760, textAlign: 'left', fill: palette.ink,
      x: -450, y: -30, opacity: 0, ...props});
  }
  *enter() {
    const y = this.y();
    this.y(y + 28);
    yield* all(this.y(y, 0.55, easeOutCubic), this.opacity(1, 0.4));
  }
}
