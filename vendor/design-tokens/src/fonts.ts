// Font definitions for each mood. Apps import the mood's font bundle and
// spread the `.variable` className onto <body> so the CSS variables
// declared in that mood's mood.css resolve to the loaded font face.
//
// next/font/google must be called at module top level — these objects
// are evaluated once at import time, which is what next/font requires.

import {
  DM_Sans,
  Fraunces,
  Geist,
  Geist_Mono,
  Instrument_Serif,
  Inter_Tight,
  JetBrains_Mono,
  Source_Serif_4,
} from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  variable: "--mt-font-sans-loaded",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--mt-font-mono-loaded",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
  variable: "--mt-font-serif-loaded",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--mt-font-sans-loaded",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--mt-font-serif-loaded",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--mt-font-sans-loaded",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--mt-font-serif-loaded",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--mt-font-mono-loaded",
  display: "swap",
});

export const vividFonts = {
  sans:  geist,
  mono:  geistMono,
  serif: instrumentSerif,
};

export const quietFonts = {
  sans:  interTight,
  mono:  jetbrainsMono,
  serif: sourceSerif,
};

export const editorialFonts = {
  sans:  dmSans,
  mono:  jetbrainsMono,
  serif: fraunces,
};

export const brutalistFonts = {
  sans:  jetbrainsMono,
  mono:  jetbrainsMono,
  serif: jetbrainsMono,
};
