// Utility functions for making authenticated API requests

/**
 * Get the authorization headers for API requests
 */
export const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('[API] Using Bearer token for authentication');
  } else {
    console.warn('[API] No access token found in localStorage');
  }
  
  return headers;
};

/**
 * Make an authenticated API request
 */
export const makeAuthenticatedRequest = async (url, options = {}) => {
  const headers = getAuthHeaders();
  
  const requestOptions = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };

  try {
    console.log(`[API] Making request to ${url}`, { method: options.method || 'GET', hasAuth: !!headers['Authorization'] });
    const response = await fetch(url, requestOptions);
    
    console.log(`[API] Response from ${url}:`, { status: response.status, ok: response.ok });
    
    // Handle authentication errors
    if (response.status === 401) {
      console.error('[API] Authentication failed - clearing auth data');
      // Token is invalid or expired, clear auth data
      localStorage.removeItem('access_token');
      localStorage.removeItem('userData');
      localStorage.removeItem('isAuthenticated');
      
      // This error will be caught by the calling component, which should handle logout
      throw new Error('Authentication required. Please log in again.');
    }
    
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

/**
 * Fetch user-specific chats
 */
export const fetchUserChats = async () => {
  try {
    const response = await makeAuthenticatedRequest('http://localhost:3000/api/chats', {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chats: ${response.status}`);
    }
    
    const data = await response.json();
    return data.chats || [];
  } catch (error) {
    console.error('Error fetching user chats:', error);
    throw error;
  }
};

/**
 * Create a new chat
 */
export const createChat = async (chatData) => {
  try {
    const response = await makeAuthenticatedRequest('http://localhost:3000/api/chats', {
      method: 'POST',
      body: JSON.stringify(chatData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create chat: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
};

/**
 * Update a chat
 */
export const updateChat = async (chatId, updateData) => {
  try {
    const response = await makeAuthenticatedRequest(`http://localhost:3000/api/chats/${chatId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update chat: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating chat:', error);
    throw error;
  }
};

/**
 * Delete a chat
 */
export const deleteChat = async (chatId) => {
  try {
    const response = await makeAuthenticatedRequest(`http://localhost:3000/api/chats/${chatId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete chat: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting chat:', error);
    throw error;
  }
};

/**
 * Summarize chat title
 */
export const summarizeChatTitle = async (chatId) => {
  try {
    const response = await makeAuthenticatedRequest(`http://localhost:3000/api/chats/${chatId}`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to summarize chat title: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error summarizing chat title:', error);
    throw error;
  }
}; 