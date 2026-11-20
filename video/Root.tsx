import React from 'react';
import {Composition} from 'remotion';
import {Surfing} from './Surfing';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Surfing"
    component={Surfing}
    durationInFrames={360}
    fps={30}
    width={1920}
    height={1080}
  />
);
