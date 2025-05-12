const API_URL = import.meta.env.VITE_API_URL;

const authenticatedFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    throw new Error('No token found');
  }

  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`
  };

  const response = await fetch(url, options);
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    }
    const message = await response.text();
    throw new Error(`HTTP error ${response.status}: ${message}`);
  }
  return await response.json();
};

export const fetchCurrentUser = async () => {
  return await authenticatedFetch(`${API_URL}/users`);
};

// Events
export const fetchEvents = async (isAdmin = false) => {
  const url = isAdmin ? `${API_URL}/events/admin/all` : `${API_URL}/events`;
  return await authenticatedFetch(url);
};

export const createEvent = async eventData => {
  return await authenticatedFetch(`${API_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  });
};

export const updateEvent = async (eventId, eventData) => {
  return await authenticatedFetch(`${API_URL}/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  });
};

export const deleteEvent = async eventId => {
  return await authenticatedFetch(`${API_URL}/events/${eventId}`, {
    method: 'DELETE'
  });
};

export const fetchUsers = async () => {
  return await authenticatedFetch(`${API_URL}/users`);
};

// Tasks
export const fetchTasks = async (isAdmin = false) => {
  const url = isAdmin ? `${API_URL}/tasks/admin/all` : `${API_URL}/tasks`;
  return await authenticatedFetch(url);
};

export const createTask = async taskData => {
  return await authenticatedFetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData)
  });
};

export const updateTask = async (taskId, taskData) => {
  return await authenticatedFetch(`${API_URL}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData)
  });
};

export const updateTaskStatus = async (taskId, status) => {
  return await authenticatedFetch(`${API_URL}/tasks/${taskId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
};

export const deleteTask = async taskId => {
  return await authenticatedFetch(`${API_URL}/tasks/${taskId}`, {
    method: 'DELETE'
  });
};
