import {makeProject} from '@revideo/core';
import intro from './scenes/intro';
import reading from './scenes/reading';
import aloud from './scenes/aloud';
import translation from './scenes/translation';
import companion from './scenes/companion';
import library from './scenes/library';
import sync from './scenes/sync';
import outro from './scenes/outro';
import './fonts.css';
export default makeProject({
  scenes: [intro, reading, aloud, translation, companion, library, sync, outro],
  settings: {
    shared: {size: {x: 1920, y: 1080}},
    rendering: {fps: 30},
    preview: {fps: 30},
  },
});
