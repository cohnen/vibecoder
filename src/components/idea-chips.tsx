import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Loader2, ArrowLeft, ArrowRight } from "lucide-react"

interface IdeaChip {
  id: string
  shortDescription: string
  longDescription: string
  category: string
}

interface IdeaChipsProps {
  onSelectIdea: (idea: string) => void
  customIdeas?: Array<{short: string; long: string}>
  isLoading?: boolean
}

// Mock data for idea chips
const mockIdeas: IdeaChip[] = [
  {
    id: "1",
    shortDescription: "Email Automation",
    longDescription:
      "Create a script that automatically sends personalized emails to a list of recipients from a spreadsheet. The email should include their name, company, and a custom message based on their role.",
    category: "automation",
  },
  {
    id: "2",
    shortDescription: "Data Cleaner",
    longDescription:
      "Build a script that cleans data in a spreadsheet by removing duplicates, fixing formatting issues, and standardizing text entries like names, addresses, and phone numbers.",
    category: "data",
  },
  {
    id: "3",
    shortDescription: "Calendar Scheduler",
    longDescription:
      "Create a script that automatically schedules events in Google Calendar based on data in a spreadsheet. Include functionality to avoid scheduling conflicts and send notifications.",
    category: "calendar",
  },
  {
    id: "4",
    shortDescription: "Invoice Generator",
    longDescription:
      "Develop a script that generates PDF invoices based on order data in a spreadsheet. The invoice should include company logo, line items, taxes, and payment information.",
    category: "finance",
  },
  {
    id: "5",
    shortDescription: "Form Response Handler",
    longDescription:
      "Create a script that processes Google Form responses, categorizes them based on specific criteria, and sends automated follow-up emails to respondents based on their answers.",
    category: "forms",
  },
  {
    id: "6",
    shortDescription: "Inventory Tracker",
    longDescription:
      "Build an inventory management script that tracks stock levels, sends alerts when items are low, and generates purchase orders automatically based on predefined thresholds.",
    category: "inventory",
  },
  {
    id: "7",
    shortDescription: "Project Dashboard",
    longDescription:
      "Create a script that generates a visual dashboard from project data in a spreadsheet. Include progress bars, status indicators, and deadline trackers that update automatically.",
    category: "reporting",
  },
  {
    id: "8",
    shortDescription: "Expense Approver",
    longDescription:
      "Develop a script that routes expense reports for approval, sends reminder emails to approvers, and updates status in the spreadsheet when approved or rejected.",
    category: "workflow",
  },
]

export default function IdeaChips({ onSelectIdea, customIdeas = [], isLoading = false }: IdeaChipsProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visibleIdeas, setVisibleIdeas] = useState<IdeaChip[]>([])
  const [dynamicIdeasChips, setDynamicIdeasChips] = useState<IdeaChip[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const VISIBLE_COUNT = 3 // Number of visible chips at once
  
  // Process custom ideas into idea chips format
  useEffect(() => {
    if (customIdeas.length > 0) {
      const processedIdeas = customIdeas.map((idea, index) => ({
        id: `dynamic-${index}`,
        shortDescription: idea.short,
        longDescription: idea.long,
        category: 'custom'
      }));
      setDynamicIdeasChips(processedIdeas);
    }
  }, [customIdeas]);

  // Select ideas to display based on currentIndex
  useEffect(() => {
    const ideasToUse = dynamicIdeasChips.length > 0 ? dynamicIdeasChips : mockIdeas;
    
    // If we have fewer ideas than visible count, just show all of them
    if (ideasToUse.length <= VISIBLE_COUNT) {
      setVisibleIdeas(ideasToUse);
      return;
    }
    
    // Otherwise, get ideas starting from currentIndex with wrap-around
    const newVisibleIdeas = [];
    for (let i = 0; i < VISIBLE_COUNT; i++) {
      const idx = (currentIndex + i) % ideasToUse.length;
      newVisibleIdeas.push(ideasToUse[idx]);
    }
    
    setVisibleIdeas(newVisibleIdeas);
  }, [dynamicIdeasChips, currentIndex]);

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (isLoading || isPaused) return;
    
    const ideasToUse = dynamicIdeasChips.length > 0 ? dynamicIdeasChips : mockIdeas;
    
    // Only set up auto-slide if we have more ideas than visible count
    if (ideasToUse.length <= VISIBLE_COUNT) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % ideasToUse.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [dynamicIdeasChips, isLoading, isPaused]);

  const handleIdeaClick = (idea: IdeaChip) => {
    onSelectIdea(idea.longDescription);
  };

  const handlePrev = () => {
    const ideasToUse = dynamicIdeasChips.length > 0 ? dynamicIdeasChips : mockIdeas;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + ideasToUse.length) % ideasToUse.length);
  };

  const handleNext = () => {
    const ideasToUse = dynamicIdeasChips.length > 0 ? dynamicIdeasChips : mockIdeas;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % ideasToUse.length);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        {isLoading ? (
          <Loader2 className="h-4 w-4 text-[#FF6B35] animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 text-[#FF6B35]" />
        )}
        <h3 className="text-sm font-medium text-gray-700">
          {isLoading 
            ? "Loading ideas..." 
            : "Need inspiration? Try one of these ideas:"}
        </h3>
      </div>

      <div className="flex items-center gap-2">
        {/* Left arrow */}
        {(dynamicIdeasChips.length > 0 ? dynamicIdeasChips.length : mockIdeas.length) > VISIBLE_COUNT && (
          <button 
            type="button"
            onClick={handlePrev}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500 flex-shrink-0"
            aria-label="Previous ideas"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        
        {/* Chips container */}
        <div 
          ref={containerRef}
          className="flex items-center gap-2 overflow-hidden relative min-h-[36px] flex-grow"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <AnimatePresence mode="wait">
            {visibleIdeas.map((idea) => (
              <motion.div
                key={idea.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{
                  duration: 0.3,
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                }}
                onClick={() => handleIdeaClick(idea)}
                className="flex-shrink-0 cursor-pointer bg-[#FFF5EB] hover:bg-[#FFE8D1] border border-[#FF6B35]/20 rounded-full px-3 py-1 text-sm text-[#FF6B35] transition-colors duration-200 flex items-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>{idea.shortDescription}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Right arrow */}
        {(dynamicIdeasChips.length > 0 ? dynamicIdeasChips.length : mockIdeas.length) > VISIBLE_COUNT && (
          <button 
            type="button"
            onClick={handleNext}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500 flex-shrink-0"
            aria-label="Next ideas"
          >
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
