"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Copy, Send, ThumbsUp, Code, Blocks, RefreshCw, Sparkles, Settings, AlertCircle, Check, LogIn, LogOut, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import confetti from "canvas-confetti"
import ApiKeyModal from "@/components/api-key-modal"
import IdeaChips from "@/components/idea-chips"
import VoiceInput from "@/components/voice-input"
import ModelSelector from "@/components/model-selector"
import { generateScript, verifyApiKey, generateIdeaChips } from "@/lib/gemini"
import ReactMarkdown from 'react-markdown'

export default function Home() {
  const [inputValue, setInputValue] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCode, setGeneratedCode] = useState("")
  const [generatedExplanation, setGeneratedExplanation] = useState("")
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState(false)
  const [showRefinePrompt, setShowRefinePrompt] = useState(false)
  const [refinePrompt, setRefinePrompt] = useState("")
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState("gemini-pro")
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dynamicIdeas, setDynamicIdeas] = useState<Array<{short: string; long: string}>>([])
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false)
  const [showCopiedNotification, setShowCopiedNotification] = useState(false)
  const [includeGeminiHelper, setIncludeGeminiHelper] = useState(true)
  const [includeSampleCode, setIncludeSampleCode] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Google Auth State
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);

  // "Save to Drive" State
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [driveSaveSuccess, setDriveSaveSuccess] = useState<string | null>(null);
  const [driveSaveError, setDriveSaveError] = useState<string | null>(null);
  const [savedScriptDriveId, setSavedScriptDriveId] = useState<string | null>(null);

  // "Publish Script" State
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [deploymentDetails, setDeploymentDetails] = useState<any | null>(null);

  const VITE_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID_HERE";
  const VITE_WORKER_CALLBACK_URL = import.meta.env.VITE_WORKER_CALLBACK_URL || "YOUR_WORKER_CALLBACK_URL_HERE";


  // Effect to handle API key and Google Auth token processing
  useEffect(() => {
    // API Key Logic
    const checkApiKey = async () => {
      if (typeof window !== "undefined") {
        const storedApiKey = localStorage.getItem("geminiApiKey");
        if (storedApiKey) {
          setApiKey(storedApiKey);
          try {
            const isValid = await verifyApiKey(storedApiKey);
            if (!isValid) {
              console.warn("Stored API key is invalid");
              setApiKeyModalOpen(true);
            } else {
              loadIdeaChips(storedApiKey);
            }
          } catch (error) {
            console.error("Failed to verify API key:", error);
          }
        } else {
          setShowOnboarding(true);
        }
      }
    };
    checkApiKey();

    // Google Auth Token Processing from URL Fragment
    if (typeof window !== "undefined" && window.location.hash) {
      const params = new URLSearchParams(window.location.hash.substring(1)); // Remove '#'
      const accessToken = params.get("access_token");
      const idToken = params.get("id_token");
      const expiresIn = params.get("expires_in");

      if (accessToken && idToken) {
        setGoogleAccessToken(accessToken);
        setGoogleIdToken(idToken);
        setIsGoogleLoggedIn(true);

        try {
          const decodedToken = JSON.parse(atob(idToken.split('.')[1]));
          setGoogleUser({ 
            email: decodedToken.email, 
            name: decodedToken.name, 
            picture: decodedToken.picture 
          });
        } catch (e) {
          console.error("Error decoding ID token:", e);
          setError("Failed to process user information from Google login.");
        }

        // Clear the hash from the URL
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      } else if (params.get("error")) {
        setError(`Google Login Error: ${params.get("error_description") || params.get("error")}`);
         window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    }
  }, []); // Run once on mount

  const handleGoogleLogin = () => {
    if (!VITE_GOOGLE_CLIENT_ID || VITE_GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID_HERE") {
      setError("Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.");
      alert("Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.");
      return;
    }
    if (!VITE_WORKER_CALLBACK_URL || VITE_WORKER_CALLBACK_URL === "YOUR_WORKER_CALLBACK_URL_HERE") {
       setError("Google Worker Callback URL is not configured. Please set VITE_WORKER_CALLBACK_URL in your .env file.");
       alert("Google Worker Callback URL is not configured. Please set VITE_WORKER_CALLBACK_URL in your .env file.");
      return;
    }

    // @ts-ignore - google is loaded from script in index.html
    if (typeof google === 'undefined') {
      setError("Google Identity Services library not loaded yet.");
      console.error("Google Identity Services library not loaded yet.");
      return;
    }
    
    try {
      // @ts-ignore
      const client = google.accounts.oauth2.initCodeClient({
        client_id: VITE_GOOGLE_CLIENT_ID,
        scope: 'openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/script.projects',
        ux_mode: 'redirect',
        redirect_uri: VITE_WORKER_CALLBACK_URL,
        // The 'callback' parameter for initCodeClient is not used for 'redirect' ux_mode.
        // The server-side handler at redirect_uri will process the code.
      });
      client.requestCode();
    } catch (e) {
      console.error("Error initializing Google login:", e);
      setError("Could not initiate Google login. Please try again.");
    }
  };

  const handleGoogleLogout = () => {
    // @ts-ignore - google is loaded from script in index.html
    if (googleUser?.email && googleIdToken && typeof google !== 'undefined' && google.accounts && google.accounts.id) {
       // @ts-ignore
      google.accounts.id.revoke(googleIdToken, (done: any) => { // Use idToken for revocation
        console.log('Google token revoked.');
      });
    }
    setGoogleUser(null);
    setGoogleAccessToken(null);
    setGoogleIdToken(null);
    setIsGoogleLoggedIn(false);
    // Optionally clear any related data in localStorage if needed
  };


  // Load idea chips from Gemini
  const loadIdeaChips = async (key: string) => {
    if (isLoadingIdeas) return
    
    setIsLoadingIdeas(true)
    try {
      const result = await generateIdeaChips(key)
      if (result.success && result.ideas && result.ideas.length > 0) {
        setDynamicIdeas(result.ideas)
      }
    } catch (error) {
      console.error("Failed to load idea chips:", error)
    } finally {
      setIsLoadingIdeas(false)
    }
  }

  // Save API key to localStorage and state
  const saveApiKey = (key: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("geminiApiKey", key)
      setApiKey(key)
      setShowOnboarding(false)

      // Try to load ideas immediately when API key is saved
      loadIdeaChips(key)

      // Trigger confetti for successful API key setup
      triggerConfetti()
    }
  }

  // Update API key
  const updateApiKey = (key: string) => {
    saveApiKey(key)
    setApiKeyModalOpen(false)
  }

  // Handle model selection
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId)
  }

  // Handle idea selection
  const handleIdeaSelect = (ideaText: string) => {
    setInputValue(ideaText)

    // Animate the selection with a subtle flash effect
    if (textareaRef.current) {
      textareaRef.current.classList.add("bg-[#FFF5EB]")
      setTimeout(() => {
        textareaRef.current?.classList.remove("bg-[#FFF5EB]")
      }, 300)

      // Focus the textarea and scroll to the bottom
      textareaRef.current.focus()
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight
    }
  }

  // Handle form submission to generate script
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !apiKey) return

    setIsGenerating(true)
    setGeneratedCode("")
    setGeneratedExplanation("")
    setShowFeedback(false)
    setFeedbackGiven(false)
    setShowRefinePrompt(false)
    setError(null)
    // Clear Drive save status on new generation
    setDriveSaveSuccess(null);
    setDriveSaveError(null);
    setSavedScriptDriveId(null);
    // Clear Publish status on new generation
    setPublishSuccess(null);
    setPublishError(null);
    setDeploymentDetails(null);
    
    // Reset and start elapsed time counter
    setElapsedTime(0)
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    try {
      // Call the Gemini API to generate the script with token usage settings
      const result = await generateScript(inputValue, apiKey, selectedModel, {
        includeHelper: includeGeminiHelper,
        includeSampleCode: includeSampleCode
      })
      
      // Stop the timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      
      if (result.success) {
        // Trim the generated code to remove any extra whitespace at the beginning or end
        const trimmedCode = (result.code || "").trim()
        setGeneratedCode(trimmedCode)
        setGeneratedExplanation(result.explanation || "")
        // Trigger confetti animation on success
        triggerConfetti()
        // Automatically copy to clipboard
        navigator.clipboard.writeText(trimmedCode)
        // Show notification
        setShowCopiedNotification(true)
        // Hide after 2 seconds
        setTimeout(() => setShowCopiedNotification(false), 2000)
      } else {
        setError(result.error || "Failed to generate script. Please try again.")
      }
    } catch (error) {
      console.error("Error generating script:", error)
      setError("An unexpected error occurred. Please try again.")
      
      // Stop the timer on error
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    } finally {
      setIsGenerating(false)
      setShowFeedback(true)
    }
  }

  // Confetti animation
  const triggerConfetti = () => {
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)

      // Since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      })
    }, 250)
  }

  // Copy generated script to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode)
    // Show notification
    setShowCopiedNotification(true)
    // Hide after 2 seconds
    setTimeout(() => setShowCopiedNotification(false), 2000)
  }

  // Handle user feedback
  const giveFeedback = (positive: boolean) => {
    setFeedbackGiven(true)
    if (positive) {
      setShowRefinePrompt(false)
    } else {
      setShowRefinePrompt(true)
    }
  }

  // Handle refinement submission with token usage settings
  const submitRefinement = async () => {
    if (!refinePrompt.trim() || !apiKey) return

    setIsGenerating(true)
    setGeneratedCode("")
    setGeneratedExplanation("")
    setShowFeedback(false)
    setFeedbackGiven(false)
    setShowRefinePrompt(false)
    setError(null)
    
    // Reset and start elapsed time counter
    setElapsedTime(0)
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    try {
      // Prepare a more specific prompt that includes the refinement request
      const refinementPrompt = `Original request: ${inputValue}\n\nRefinement needed: ${refinePrompt}\n\nPlease generate an improved script that addresses the refinement.`;
      
      // Call the Gemini API to generate the refined script with token usage settings
      const result = await generateScript(refinementPrompt, apiKey, selectedModel, {
        includeHelper: includeGeminiHelper,
        includeSampleCode: includeSampleCode
      })
      
      // Stop the timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      
      if (result.success) {
        // Trim the generated code to remove any extra whitespace at the beginning or end
        const trimmedCode = (result.code || "").trim()
        setGeneratedCode(trimmedCode)
        setGeneratedExplanation(result.explanation || "")
        // Trigger confetti animation on success
        triggerConfetti()
        // Automatically copy to clipboard
        navigator.clipboard.writeText(trimmedCode)
        // Show notification
        setShowCopiedNotification(true)
        // Hide after 2 seconds
        setTimeout(() => setShowCopiedNotification(false), 2000)
      } else {
        setError(result.error || "Failed to generate refined script. Please try again.")
      }
    } catch (error) {
      console.error("Error refining script:", error)
      setError("An unexpected error occurred while refining the script. Please try again.")
      
      // Stop the timer on error
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    } finally {
      setIsGenerating(false)
      setShowFeedback(true)
    }
  }

  // Function to prepare code for display
  const prepareCodeForDisplay = (code: string) => {
    if (!code) return { displayedCode: [], totalLines: 0 };
    
    // Split the code into lines and filter out any trailing empty lines
    const lines = code.split('\n');
    const trimmedLines = [...lines];
    
    // Remove empty lines from the end
    while (trimmedLines.length > 0 && trimmedLines[trimmedLines.length - 1].trim() === '') {
      trimmedLines.pop();
    }
    
    const totalLines = trimmedLines.length;
    
    return {
      displayedCode: trimmedLines,
      totalLines
    };
  };
  
  // Simple highlighter function for JavaScript syntax
  const highlightCode = (line: string, lineNumber: number): React.ReactNode => {
    // Colors based on theme
    const colors = {
      keyword: 'text-purple-300',
      string: 'text-green-300',
      comment: 'text-gray-500',
      function: 'text-yellow-300',
      number: 'text-blue-300',
      property: 'text-cyan-300',
      operator: 'text-red-300',
      variable: 'text-gray-300',
    };

    // Simple patterns (this is a basic implementation)
    if (line.trim().startsWith('//')) {
      return <span className={colors.comment}>{line}</span>;
    }

    // Replace keywords
    const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'new', 'this'];
    
    // Simple highlighting for strings
    if (line.includes('"') || line.includes("'")) {
      // This is a very simplistic approach - a real syntax highlighter would be more robust
      const stringRegex = /(["'])(.*?)\1/g;
      
      // Create parts with unique identifiers based on line number and position
      const parts = line.split(stringRegex);
      
      return (
        <span>
          {parts.map((part, i) => {
            const uniqueKey = `line-${lineNumber}-part-${i}`;
            
            // Every third part is a string (considering capturing groups)
            if (i % 3 === 2) {
              return <span key={uniqueKey} className={colors.string}>{part}</span>;
            } 
            
            if (i % 3 === 1) {
              // This is the quote character
              return <span key={uniqueKey} className={colors.string}>{part}</span>;
            }
            
            // Keywords in non-string parts
            const wordParts = part.split(/\b/);
            
            return (
              <span key={uniqueKey}>
                {wordParts.map((word, j) => {
                  const wordKey = `line-${lineNumber}-part-${i}-word-${j}`;
                  
                  if (keywords.includes(word)) {
                    return <span key={wordKey} className={colors.keyword}>{word}</span>;
                  }
                  return <span key={wordKey}>{word}</span>;
                })}
              </span>
            );
          })}
        </span>
      );
    }

    // Keywords only highlighting if no strings
    const wordParts = line.split(/\b/);
    
    return (
      <span>
        {wordParts.map((word, j) => {
          const wordKey = `line-${lineNumber}-word-${j}`;
          
          if (keywords.includes(word)) {
            return <span key={wordKey} className={colors.keyword}>{word}</span>;
          }
          return <span key={wordKey}>{word}</span>;
        })}
      </span>
    );
  };

  // Toggle settings panel
  const toggleSettings = () => {
    setShowSettings(!showSettings)
  }

  const handleSaveToDrive = async () => {
    if (!generatedCode || !googleAccessToken) {
      setDriveSaveError("Not logged in to Google or no script generated.");
      // Clear any previous success message
      setDriveSaveSuccess(null);
      return;
    }

    setIsSavingToDrive(true);
    setDriveSaveSuccess(null);
    setDriveSaveError(null);
    setSavedScriptDriveId(null); // Reset this as well
    // Clear publish states when starting a new save
    setPublishSuccess(null);
    setPublishError(null);
    setDeploymentDetails(null);

    // Create a sanitized file name from the input prompt
    const sanitizedInput = inputValue.substring(0, 40).replace(/[^\w\s.-]/gi, '').trim() || "Untitled";
    const fileName = `VibeCoder - ${sanitizedInput}.gs`;

    try {
      const response = await fetch("/api/appscript/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptContent: generatedCode,
          accessToken: googleAccessToken,
          fileName: fileName
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDriveSaveSuccess(`Script '${data.name}' saved! View on Drive: <a href="${data.webViewLink}" target="_blank" rel="noopener noreferrer" class="underline text-blue-600 hover:text-blue-800">Open Script</a>`);
        setSavedScriptDriveId(data.fileId || data.scriptId);
      } else {
        let errorMessage = data.error || "Unknown error saving to Drive.";
        // Check for specific error messages or statuses that indicate token expiry
        if (data.needsReAuth || (response.status === 401 && (typeof data.error === 'string' && (data.error.toLowerCase().includes("token expired") || data.error.toLowerCase().includes("invalid token"))))) {
            setDriveSaveError("Your Google session has expired. Please log out and log back in to continue.");
            handleGoogleLogout(); // Automatically log out user
        } else {
          setDriveSaveError(errorMessage);
        }
      }
    } catch (err: any) {
      console.error("Save to Drive error:", err);
      setDriveSaveError("An unexpected error occurred while saving: " + err.message);
    } finally {
      setIsSavingToDrive(false);
    }
  };

  const handlePublishScript = async () => {
    if (!savedScriptDriveId || !googleAccessToken) {
      setPublishError("No script saved to Drive or not logged in to Google.");
      setPublishSuccess(null); // Clear any previous success
      return;
    }

    setIsPublishing(true);
    setPublishSuccess(null);
    setPublishError(null);
    setDeploymentDetails(null);

    try {
      const response = await fetch("/api/appscript/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptId: savedScriptDriveId,
          accessToken: googleAccessToken,
          description: `Published from VibeCoder - ${inputValue.substring(0, 30).replace(/[^\w\s.-]/gi, '') || 'User Script'} on ${new Date().toLocaleDateString()}`
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDeploymentDetails(data);
        let message = `Script version ${data.versionNumber} published! Deployment ID: ${data.deploymentId}.`;
        if (data.deploymentUrl) {
          message += ` Web App URL: <a href="${data.deploymentUrl}" target="_blank" rel="noopener noreferrer" class="underline text-blue-600 hover:text-blue-800">${data.deploymentUrl}</a>`;
        }
        setPublishSuccess(message);
      } else {
        let errorDetail = "";
        if (data.details) {
          try {
            errorDetail = typeof data.details === 'string' ? data.details : JSON.stringify(data.details);
          } catch (e) {
            errorDetail = String(data.details);
          }
        }
        let errorMessage = `Publish failed: ${data.error || 'Unknown error'}. ${errorDetail}`;
        if (data.needsReAuth || (response.status === 401 && (typeof data.error === 'string' && (data.error.toLowerCase().includes("token expired") || data.error.toLowerCase().includes("invalid token"))))) {
          setPublishError("Your Google session has expired. Please log out and log back in to continue publishing.");
          handleGoogleLogout(); // Automatically log out user
        } else {
          setPublishError(errorMessage);
        }
      }
    } catch (err: any) {
      console.error("Publish script error:", err);
      setPublishError("An unexpected error occurred during publishing: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#FFFAF5] flex flex-col">
      <header className="border-b border-[#FF6B35]/20 p-3 md:p-4">
        <div className="container max-w-7xl mx-auto px-4 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Blocks className="h-8 w-8 text-[#FF6B35]" />
            <h1 className="text-2xl font-bold text-[#FF6B35]">VibeCoder</h1>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-3" // Increased gap slightly for new elements
          >
            {isGoogleLoggedIn && googleUser && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                {googleUser.picture ? (
                  <img src={googleUser.picture} alt="User" className="w-7 h-7 rounded-full" />
                ) : (
                  <UserCircle className="w-6 h-6 text-gray-600" />
                )}
                <span>{googleUser.name || googleUser.email}</span>
              </div>
            )}
            {isGoogleLoggedIn ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoogleLogout}
                className="border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35]/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleGoogleLogin}
                className="bg-[#4285F4] hover:bg-[#4285F4]/90 text-white" // Google Blue
              >
                <LogIn className="mr-2 h-4 w-4" />
                Login with Google
              </Button>
            )}
            {apiKey && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setApiKeyModalOpen(true)}
                className="text-[#FF6B35] hover:bg-[#FF6B35]/10"
                title="Gemini API Key Settings"
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Gemini API Key Settings</span>
              </Button>
            )}
            {/* Removed redundant "View Docs" button, assuming it's not the primary action here */}
          </motion.div>
        </div>
      </header>

      <main className="flex-1 container max-w-7xl mx-auto px-4 py-6 md:py-12 space-y-6 md:space-y-12">
        {/* Display Global Error Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {showOnboarding && !apiKey ? ( // Ensure onboarding only shows if API key is missing
            <motion.div
              key="onboarding"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="max-w-md mx-auto"
            >
              <ApiKeyModal isOpen={true} onClose={() => setShowOnboarding(false)} onSave={saveApiKey} initialApiKey="" isOnboarding={true} />
            </motion.div>
          ) : (
            <motion.div
              key="main-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-8 md:space-y-12"
            >
              {/* Conditional rendering for main prompt UI based on Google Login for certain features */}
              {/* For now, we assume Google Login is not a strict prerequisite for using the core Gemini functionality */}
              {/* If it were, we might wrap the following section with: `isGoogleLoggedIn ? (...) : (<GoogleLoginPrompt />)` */}
              
              <motion.div
                className="text-center space-y-2 md:space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
              >
                <h2 className="text-3xl md:text-5xl font-bold text-[#FF6B35]">The Platform For</h2>
                <h2 className="text-3xl md:text-5xl font-bold text-[#FF6B35]">Building App Scripts.</h2>
                <p className="max-w-2xl mx-auto text-md text-gray-600">
                  Describe what you want to build, and VibeCoder will generate a ready-to-use Google App Script for you.
                  {isGoogleLoggedIn ? ` Welcome, ${googleUser?.name || googleUser?.email}!` : ' Login with Google to integrate with Drive and more.'}
                </p>
              </motion.div>

              <motion.div
                className="max-w-3xl mx-auto"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                <div className="relative bg-white rounded-xl shadow-lg border border-[#FF6B35]/20 overflow-hidden">
                  <div className="absolute inset-0 bg-[#FFFAF5] bg-opacity-50 backdrop-blur-sm z-0">
                    <div
                      className="w-full h-full opacity-10"
                      style={{
                        backgroundImage: "radial-gradient(#FF6B35 1px, transparent 1px)",
                        backgroundSize: "24px 24px",
                      }}
                    />
                  </div>

                  <div className="relative z-10 p-6 md:p-8">
                    <AnimatePresence mode="wait">
                      {!generatedCode && !isGenerating && (
                        <motion.form
                          onSubmit={handleSubmit}
                          key="input-form"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-4"
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-center space-x-4">
                              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
                                Describe what you want to build
                              </label>
                              <div className="flex items-center flex-shrink-0 space-x-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={toggleSettings}
                                  className="text-gray-600 hover:text-[#FF6B35]"
                                >
                                  <Settings className="h-4 w-4 mr-1" />
                                  Settings
                                </Button>
                                <div className="flex items-center">
                                  <span className="text-sm text-gray-600 mr-2">Model:</span>
                                  <ModelSelector 
                                    selectedModel={selectedModel}
                                    onModelChange={handleModelChange}
                                    disabled={isGenerating}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Token Usage Settings */}
                            <AnimatePresence>
                              {showSettings && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="bg-[#FFF5EB] border border-[#FF6B35]/20 rounded-md p-3 mb-2"
                                >
                                  <h3 className="text-sm font-medium text-gray-800 mb-2">Token Usage Settings</h3>
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center">
                                      <input
                                        type="checkbox"
                                        id="includeHelper"
                                        checked={includeGeminiHelper}
                                        onChange={(e) => setIncludeGeminiHelper(e.target.checked)}
                                        className="mr-2 h-4 w-4 text-[#FF6B35] focus:ring-[#FF6B35]"
                                      />
                                      <label htmlFor="includeHelper" className="text-sm text-gray-700">
                                        Include Gemini Helper (enables AI capabilities in generated code)
                                      </label>
                                    </div>
                                    <div className="flex items-center">
                                      <input
                                        type="checkbox"
                                        id="includeSampleCode"
                                        checked={includeSampleCode}
                                        onChange={(e) => setIncludeSampleCode(e.target.checked)}
                                        className="mr-2 h-4 w-4 text-[#FF6B35] focus:ring-[#FF6B35]"
                                      />
                                      <label htmlFor="includeSampleCode" className="text-sm text-gray-700">
                                        Include Sample Code (provides better examples but uses more tokens)
                                      </label>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Disabling these options reduces token usage and speeds up generation, but may affect code quality for complex requests.
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Idea Chips */}
                            <IdeaChips 
                              onSelectIdea={handleIdeaSelect} 
                              customIdeas={dynamicIdeas}
                              isLoading={isLoadingIdeas}
                            />

                            <div className="relative">
                              <Textarea
                                ref={textareaRef}
                                id="prompt"
                                placeholder="e.g., Create a script that automatically sorts data in columns A-C whenever new data is added"
                                className="min-h-[90px] border-[#FF6B35]/30 focus:border-[#FF6B35] focus:ring-[#FF6B35] transition-colors duration-300 pr-16"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                              />
                              <div className="absolute bottom-3 right-3">
                                <div className="group relative">
                                  <VoiceInput 
                                    onTranscript={(text) => {
                                      // Append or set text based on current input
                                      setInputValue((prev) => prev ? `${prev} ${text}` : text);
                                      
                                      // Flash animation to indicate voice input captured
                                      if (textareaRef.current) {
                                        textareaRef.current.classList.add("bg-[#FFF5EB]");
                                        setTimeout(() => {
                                          textareaRef.current?.classList.remove("bg-[#FFF5EB]");
                                        }, 300);
                                      }
                                    }}
                                    disabled={isGenerating}
                                  />
                                  <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                    <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-md">
                                      Click to use voice input
                                      <div className="absolute bottom-0 right-3 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button 
                            type="submit" 
                            className="w-full bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
                            disabled={!inputValue.trim() || !apiKey}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Generate App Script
                          </Button>
                        </motion.form>
                      )}

                      {isGenerating && (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="py-12 flex flex-col items-center justify-center"
                        >
                          <div className="relative">
                            <motion.div
                              className="absolute inset-0 flex items-center justify-center"
                              animate={{
                                rotate: [0, 360],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "linear",
                              }}
                            >
                              <Blocks className="h-16 w-16 text-[#FF6B35]/30" />
                            </motion.div>
                            <motion.div
                              animate={{
                                scale: [1, 1.1, 1],
                                rotate: [0, 5, 0, -5, 0],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "easeInOut",
                              }}
                            >
                              <Blocks className="h-16 w-16 text-[#FF6B35]" />
                            </motion.div>
                          </div>
                          <motion.p
                            className="mt-6 text-lg font-medium text-[#FF6B35]"
                            animate={{
                              opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "easeInOut",
                            }}
                          >
                            {showRefinePrompt ? "Refining your App Script..." : "Building your App Script..."}
                          </motion.p>
                          <motion.div
                            className="mt-4 flex space-x-1"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                          >
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="w-3 h-3 rounded-full bg-[#FF6B35]"
                                animate={{
                                  scale: [1, 1.5, 1],
                                  opacity: [0.3, 1, 0.3],
                                }}
                                transition={{
                                  duration: 1,
                                  repeat: Number.POSITIVE_INFINITY,
                                  delay: i * 0.2,
                                  ease: "easeInOut",
                                }}
                              />
                            ))}
                          </motion.div>
                          <div className="mt-4 text-sm text-gray-600">
                            Time elapsed: {elapsedTime} seconds
                          </div>
                        </motion.div>
                      )}

                      {generatedCode && !isGenerating && (
                        <motion.div
                          key="result"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-6"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">Generated App Script</h3>
                            <div className="flex items-center gap-2">
                              <AnimatePresence>
                                {showCopiedNotification && (
                                  <motion.span
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="text-green-600 text-sm flex items-center"
                                  >
                                    <Check className="w-4 h-4 mr-1" /> Copied!
                                  </motion.span>
                                )}
                              </AnimatePresence>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={copyToClipboard}
                                className="text-[#FF6B35] border-[#FF6B35] hover:bg-[#FF6B35]/10"
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy to Clipboard
                              </Button>

                              {isGoogleLoggedIn && googleAccessToken && (
                                <Button
                                  variant="default" // Or "outline" depending on desired prominence
                                  size="sm"
                                  onClick={handleSaveToDrive}
                                  disabled={isSavingToDrive || !generatedCode}
                                  className="bg-green-600 hover:bg-green-700 text-white" // Example styling
                                >
                                  {isSavingToDrive ? "Saving..." : "Save to Google Drive"}
                                  {/* Optionally add a Drive icon */}
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Drive Save Feedback */}
                          {driveSaveSuccess && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm"
                            >
                              <p dangerouslySetInnerHTML={{ __html: driveSaveSuccess }} />
                            </motion.div>
                          )}
                          {driveSaveError && (
                             <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm"
                            >
                              {driveSaveError}
                            </motion.div>
                          )}
                          
                          {/* Publish Script Button and Feedback */}
                          {isGoogleLoggedIn && savedScriptDriveId && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <Button
                                variant="outline" // Or "default"
                                size="sm"
                                onClick={handlePublishScript}
                                disabled={isPublishing}
                                className="border-blue-600 text-blue-600 hover:bg-blue-50" // Example styling
                              >
                                <Sparkles className="mr-2 h-4 w-4" /> {/* Example Icon */}
                                {isPublishing ? "Publishing..." : "Publish Script"}
                              </Button>

                              {publishSuccess && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="mt-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded text-sm"
                                >
                                  <p dangerouslySetInnerHTML={{ __html: publishSuccess }} />
                                </motion.div>
                              )}
                              {publishError && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="mt-2 bg-orange-50 border border-orange-200 text-orange-700 px-3 py-2 rounded text-sm"
                                >
                                  {publishError}
                                </motion.div>
                              )}
                            </div>
                          )}


                          {/* Global Error (from Gemini generation, etc.) */}
                          {error && !driveSaveError && !publishError && ( // Avoid showing duplicate errors
                            <div className="bg-red-50 border border-red-100 text-red-600 rounded-md p-3 mb-4">
                              <p className="flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                {error}
                              </p>
                            </div>
                          )}

                          {/* Code section */}
                          <div className="relative bg-gray-900 rounded-md overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                              <div className="flex items-center">
                                <div className="flex space-x-1.5">
                                  <div className="w-3 h-3 rounded-full bg-red-500" />
                                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                  <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                                <p className="ml-4 text-sm text-gray-400">app-script.gs</p>
                              </div>
                              <p className="text-xs text-gray-500">
                                {prepareCodeForDisplay(generatedCode).totalLines} lines of code
                              </p>
                            </div>
                            
                            <div className="max-h-[500px] overflow-auto">
                              <div className="flex min-w-full">
                                <div className="flex-none w-12 pr-1 text-right select-none bg-gray-800 pt-4 pb-4 text-xs text-gray-500">
                                  {prepareCodeForDisplay(generatedCode).displayedCode.map((_line, lineNumber) => {
                                    // Create a stable key using a deterministic string
                                    const lineKey = `line-number-${lineNumber}`;
                                    return (
                                      <div key={lineKey} className="leading-5 py-0.5">
                                        {lineNumber + 1}
                                      </div>
                                    );
                                  })}
                                </div>
                                <pre className="p-4 pl-2 text-sm text-gray-300 overflow-visible flex-1">
                                  <code>
                                    {prepareCodeForDisplay(generatedCode).displayedCode.map((line, lineNumber) => {
                                      // Create a stable key for each code line
                                      const codeKey = `code-line-${lineNumber}`;
                                      return (
                                        <div key={codeKey} className="leading-5">
                                          {highlightCode(line, lineNumber)}
                                        </div>
                                      );
                                    })}
                                  </code>
                                </pre>
                              </div>
                            </div>
                          </div>

                          {/* Explanation section */}
                          {generatedExplanation && (
                            <div className="bg-[#FFFAF5] border border-[#FF6B35]/20 rounded-md p-4">
                              <h3 className="font-medium text-gray-900 mb-3">How to Use This Script:</h3>
                              <div className="prose prose-sm max-w-none prose-headings:font-medium prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:my-3 prose-strong:text-gray-800 prose-code:text-[#FF6B35] prose-code:bg-[#FFF5EB] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-normal prose-li:my-1">
                                <ReactMarkdown>{generatedExplanation}</ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {showFeedback && !feedbackGiven && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                              className="border-t border-gray-200 pt-4"
                            >
                              <p className="text-sm text-gray-700 mb-2">Was this script helpful?</p>
                              <div className="flex space-x-2">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => giveFeedback(true)}
                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                  >
                                    <ThumbsUp className="mr-2 h-4 w-4" />
                                    Yes, it's great!
                                  </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => giveFeedback(false)}
                                    className="text-[#FF6B35] border-[#FF6B35] hover:bg-[#FF6B35]/10"
                                  >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Refine it
                                  </Button>
                                </motion.div>
                              </div>
                            </motion.div>
                          )}

                          {showRefinePrompt && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                              className="border-t border-gray-200 pt-4"
                            >
                              <div className="bg-[#FFF5EB] border border-[#FF6B35]/30 rounded-lg p-4 mb-4">
                                <div className="flex items-start">
                                  <Sparkles className="h-5 w-5 text-[#FF6B35] mt-0.5 mr-2 flex-shrink-0" />
                                  <p className="text-sm text-gray-700">
                                    Let's make your script even better! Tell us what you'd like to improve or add.
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <motion.div
                                  initial={{ scale: 0.95, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: 0.1 }}
                                >
                                  <Textarea
                                    placeholder="Please provide details on what needs to be improved..."
                                    className="min-h-[120px] border-[#FF6B35]/30 focus:border-[#FF6B35] focus:ring-[#FF6B35]"
                                    value={refinePrompt}
                                    onChange={(e) => setRefinePrompt(e.target.value)}
                                  />
                                </motion.div>
                                <motion.div
                                  initial={{ scale: 0.95, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: 0.2 }}
                                >
                                  <Button
                                    onClick={submitRefinement}
                                    disabled={!refinePrompt.trim()}
                                    className="w-full bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
                                  >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Refine Script
                                  </Button>
                                </motion.div>
                              </div>
                            </motion.div>
                          )}

                          {feedbackGiven && !showRefinePrompt && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="border-t border-gray-200 pt-4 text-center"
                            >
                              <p className="text-green-600">Thanks for your feedback!</p>
                            </motion.div>
                          )}

                          <div className="flex justify-center pt-2">
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setGeneratedCode("")
                                setGeneratedExplanation("")
                                setInputValue("")
                                setShowFeedback(false)
                                setFeedbackGiven(false)
                                setShowRefinePrompt(false)
                                setError(null)
                              }}
                              className="text-[#FF6B35] hover:bg-[#FF6B35]/10"
                            >
                              Create Another Script
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-[#FF6B35]/20 py-4">
        <div className="container max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Code className="h-5 w-5 text-[#FF6B35]" />
            <p className="text-sm text-gray-600">VibeCoder - Built with care by ixigo — and open to all.</p>
          </motion.div>
          <motion.div
            className="mt-4 md:mt-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <p className="text-sm text-gray-500">Powered by <a href="https://twitter.com/cohnen">@cohnen</a></p>
          </motion.div>
        </div>
      </footer>

      {/* API Key Modal for updating the key later */}
      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        onSave={updateApiKey}
        initialApiKey={apiKey || ""}
        isOnboarding={false}
      />
    </div>
  )
}
