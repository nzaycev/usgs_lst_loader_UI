import { extendTheme } from "@chakra-ui/react";

export const darkTheme = extendTheme({
  config: {
    initialColorMode: "dark",
    useSystemColorMode: false,
  },
  colors: {
    gray: {
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      300: "#d1d5db",
      400: "#9ca3af",
      500: "#6b7280",
      600: "#4b5563",
      700: "#374151",
      800: "#1f2937",
      900: "#111827",
    },
  },
  components: {
    Button: {
      variants: {
        solid: {
          _hover: {
            opacity: 0.9,
          },
          _active: {
            opacity: 0.8,
          },
        },
      },
    },
    Menu: {
      parts: ["menu", "item"],
      baseStyle: {
        menu: {
          boxShadow: "lg",
          zIndex: 1000,
        },
        item: {
          _focus: {
            bg: "gray.700",
          },
          _active: {
            bg: "gray.600",
          },
        },
      },
    },
  },
  styles: {
    global: {
      body: {
        bg: "gray.900",
        color: "gray.200",
      },
    },
  },
});

