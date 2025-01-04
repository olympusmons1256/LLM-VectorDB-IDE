// components/ContextManager.tsx
import { useState } from 'react'
import { Upload, FileUp, Loader2 } from 'lucide-react'
import { processDocument } from '@/services/embedding'
import type { EmbeddingConfig } from '@/services/embedding'

interface ContextManagerProps {
  config: EmbeddingConfig
  onError: (error: string) => void
}

export function ContextManager({ config, onError }: ContextManagerProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    try {
      const text = await file.text()
      await processDocument(text, config)
      // Clear the input
      e.target.value = ''
    } catch (error: any) {
      onError(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="p-4 border-b dark:border-gray-700">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Context Manager</h2>
        <div className="flex items-center gap-2">
          <label 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg 
                     ${isProcessing 
                       ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed' 
                       : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
                     } text-white transition-colors`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileUp className="h-5 w-5" />
                Upload Document
              </>
            )}
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
              accept=".txt,.md,.json,.csv"
            />
          </label>
        </div>
      </div>
    </div>
  )
}