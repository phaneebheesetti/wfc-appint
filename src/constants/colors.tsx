export enum ColorEnum {
  RED = "red",
  GREEN = "green",
  AMBER = "amber",
  BLUE = "blue",
  ORANGE = "orange",
  YELLOW = "yellow",
  MUTED = "muted",
  BROWN = "brown",
  PURPLE = "purple",
  CYAN = "cyan",
}

// This mapping ensures that Tailwind can "see" all the dynamically used classes at build time.
// Whenever you add a new color, add it here with both text and progress variants.
export const COLOR_MAP: Record<ColorEnum, { text: string; progress: string }> = {
  red: {
    text: "text-destructive",
    progress: "[&>*]:bg-destructive",
  },
  green: {
    text: "text-success",
    progress: "[&>*]:bg-success",
  },
  amber: {
    text: "text-warning",
    progress: "[&>*]:bg-warning",
  },
  blue: {
    text: "text-blue-500",
    progress: "[&>*]:bg-blue-500",
  },
  orange: {
    text: "text-orange-500",
    progress: "[&>*]:bg-orange-500",
  },
  yellow: {
    text: "text-yellow-500",
    progress: "[&>*]:bg-yellow-500",
  },
  muted: {
    text: "text-muted-foreground",
    progress: "[&>*]:bg-muted-foreground",
  },
  brown: {
    text: "text-brown-500",
    progress: "[&>*]:bg-brown-500",
  },
  purple: {
    text: "text-purple-500",
    progress: "[&>*]:bg-purple-500",
  },
  cyan: {
    text: "text-cyan-500",
    progress: "[&>*]:bg-cyan-500",
  },
}
