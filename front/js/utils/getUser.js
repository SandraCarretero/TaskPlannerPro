export const fetchCurrentUser = async API_URL => {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });

  if (!response.ok) {
    throw { status: response.status, message: 'Error al obtener usuario' };
  }

  const data = await response.json();
  return data.data.user;
};

export const updateUIForUser = (user, API_URL, context = 'Tareas') => {
  const firstName = user.name.split(' ')[0];
  const titleElement = document.getElementById('title'); 
  titleElement.textContent = `${context} de ${firstName}`;

  const avatarElement = document.getElementById('avatar');
  if (user.avatar) {
    avatarElement.style.backgroundImage = `url(${API_URL}${user.avatar})`;
    avatarElement.textContent = '';
  } else {
    avatarElement.textContent = getInitials(user.name);
    avatarElement.style.backgroundImage = '';
  }
};

// Puedes exportar esta utilidad si no la tienes en otro archivo
export const getInitials = name => {
  return name
    .split(' ')
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
};
