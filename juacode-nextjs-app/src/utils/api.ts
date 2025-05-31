// juacode-nextjs-app/src/utils/api.ts

// Define basic types for chat data, can be expanded based on actual data structure
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatData {
  chat_id?: string;
  title: string;
  messages: Message[];
  user_id?: string;
  last_model_used?: string;
  created_at?: string; 
  updated_at?: string;
}

interface UpdateData {
  title?: string;
  messages?: Message[];
  last_model_used?: string;
}

interface AuthHeaders {
  'Content-Type': string;
  'Authorization'?: string;
}

/**
 * Get the authorization headers for API requests
 */
export const getAuthHeaders = (): AuthHeaders => {
  const headers: AuthHeaders = {
    'Content-Type': 'application/json',
  };
  // Ensure localStorage is accessed only on the client side
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
    }
  }
  return headers;
};

/**
 * Make an authenticated API request
 */
export const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const authHeaders = getAuthHeaders();
  
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, requestOptions);
    
    
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('userData');
        localStorage.removeItem('isAuthenticated');
        // Redirect to login page. 
        // This is a utility function, so direct navigation might be tricky.
        // Throwing an error is often better, to be handled by the calling component/context.
        // window.location.href = '/login'; // Avoid direct navigation from utility if possible
      }
      // This error should be caught by the calling component or context (e.g., AuthContext)
      // which can then decide to redirect the user.
      throw new Error('Authentication required. Please log in again.');
    }
    
    return response;
  } catch (error) {
    // If it's the specific auth error, rethrow it for AuthContext to handle logout redirection.
    if (error instanceof Error && error.message.includes('Authentication required')) {
      throw error; 
    }
    // For other errors, throw a generic or the original error.
    throw new Error(`API request to ${url} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Fetch user-specific chats
 */
export const fetchUserChats = async (): Promise<ChatData[]> => {
  try {
    const response = await makeAuthenticatedRequest('/api/chats', {
      method: 'GET',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const responseBody = await response.json();
    // The API returns an object like { message: '...', chats: [], count: 0 }
    // We need to return the 'chats' property.
    if (responseBody && Array.isArray(responseBody.chats)) {
      return responseBody.chats as ChatData[];
    } else {
      // This case should ideally not happen if the API is consistent.
      // Log an error and return an empty array or throw a more specific error.
      return []; // Or throw new Error('Invalid chat data format from API');
    }
  } catch (error) {
    throw error;
  }
};

/* Create a new chat */
export const createChat = async (chatData: ChatData): Promise<any> => { // Return type can be more specific
  try {
    const response = await makeAuthenticatedRequest('/api/chats', {
      method: 'POST',
      body: JSON.stringify(chatData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update a chat
 */
export const updateChat = async (chatId: string, updateData: UpdateData): Promise<any> => { // Return type can be more specific
  try {
    const response = await makeAuthenticatedRequest(`/api/chats/${chatId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a chat
 */
export const deleteChat = async (chatId: string): Promise<boolean> => {
  try {
    const response = await makeAuthenticatedRequest(`/api/chats/${chatId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    // For DELETE, often a 204 No Content is returned, or a success message.
    // We can assume true if response.ok, or parse a specific success from response if available.
    return true; 
  } catch (error) {
    throw error;
  }
};

/**
 * Summarize chat title
 */
export const summarizeChatTitle = async (chatId: string): Promise<{ title: string }> => {
  try {
    const response = await makeAuthenticatedRequest(`/api/chats/${chatId}`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data as { title: string }; // Type assertion
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch the current authenticated user's data
 */
export const fetchCurrentUser = async (): Promise<any> => { // Replace 'any' with a more specific User type if available
  try {
    const response = await makeAuthenticatedRequest('/api/users/me', {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    throw error; // Rethrow to be handled by the caller
  }
};

/**
 * Generate AI response for chat messages
 */
interface GeneratePayload {
    messages: Message[];
    model_variant?: string; // e.g., 'normal', 'creative'
    selected_model: string; // e.g., 'deepseek-chat', 'gemini-2.5-pro-preview-05-06'
}

export const generateChatResponse = async (
    payload: GeneratePayload,
    init: RequestInit = {}
): Promise<Response> => {
    // Use makeAuthenticatedRequest to ensure the call to /api/generate is authenticated.
    try {
        const requestOptions: RequestInit = {
            method: 'POST',
            headers: {
                // 'Content-Type' is handled by makeAuthenticatedRequest
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload),
            ...init
        };
        const response = await makeAuthenticatedRequest('/api/generate', requestOptions);

        // makeAuthenticatedRequest already checks for response.ok and handles 401.
        // If we are here, response should be ok.
        // However, the original function threw an error if !response.ok, 
        // makeAuthenticatedRequest does this too, but for 401 it has specific behavior.
        // We might want to ensure any non-2xx status is still an error here if not a 401 handled by logout.
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }
        return response; // Return the raw response for the caller to handle streaming
    } catch (error) {
        // If makeAuthenticatedRequest threw an 'Authentication required' error, it should be re-thrown
        // for AuthContext to handle logout. Other errors are also re-thrown.
        throw error;
    }
}; 