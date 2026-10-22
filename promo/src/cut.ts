import {useThread, waitFor} from '@revideo/core';
import {duration} from './theme';

// Hold until the scene's cut. The extra half frame stops float error in waitFor from ending a frame early.
export function* holdUntilCut(beat: number) {
  yield* waitFor(duration(beat) - useThread().time() + 0.5 / 30);
}
