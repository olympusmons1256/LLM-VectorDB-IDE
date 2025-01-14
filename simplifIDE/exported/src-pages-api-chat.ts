// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';

interface Message {
 role: 'user' | 'assistant';
 content: string;
}

interface AnthropicRequest {
 model: string;
 messages: Message[];
 system?: string;
 max_tokens?: number;
 temperature?: number;
 stop_sequences?: string[];
 stream?: boolean;
}

export default async function handler(
 req: NextApiRequest,
 res: NextApiResponse
) {
 if (req.method !== 'POST') {
   return res.status(405).json({ error: 'Method not allowed' });
 }

 const anthropicKey = process.env.ANTHROPIC_API_KEY;

 if (!anthropicKey) {
   console.error('Anthropic API key not configured');
   return res.status(500).json({ error: 'API configuration error' });
 }

 try {
   const requestBody: AnthropicRequest = req.body;
   console.log('Incoming request:', JSON.stringify(requestBody, null, 2));

   if (!requestBody.messages?.length) {
     return res.status(400).json({
       error: 'Invalid request',
       message: 'Messages array is required and cannot be empty'
     });
   }

   const response = await fetch('https://api.anthropic.com/v1/messages', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'X-Api-Key': anthropicKey,
       'anthropic-version': '2023-06-01'
     },
     body: JSON.stringify({
       model: requestBody.model || 'claude-3-sonnet-20240229',
       messages: requestBody.messages,
       system: requestBody.system,
       max_tokens: requestBody.max_tokens || 1024,
       temperature: requestBody.temperature ?? 0.7,
       stream: false
     })
   });

   if (!response.ok) {
     const errorData = await response.json();
     console.error('Anthropic API error response:', errorData);
     return res.status(response.status).json({
       error: 'Anthropic API error',
       message: errorData.error?.message || response.statusText
     });
   }

   const data = await response.json();
   return res.status(200).json(data);

 } catch (error) {
   console.error('Chat API error:', error);
   return res.status(500).json({
     error: 'Internal server error',
     message: error instanceof Error ? error.message : 'Unknown error'
   });
 }
}

export const config = {
 api: {
   bodyParser: {
     sizeLimit: '1mb',
   },
 },
};