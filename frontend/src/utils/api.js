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
    console.log('Fetching user chats from: /api/chats');
    const response = await makeAuthenticatedRequest('/api/chats', {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching chats:', error);
    throw error;
  }
};

/**
 * Create a new chat
 */
export const createChat = async (chatData) => {
  try {
    console.log('Creating chat at: /api/chats');
    const response = await makeAuthenticatedRequest('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
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
    console.log(`Updating chat at: /api/chats/${chatId}`);
    const response = await makeAuthenticatedRequest(`/api/chats/${chatId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
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
    console.log(`Deleting chat at: /api/chats/${chatId}`);
    const response = await makeAuthenticatedRequest(`/api/chats/${chatId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return true;
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
    console.log(`Summarizing chat at: /api/chats/${chatId}/summarize`);
    const response = await makeAuthenticatedRequest(`/api/chats/${chatId}/summarize`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error summarizing chat title:', error);
    throw error;
  }
}; 