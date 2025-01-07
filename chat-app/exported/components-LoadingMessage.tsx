// components/LoadingMessage.tsx
import { Loader2 } from 'lucide-react'

export function LoadingMessage() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg p-4 bg-gray-100 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>AI is thinking...</span>
        </div>
      </div>
    </div>
  )
}