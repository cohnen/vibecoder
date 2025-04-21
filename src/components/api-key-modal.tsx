import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Key, Eye, EyeOff, Info, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { verifyApiKey } from "@/lib/gemini"

interface ApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (apiKey: string) => void
  initialApiKey: string
  isOnboarding: boolean
}

export default function ApiKeyModal({ isOpen, onClose, onSave, initialApiKey, isOnboarding }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState(initialApiKey)
  const [showApiKey, setShowApiKey] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [animationStep, setAnimationStep] = useState(0)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [verificationSuccess, setVerificationSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOnboarding) {
      // Start the animation sequence for onboarding
      const timer = setTimeout(() => {
        setAnimationStep(1)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isOnboarding])

  useEffect(() => {
    // Reset verification states when API key changes
    setVerificationError(null)
    setVerificationSuccess(false)
    
    // Simple validation - check if the API key is at least 10 characters
    setIsValid(apiKey.length >= 10)
  }, [apiKey])

  const handleVerifyAndSave = async () => {
    if (!isValid || isVerifying) return
    
    setIsVerifying(true)
    setVerificationError(null)
    setVerificationSuccess(false)
    
    try {
      const isValidKey = await verifyApiKey(apiKey)
      
      if (isValidKey) {
        setVerificationSuccess(true)
        // Save after a short delay to show success state
        setTimeout(() => {
          onSave(apiKey)
        }, 800)
      } else {
        setVerificationError("Invalid API key. Please check and try again.")
      }
    } catch {
      setVerificationError("Failed to verify API key. Please check your connection.")
    } finally {
      setIsVerifying(false)
    }
  }

  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey)
  }

  if (!isOpen && !isOnboarding) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-md w-full"
        >
          <div className="relative">
            {/* Decorative header */}
            <div className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] h-3" />

            <div className="p-6 md:p-8">
              <AnimatePresence mode="wait">
                {isOnboarding && animationStep === 0 && (
                  <motion.div
                    key="welcome"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="text-center space-y-4"
                  >
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, 0, -5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: 1,
                        ease: "easeInOut",
                      }}
                      className="mx-auto bg-[#FFF5EB] p-4 rounded-full w-20 h-20 flex items-center justify-center"
                    >
                      <Key className="h-10 w-10 text-[#FF6B35]" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-gray-900">Welcome to VibeCoder!</h2>
                    <p className="text-gray-600">
                      To get started, we need your Google Gemini API key to generate App Scripts.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAnimationStep(1)}
                      className="bg-[#FF6B35] text-white px-6 py-2 rounded-md font-medium"
                    >
                      Let's Set Up
                    </motion.button>
                  </motion.div>
                )}

                {(animationStep === 1 || !isOnboarding) && (
                  <motion.div
                    key="api-form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-gray-900">
                        {isOnboarding ? "Enter Your API Key" : "Update API Key"}
                      </h2>
                      {!isOnboarding && (
                        <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500">
                          Cancel
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
                          Google Gemini API Key
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleShowApiKey}
                          className="h-6 w-6 p-0 text-gray-500"
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <div className="relative">
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                          className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"
                        >
                          <Key className="h-5 w-5 text-gray-400" />
                        </motion.div>
                        <Input
                          ref={inputRef}
                          id="apiKey"
                          type={showApiKey ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="pl-10 pr-10 border-[#FF6B35]/30 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                          placeholder="Enter your Gemini API key"
                        />
                      </div>
                      
                      {/* Verification status messages */}
                      {verificationError && (
                        <div className="flex items-center gap-2 text-red-500 text-sm mt-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <span>{verificationError}</span>
                        </div>
                      )}
                      
                      {verificationSuccess && (
                        <div className="flex items-center gap-2 text-green-500 text-sm mt-2">
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                          <span>API key verified successfully!</span>
                        </div>
                      )}
                      
                      <div className="flex items-start gap-2 text-xs text-gray-500">
                        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <p>
                          Your API key is stored locally on your device and never sent to our servers. You can get a
                          Gemini API key from the{" "}
                          <a
                            href="https://ai.google.dev/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#FF6B35] hover:underline"
                          >
                            Google AI Studio
                          </a>
                          .
                        </p>
                      </div>
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Button
                        onClick={handleVerifyAndSave}
                        disabled={!isValid || isVerifying}
                        className="w-full bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white disabled:opacity-50"
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          isOnboarding ? "Start Using VibeCoder" : "Update API Key"
                        )}
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
