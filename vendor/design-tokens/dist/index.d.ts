declare const mactechPreset: {
    theme: {
        extend: {
            colors: {
                "mt-bg": string;
                "mt-bg-2": string;
                "mt-bg-3": string;
                "mt-surface-1": string;
                "mt-surface-2": string;
                "mt-surface-3": string;
                "mt-surface-4": string;
                "mt-hairline": string;
                "mt-hairline-2": string;
                "mt-hairline-3": string;
                "mt-text": string;
                "mt-text-2": string;
                "mt-text-3": string;
                "mt-text-4": string;
                "mt-accent": string;
                "mt-accent-2": string;
                "mt-accent-3": string;
                "mt-on-accent": string;
                "mt-success": string;
                "mt-warning": string;
                "mt-danger": string;
            };
            fontFamily: {
                "mt-sans": [string];
                "mt-mono": [string];
                "mt-serif": [string];
            };
            borderRadius: {
                "mt-1": string;
                "mt-2": string;
                "mt-3": string;
                "mt-4": string;
            };
            transitionTimingFunction: {
                "mt-out": string;
                "mt-spring": string;
                "mt-in-out": string;
            };
            boxShadow: {
                "mt-glow": string;
                "mt-glow-2": string;
            };
            backgroundImage: {
                "mt-mesh-1": string;
                "mt-mesh-2": string;
                "mt-mesh-3": string;
            };
        };
    };
};

type Mood = "vivid" | "quiet" | "editorial" | "brutalist";
declare const moods: Mood[];

export { type Mood, mactechPreset as default, mactechPreset, moods };
