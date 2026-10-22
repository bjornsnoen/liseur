import {Img, Rect, Video, type RectProps} from '@revideo/2d';
import {useScene} from '@revideo/core';
import {shot, palette} from '../theme';

interface PhoneProps extends RectProps {
  screenshot: string;
  footage?: string;
}

export class Phone extends Rect {
  readonly video?: Video;

  constructor({screenshot, footage, ...props}: PhoneProps) {
    super({width: 428, height: 948, radius: 42, fill: palette.ink,
      shadowColor: '#18345330', shadowBlur: 40, shadowOffsetY: 22, ...props});
    const stills = useScene().variables.get('stills', true)();
    const media = footage && !stills
      ? new Video({src: `/clips/${footage}.mp4`, width: 408, height: 928, play: false, volume: 0})
      : new Img({src: shot(screenshot), width: 408, height: 928});
    if (media instanceof Video) this.video = media;
    this.add(<Rect width={408} height={928} radius={32} clip>{media}</Rect>);
  }
}
