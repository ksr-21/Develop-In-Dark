// Keep the config lean so Vite can load it reliably on Windows.
// React JSX is still handled through esbuild's injected import.
export default {
  esbuild: {
    jsxInject: "import React from 'react'",
  },
}
