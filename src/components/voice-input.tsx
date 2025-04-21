import { useState, useEffect, useCallback } from 'react'
import { Mic, MicOff, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Define types for the Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string
      }
      isFinal: boolean
    }
  }
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: (event: SpeechRecognitionEvent) => void
  onerror: (event: SpeechRecognitionErrorEvent) => void
  onend: () => void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

// Language options
const LANGUAGES = [
  { code: 'en-US', shortCode: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es-ES', shortCode: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'hi-IN', shortCode: 'hi', name: 'Hindi', flag: '🇮🇳' }
]

// Debug log the languages
console.log('Available languages:', LANGUAGES)

export default function VoiceInput({ onTranscript, disabled = false }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSpeechRecognitionAvailable, setIsSpeechRecognitionAvailable] = useState(false)
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<typeof LANGUAGES[0]>(LANGUAGES[0])

  // Check for SpeechRecognition availability and initialize language
  useEffect(() => {
    // Check for Speech Recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSpeechRecognitionAvailable(!!SpeechRecognition)

    // Initialize selected language
    try {
      // Check if language preference is saved in localStorage
      const savedLanguageCode = localStorage.getItem('voiceInputLanguage')
      console.log('Saved language code:', savedLanguageCode)
      
      if (savedLanguageCode) {
        const language = LANGUAGES.find(lang => lang.code === savedLanguageCode)
        if (language) {
          console.log('Restoring saved language:', language)
          setSelectedLanguage(language)
        } else {
          console.log('Saved language not found, defaulting to English')
          setSelectedLanguage(LANGUAGES[0]) // Default to English
        }
      } else {
        console.log('No saved language, defaulting to English')
        setSelectedLanguage(LANGUAGES[0]) // Default to English
      }
    } catch (error) {
      console.error('Error loading language preference:', error)
      setSelectedLanguage(LANGUAGES[0]) // Default to English on error
    }
  }, [])

  const selectLanguage = (language: typeof LANGUAGES[0]) => {
    console.log('Selecting language:', language)
    setSelectedLanguage(language)
    localStorage.setItem('voiceInputLanguage', language.code)
    setShowLanguageSelector(false)
  }

  const toggleLanguageSelector = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setShowLanguageSelector(prev => !prev)
    
    // If we're opening the selector and listening is active, stop it
    if (!showLanguageSelector && isListening) {
      setIsListening(false)
    }
  }

  // Close language selector when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showLanguageSelector && !(event.target as Element).closest('.language-selector-area')) {
        setShowLanguageSelector(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLanguageSelector])

  const toggleListening = useCallback(() => {
    if (disabled) return
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser')
      return
    }
    
    if (isListening) {
      // Stop listening
      setIsListening(false)
      return
    }
    
    // Start listening
    setError(null)
    setIsListening(true)
    setTranscript('')
    
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = selectedLanguage.code
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const current = event.resultIndex
      const result = event.results[current]
      const transcriptText = result[0].transcript
      
      setTranscript(transcriptText)
      
      if (result.isFinal) {
        onTranscript(transcriptText)
        setIsListening(false)
      }
    }
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Handle different error types more gracefully
      const errorMessage = (() => {
        switch(event.error) {
          case 'no-speech':
            return "No speech detected. Please try again."
          case 'aborted':
            return "Speech recognition was aborted."
          case 'audio-capture':
            return "Microphone not working or not connected."
          case 'network':
            return "Network error occurred. Please check your connection."
          case 'not-allowed':
            return "Microphone access was not allowed. Please check permissions."
          case 'service-not-allowed':
            return "Speech recognition service not allowed. Please try again later."
          case 'bad-grammar':
            return "Grammar error in speech recognition."
          default:
            return `Error occurred: ${event.error}`;
        }
      })();
      
      setError(errorMessage)
      setIsListening(false)
    }
    
    recognition.onend = () => {
      setIsListening(false)
    }
    
    try {
      recognition.start()
    } catch {
      setError('Could not start speech recognition')
      setIsListening(false)
    }
    
    return () => {
      try {
        recognition.stop()
      } catch {
        // Ignore errors when stopping
      }
    }
  }, [isListening, onTranscript, disabled, selectedLanguage])

  // Visual animation for active listening
  const pulseClass = isListening 
    ? 'animate-pulse bg-[#FF6B35]/20 text-[#FF6B35]' 
    : 'bg-white text-[#FF6B35] hover:bg-[#FF6B35]/10'

  // If speech recognition isn't available, return a disabled button with tooltip
  if (!isSpeechRecognitionAvailable) {
    return (
      <div className="group relative">
        <Button
          type="button"
          disabled
          variant="outline"
          size="icon"
          className="rounded-full border border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
          aria-label="Voice input not supported"
        >
          <MicOff className="h-5 w-5" />
        </Button>
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-md">
            Voice input not supported in this browser
            <div className="absolute bottom-0 right-3 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative language-selector-area">
      <div className="flex items-center space-x-2">
        {/* Inline language selector that expands left when active */}
        <div className="flex items-center">
          {showLanguageSelector && (
            <div className="flex items-center gap-1 pr-2 animate-in slide-in-from-right-5 duration-150">
              {LANGUAGES.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => selectLanguage(language)}
                  className={`flex flex-col items-center justify-center rounded-full w-7 h-7 border transition-all ${
                    selectedLanguage.code === language.code
                      ? 'border-[#FF6B35] bg-[#FF6B35]/10 scale-110'
                      : 'border-gray-200 hover:border-[#FF6B35]/40 hover:bg-[#FF6B35]/5'
                  }`}
                  title={language.name}
                >
                  <span className="text-xs">{language.flag}</span>
                </button>
              ))}
            </div>
          )}
          
          {/* Language toggle button */}
          <Button
            type="button"
            onClick={toggleLanguageSelector}
            variant="outline"
            size="icon"
            className="rounded-full border border-[#FF6B35]/40 bg-white text-[#FF6B35] hover:bg-[#FF6B35]/10 transition-colors relative"
            aria-label="Select language"
          >
            <Globe className="h-4 w-4" />
            <span className="absolute -bottom-1 -right-1 text-xs block">{selectedLanguage.flag}</span>
          </Button>
        </div>
        
        {/* Voice button */}
        <Button
          type="button"
          onClick={toggleListening}
          disabled={disabled}
          variant="outline"
          size="icon"
          className={`rounded-full border border-[#FF6B35]/40 ${pulseClass} transition-colors`}
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
        >
          {isListening ? (
            <Mic className="h-5 w-5" />
          ) : (
            <MicOff className="h-5 w-5" />
          )}
        </Button>
      </div>

      {transcript && isListening && (
        <div className="absolute top-full mt-2 right-0 w-64 p-2 bg-white border border-[#FF6B35]/20 rounded-md shadow-md text-sm">
          <div className="font-medium text-xs text-gray-500 mb-1">
            Listening... ({selectedLanguage.shortCode})
          </div>
          {transcript}
        </div>
      )}

      {error && (
        <div className="absolute top-full mt-2 right-0 w-64 p-2 bg-red-50 border border-red-200 rounded-md shadow-md text-sm text-red-500">
          {error}
        </div>
      )}
    </div>
  )
} 