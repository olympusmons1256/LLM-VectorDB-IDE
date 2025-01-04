// types/message.ts
export interface Message {
  role: 'user' | 'assistant'
  content: string
  tools?: Array<{
    type: 'code'
    language: string
    code: string
  }>
}

export interface APIKeys {
  anthropic?: string
  openai?: string
}

export interface ModelOption {
  provider: 'anthropic' | 'openai'
  id: string
  name: string
}