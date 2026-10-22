export const palette = {
  plate: '#F0DFCA',
  ink: '#183453',
  paper: '#FAF8F4',
  sepia: '#E7D2AF',
  night: '#19232D',
  soft: '#625242',
};
export const fonts = {title: 'Literata', body: 'Inter'};
export const shot = (name: string) => `/screenshots/${name}.png`;

// Scene cuts, in frames at 30 fps, on strong note attacks of assets/music.ogg; the final cue is the end.
export const BEATS = [0, 110, 230, 336, 430, 510, 607, 716, 866].map(frame => frame / 30);
// The bar-20 downbeat: picture and music fade from here to the end.
export const FADE = 796 / 30;
export const duration = (beat: number) => BEATS[beat + 1] - BEATS[beat];
