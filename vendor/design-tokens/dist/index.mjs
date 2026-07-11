// src/tailwind-preset.ts
var mactechPreset = {
  theme: {
    extend: {
      colors: {
        "mt-bg": "var(--mt-bg)",
        "mt-bg-2": "var(--mt-bg-2)",
        "mt-bg-3": "var(--mt-bg-3)",
        "mt-surface-1": "var(--mt-surface-1)",
        "mt-surface-2": "var(--mt-surface-2)",
        "mt-surface-3": "var(--mt-surface-3)",
        "mt-surface-4": "var(--mt-surface-4)",
        "mt-hairline": "var(--mt-hairline)",
        "mt-hairline-2": "var(--mt-hairline-2)",
        "mt-hairline-3": "var(--mt-hairline-3)",
        "mt-text": "var(--mt-text)",
        "mt-text-2": "var(--mt-text-2)",
        "mt-text-3": "var(--mt-text-3)",
        "mt-text-4": "var(--mt-text-4)",
        "mt-accent": "var(--mt-accent)",
        "mt-accent-2": "var(--mt-accent-2)",
        "mt-accent-3": "var(--mt-accent-3)",
        "mt-on-accent": "var(--mt-on-accent)",
        "mt-success": "var(--mt-success)",
        "mt-warning": "var(--mt-warning)",
        "mt-danger": "var(--mt-danger)"
      },
      fontFamily: {
        "mt-sans": ["var(--mt-font-sans)"],
        "mt-mono": ["var(--mt-font-mono)"],
        "mt-serif": ["var(--mt-font-serif)"]
      },
      borderRadius: {
        "mt-1": "var(--mt-radius-1)",
        "mt-2": "var(--mt-radius-2)",
        "mt-3": "var(--mt-radius-3)",
        "mt-4": "var(--mt-radius-4)"
      },
      transitionTimingFunction: {
        "mt-out": "var(--mt-ease-out)",
        "mt-spring": "var(--mt-ease-spring)",
        "mt-in-out": "var(--mt-ease-in-out)"
      },
      boxShadow: {
        "mt-glow": "0 0 24px var(--mt-glow)",
        "mt-glow-2": "0 0 24px var(--mt-glow-2)"
      },
      backgroundImage: {
        "mt-mesh-1": "var(--mt-mesh-1)",
        "mt-mesh-2": "var(--mt-mesh-2)",
        "mt-mesh-3": "var(--mt-mesh-3)"
      }
    }
  }
};
var tailwind_preset_default = mactechPreset;

// src/index.ts
var moods = ["vivid", "quiet", "editorial", "brutalist"];
export {
  tailwind_preset_default as default,
  mactechPreset,
  moods
};
//# sourceMappingURL=index.mjs.map