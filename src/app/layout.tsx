import type React from "react"
import "./globals.css"
import { ThemeProvider } from "../components/theme-provider"

// Apply Inter font via CSS
const interFontClass = "font-sans" // This assumes you've configured Inter in your CSS

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <title>VibeCoder - App Script Generator</title>
        <meta name="description" content="Generate Google App Scripts with natural language" />
      </head>
      <body className={interFontClass}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
