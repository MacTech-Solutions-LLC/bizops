import type { Config } from "tailwindcss";
import { mactechPreset } from "@mactech-solutions-llc/design-tokens";

const config: Config = {
  presets: [mactechPreset],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
