"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MaskedApiKeyProps {
  apiKey: string
}

export default function MaskedApiKey({ apiKey }: MaskedApiKeyProps) {
  const [showKey, setShowKey] = useState(false)

  // Create a masked version of the API key (show first 4 and last 4 characters)
  const maskedKey = apiKey
    ? `${apiKey.substring(0, 4)}${"•".repeat(Math.max(0, apiKey.length - 8))}${apiKey.substring(apiKey.length - 4)}`
    : ""

  return (
    <div className="flex items-center space-x-2">
      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{showKey ? apiKey : maskedKey}</code>
      <Button variant="ghost" size="sm" onClick={() => setShowKey(!showKey)} className="h-8 w-8 p-0">
        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        <span className="sr-only">{showKey ? "Hide" : "Show"} API key</span>
      </Button>
    </div>
  )
}
