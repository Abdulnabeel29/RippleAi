/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        "surface-variant": "#2e353f",
        "inverse-primary": "#5d6300",
        "on-tertiary-fixed": "#2a1700",
        "outline-variant": "#474833",
        "on-primary": "#2f3300",
        "on-surface": "#dce3f0",
        "on-error": "#690005",
        "on-secondary-fixed-variant": "#930013",
        "tertiary-container": "#ffddb8",
        "surface": "#0d141d",
        "secondary-container": "#a40217",
        "background": "#0d141d",
        "on-secondary": "#68000a",
        "primary": "#3b82f6",
        "primary-foreground": "#ffffff",
        "on-primary-fixed-variant": "#454a00",
        "primary-container": "#dfed1a",
        "on-background": "#dce3f0",
        "primary-fixed-dim": "#c3d000",
        "surface-container-lowest": "#080f17",
        "inverse-surface": "#dce3f0",
        "secondary": "#1e293b",
        "secondary-foreground": "#f8fafc",
        "on-tertiary-fixed-variant": "#653e00",
        "secondary-fixed-dim": "#ffb3ad",
        "primary-fixed": "#dfed1a",
        "secondary-fixed": "#ffdad7",
        "tertiary-fixed-dim": "#ffb95f",
        "surface-container-low": "#151c25",
        "surface-container-highest": "#2e353f",
        "outline": "#929279",
        "on-error-container": "#ffdad6",
        "surface-tint": "#c3d000",
        "error-container": "#93000a",
        "surface-dim": "#0d141d",
        "tertiary": "#6366f1",
        "on-tertiary-container": "#8d5900",
        "error": "#ffb4ab",
        "on-primary-container": "#636900",
        "on-tertiary": "#472a00",
        "surface-container-high": "#232a34",
        "on-surface-variant": "#c8c8ac",
        "on-secondary-fixed": "#410004",
        "surface-container": "#192029",
        "surface-bright": "#333a44",
        "on-secondary-container": "#ffaea8",
        "tertiary-fixed": "#ffddb8",
        "on-primary-fixed": "#1b1d00",
        "inverse-on-surface": "#2a313b",
        "card": {
          DEFAULT: "#151c25",
          foreground: "#dce3f0",
        },
        "danger": {
          DEFAULT: "#ffb3ad",
          glow: "rgba(255, 179, 173, 0.4)"
        },
        "warning": {
          DEFAULT: "#ffb95f", 
          glow: "rgba(255, 185, 95, 0.4)"
        },
        "success": {
          DEFAULT: "#dfed1a"
        },
        "low": {
          DEFAULT: "#333a44"
        },
        "border": "#2e353f"
      },
      borderRadius: {
        lg: "0.25rem",
        md: "0.125rem",
        sm: "0.125rem",
      },
    },
  },
  plugins: [],
}
