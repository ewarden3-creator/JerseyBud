"use client";

// "Bud" — the friendly cannabis character avatar.
// Cute round body with cannabis leaf crown and a friendly face.
// Animated states: idle (occasional blink), thinking (rotating dots),
// speaking (mouth animates), or static.

import { motion } from "framer-motion";

type State = "idle" | "thinking" | "speaking" | "static";

interface Props {
  size?: number;
  state?: State;
  className?: string;
}

export function BudAvatar({ size = 80, state = "idle", className }: Props) {
  // Eye blink — every 3-5 seconds
  const eyeAnim = state === "static" ? {} : {
    scaleY: [1, 1, 0.1, 1],
  };
  const eyeTransition = state === "static" ? {} : {
    duration: 4,
    times: [0, 0.92, 0.96, 1],
    repeat: Infinity,
    ease: "easeInOut" as const,
  };

  // Mouth shape based on state
  const mouthD = state === "speaking"
    ? "M 35 65 Q 50 78 65 65"   // open smile while speaking
    : state === "thinking"
      ? "M 42 67 Q 50 67 58 67"  // small flat line
      : "M 38 65 Q 50 73 62 65"; // soft smile

  return (
    <div className={className} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Bud">
        <defs>
          <radialGradient id="bud-body" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#A7F3D0" />
            <stop offset="60%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#0F766E" />
          </radialGradient>
          <radialGradient id="bud-cheek" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#FB7185" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FB7185" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Cannabis leaf crown — sits on top of head */}
        <g transform="translate(35, 2) scale(1.3)" fill="#0F3D2A">
          <path d="M11.5 22v-4.65c-.5.78-1.5 1.74-3.47 2.46c0 0 .5-1.71 1.91-2.86c-1.3.28-3.26.24-5.94-.95c0 0 2.47-1.41 5.28-1.03C7.69 14 5.7 12.08 4.17 8.11c0 0 4.5 1.23 6.74 5.03C8.88 8.24 12 2 12 2c2.43 5.47 1.91 9.1 1.12 11.1c2.25-3.77 6.71-4.99 6.71-4.99c-1.53 3.97-3.52 5.89-5.11 6.86C17.53 14.59 20 16 20 16c-2.68 1.19-4.64 1.23-5.94.95c1.41 1.15 1.91 2.86 1.91 2.86c-1.97-.72-2.97-1.68-3.47-2.46V22z" />
        </g>

        {/* Round body */}
        <ellipse cx="50" cy="58" rx="36" ry="34" fill="url(#bud-body)" />

        {/* Subtle cheek blushes */}
        <ellipse cx="28" cy="62" rx="8" ry="5" fill="url(#bud-cheek)" />
        <ellipse cx="72" cy="62" rx="8" ry="5" fill="url(#bud-cheek)" />

        {/* Eyes — animated blink */}
        <motion.g animate={eyeAnim} transition={eyeTransition} style={{ transformOrigin: "50% 50px" }}>
          <ellipse cx="38" cy="50" rx="4.5" ry="6" fill="#0a0a0a" />
          <ellipse cx="62" cy="50" rx="4.5" ry="6" fill="#0a0a0a" />
          {/* Eye shines */}
          <circle cx="40" cy="48" r="1.4" fill="#FFFFFF" />
          <circle cx="64" cy="48" r="1.4" fill="#FFFFFF" />
        </motion.g>

        {/* Mouth — morphs by state */}
        <motion.path
          d={mouthD}
          fill="none"
          stroke="#0a0a0a"
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={state === "speaking" ? { scaleY: [1, 1.4, 1] } : {}}
          transition={state === "speaking" ? { duration: 0.4, repeat: Infinity } : {}}
          style={{ transformOrigin: "50px 65px" }}
        />

        {/* Thinking dots */}
        {state === "thinking" && (
          <g>
            {[0, 1, 2].map((i) => (
              <motion.circle
                key={i}
                cx={42 + i * 8}
                cy={68}
                r={1.6}
                fill="#0a0a0a"
                animate={{ y: [-2, 2, -2] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
