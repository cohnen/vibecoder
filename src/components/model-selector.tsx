import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Zap, Brain, Sparkles, Star } from "lucide-react"

const MODELS = [
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", icon: Sparkles, description: "Latest model, best for complex reasoning" },
  { id: "gemini-pro", name: "Gemini Pro", icon: Brain, description: "More capable, better for complex tasks" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", icon: Star, description: "Latest fast model with improved capabilities" },
  { id: "gemini-flash", name: "Gemini Flash", icon: Zap, description: "Faster responses, good for simple tasks" }
]

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  disabled?: boolean
}

export default function ModelSelector({ selectedModel, onModelChange, disabled = false }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState({})
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  // Find the currently selected model
  const currentModel = MODELS.find(model => model.id === selectedModel) || MODELS[0]
  
  // Position the dropdown when it opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom + window.scrollY + 4}px`,
        right: `${window.innerWidth - rect.right}px`,
      })
    }
  }, [isOpen])
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (isOpen && !(e.target as Element).closest('.model-selector-container')) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])
  
  return (
    <div className="model-selector-container relative">
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 border-[#FF6B35]/30 focus:border-[#FF6B35] text-gray-700 min-w-[140px]"
      >
        <currentModel.icon className="h-4 w-4 text-[#FF6B35] flex-shrink-0" />
        <span className="truncate">{currentModel.name}</span>
      </Button>
      
      {isOpen && (
        <div 
          className="w-64 bg-white rounded-md shadow-xl border border-gray-200 z-50 py-1 mt-1"
          style={dropdownStyle}
        >
          {MODELS.map(model => (
            <button
              key={model.id}
              type="button"
              onClick={() => {
                onModelChange(model.id)
                setIsOpen(false)
              }}
              className={`flex items-start gap-3 w-full px-3 py-2 text-left hover:bg-[#FFF5EB] transition-colors ${
                model.id === selectedModel ? 'bg-[#FFF5EB]' : ''
              }`}
            >
              <div className="mt-0.5">
                <model.icon className={`h-5 w-5 ${model.id === selectedModel ? 'text-[#FF6B35]' : 'text-gray-500'}`} />
              </div>
              <div>
                <div className={`font-medium ${model.id === selectedModel ? 'text-[#FF6B35]' : 'text-gray-800'}`}>
                  {model.name}
                </div>
                <div className="text-xs text-gray-500">{model.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 