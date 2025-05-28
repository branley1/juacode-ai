// Structure for individual messages within a chat
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Chat {
  chat_id: string;
  title: string;
  messages: ChatMessage[];
  user_id?: string | null;
  last_model_used?: string | null;
  created_at: Date;
  updated_at: Date;
}

// Create a new chat
export interface ChatCreate {
  chat_id: string;
  title: string;
  messages: ChatMessage[];
  user_id?: string | null;
  last_model_used?: string | null;
}

// Update an existing chat (e.g., title or messages)
export interface ChatUpdate {
  title?: string;
  messages?: ChatMessage[];
  last_model_used?: string | null;
} 