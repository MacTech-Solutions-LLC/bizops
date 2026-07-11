// src/fonts.ts
import {
  DM_Sans,
  Fraunces,
  Geist,
  Geist_Mono,
  Instrument_Serif,
  Inter_Tight,
  JetBrains_Mono,
  Source_Serif_4
} from "next/font/google";
var geist = Geist({
  subsets: ["latin"],
  variable: "--mt-font-sans-loaded",
  display: "swap"
});
var geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--mt-font-mono-loaded",
  display: "swap"
});
var instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
  variable: "--mt-font-serif-loaded",
  display: "swap"
});
var interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--mt-font-sans-loaded",
  display: "swap"
});
var sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--mt-font-serif-loaded",
  display: "swap"
});
var dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--mt-font-sans-loaded",
  display: "swap"
});
var fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--mt-font-serif-loaded",
  display: "swap"
});
var jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--mt-font-mono-loaded",
  display: "swap"
});
var vividFonts = {
  sans: geist,
  mono: geistMono,
  serif: instrumentSerif
};
var quietFonts = {
  sans: interTight,
  mono: jetbrainsMono,
  serif: sourceSerif
};
var editorialFonts = {
  sans: dmSans,
  mono: jetbrainsMono,
  serif: fraunces
};
var brutalistFonts = {
  sans: jetbrainsMono,
  mono: jetbrainsMono,
  serif: jetbrainsMono
};
export {
  brutalistFonts,
  editorialFonts,
  quietFonts,
  vividFonts
};
