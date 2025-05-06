// Variables globales
let currentUser = null;

// URL base para la API
const API_URL = 'http://localhost:3000/api';

// Elementos DOM
const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profileRole = document.getElementById('profile-role');
const profileAvatar = document.getElementById('profile-avatar');

const editProfileBtn = document.getElementById('edit-profile');
const changePasswordBtn = document.getElementById('change-password');
const changeAvatarBtn = document.getElementById('change-avatar');
const logoutBtn = document.getElementById('logout');
const deleteBtn = document.getElementById('delete');

const editProfileModal = document.getElementById('edit-profile-modal');
const changePasswordModal = document.getElementById('change-password-modal');
const changeAvatarModal = document.getElementById('change-avatar-modal');
const deleteAccountModal = document.getElementById('user-delete-modal');
const deleteAccountBtn = document.getElementById('user-confirm-delete');

const editProfileForm = document.getElementById('edit-profile-form');
const changePasswordForm = document.getElementById('change-password-form');
const changeAvatarForm = document.getElementById('change-avatar-form');

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', async () => {
  // Verificar si hay un token en localStorage
  const token = localStorage.getItem('token');
  if (!token) {
    // Redirigir a la página de login si no hay token
    window.location.href = 'login.html';
    return;
  }

  try {
    // Obtener información del usuario actual
    await getCurrentUser();

    // Cargar estadísticas
    await loadStats();

    // Configurar eventos
    setupEventListeners();
  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);

    // Si hay un error de autenticación, redirigir al login
    if (error.status === 401) {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    }
  }
});

// Obtener información del usuario actual
async function getCurrentUser() {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw { status: response.status, message: 'Error al obtener usuario' };
    }

    const data = await response.json();
    currentUser = data.data.user;

    // Actualizar UI con información del usuario
    profileName.textContent = currentUser.name;
    profileEmail.textContent = currentUser.email;
    profileRole.textContent =
      currentUser.role === 'admin' ? 'Administrador' : 'Usuario';

    // Mostrar avatar si existe
    if (currentUser.avatar) {
      console.log('Avatar del usuario:', currentUser.avatar);
      // Verificar si la ruta del avatar es una URL completa o una ruta relativa
      const avatarUrl = currentUser.avatar.startsWith('http')
        ? currentUser.avatar
        : `${API_URL}${currentUser.avatar}`;

      console.log('Intentando cargar avatar desde:', avatarUrl);

      // Intentar cargar la imagen, si falla, intentar con una ruta alternativa
      const img = new Image();
      img.onload = () => {
        console.log('Avatar cargado correctamente');
        profileAvatar.style.backgroundImage = `url(${avatarUrl})`;
        profileAvatar.textContent = '';
      };
      img.onerror = () => {
        profileAvatar.textContent = getInitials(currentUser.name);
      };
      img.src = avatarUrl;
    } else {
      // Mostrar iniciales si no hay avatar
      profileAvatar.textContent = getInitials(currentUser.name);
    }
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    throw error;
  }
}

// Cargar estadísticas del usuario
async function loadStats() {
  try {
    // Cargar estadísticas de tareas
    const tasksResponse = await fetch(`${API_URL}/tasks`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!tasksResponse.ok) {
      throw new Error('Error al cargar tareas');
    }

    const tasksData = await tasksResponse.json();
    const tasks = tasksData.data.tasks;

    // Contar tareas por estado
    const completedTasks = tasks.filter(
      task => task.status === 'completed'
    ).length;
    const progressTasks = tasks.filter(
      task => task.status === 'progress'
    ).length;
    const pendingTasks = tasks.filter(task => task.status === 'pending').length;

    // Actualizar contadores
    document.getElementById('completed-tasks-count').textContent =
      completedTasks;
    document.getElementById('progress-tasks-count').textContent = progressTasks;
    document.getElementById('pending-tasks-count').textContent = pendingTasks;

    // Cargar estadísticas de eventos
    const eventsResponse = await fetch(`${API_URL}/events`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!eventsResponse.ok) {
      throw new Error('Error al cargar eventos');
    }

    const eventsData = await eventsResponse.json();
    const events = eventsData.data.events;

    // Contar eventos
    document.getElementById('events-count').textContent = events.length;
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
  }
}

// Configurar eventos
function setupEventListeners() {
  // Botón para editar perfil
  editProfileBtn.addEventListener('click', openEditProfileModal);

  // Botón para cambiar contraseña
  changePasswordBtn.addEventListener('click', openChangePasswordModal);

  // Botón para cambiar avatar
  changeAvatarBtn.addEventListener('click', openChangeAvatarModal);

  // Botón para cerrar sesión
  logoutBtn.addEventListener('click', logout);

  // Botón para eliminar sesión
  deleteBtn.addEventListener('click', openDeleteAccountModal);

  deleteAccountBtn.addEventListener('click', deleteAccount);

  // Formulario para editar perfil
  editProfileForm.addEventListener('submit', updateProfile);

  // Formulario para cambiar contraseña
  changePasswordForm.addEventListener('submit', changePassword);

  // Formulario para cambiar avatar
  changeAvatarForm.addEventListener('submit', changeAvatar);

  // Botones para cerrar modales
  document
    .getElementById('close-edit-profile')
    .addEventListener('click', () => {
      editProfileModal.classList.add('hidden');
    });

  document
    .getElementById('cancel-edit-profile')
    .addEventListener('click', () => {
      editProfileModal.classList.add('hidden');
    });

  document
    .getElementById('close-change-password')
    .addEventListener('click', () => {
      changePasswordModal.classList.add('hidden');
    });

  document
    .getElementById('cancel-change-password')
    .addEventListener('click', () => {
      changePasswordModal.classList.add('hidden');
    });

  document
    .getElementById('close-change-avatar')
    .addEventListener('click', () => {
      changeAvatarModal.classList.add('hidden');
    });

  document
    .getElementById('cancel-change-avatar')
    .addEventListener('click', () => {
      changeAvatarModal.classList.add('hidden');
    });

  document
    .getElementById('user-cancel-delete')
    .addEventListener('click', () => {
      deleteAccountModal.classList.add('hidden');
    });

  // Previsualizar avatar
  document
    .getElementById('avatar-file')
    .addEventListener('change', previewAvatar);

  // Botones de administración (solo para administradores)
  if (currentUser && currentUser.role === 'admin') {
    document.getElementById('manage-users').addEventListener('click', () => {
      // Implementar gestión de usuarios
      alert('Funcionalidad de gestión de usuarios en desarrollo');
    });

    document.getElementById('manage-tasks').addEventListener('click', () => {
      // Implementar gestión de tareas
      alert('Funcionalidad de gestión de tareas en desarrollo');
    });

    document.getElementById('manage-events').addEventListener('click', () => {
      // Implementar gestión de eventos
      alert('Funcionalidad de gestión de eventos en desarrollo');
    });

    document.getElementById('manage-photos').addEventListener('click', () => {
      // Implementar gestión de fotos
      alert('Funcionalidad de gestión de fotos en desarrollo');
    });
  }

  // Cerrar modales al hacer clic fuera
  window.addEventListener('click', e => {
    if (e.target === editProfileModal) {
      editProfileModal.classList.add('hidden');
    }
    if (e.target === changePasswordModal) {
      changePasswordModal.classList.add('hidden');
    }
    if (e.target === changeAvatarModal) {
      changeAvatarModal.classList.add('hidden');
    }
    if (e.target === deleteAccountModal) {
      deleteAccountModal.classList.add('hidden');
    }
  });
}

// Abrir modal para editar perfil
function openEditProfileModal() {
  // Llenar formulario con datos actuales
  document.getElementById('edit-name').value = currentUser.name;

  // Limpiar mensajes de error
  document.getElementById('error-name').textContent = '';

  // Mostrar modal
  editProfileModal.classList.remove('hidden');
}

// Abrir modal para cambiar contraseña
function openChangePasswordModal() {
  // Limpiar formulario
  changePasswordForm.reset();

  // Limpiar mensajes de error
  document.getElementById('error-current-password').textContent = '';
  document.getElementById('error-new-password').textContent = '';
  document.getElementById('error-confirm-new-password').textContent = '';

  // Mostrar modal
  changePasswordModal.classList.remove('hidden');
}

// Abrir modal para cambiar avatar
function openChangeAvatarModal() {
  // Limpiar formulario
  changeAvatarForm.reset();

  // Limpiar previsualización
  document.getElementById('avatar-preview').style.backgroundImage = '';
  document.getElementById('avatar-preview').textContent = '';

  // Limpiar mensajes de error
  document.getElementById('error-avatar-file').textContent = '';

  // Mostrar modal
  changeAvatarModal.classList.remove('hidden');
}

const openDeleteAccountModal = () => {
  deleteAccountModal.classList.remove('hidden');
};

// Actualizar perfil
async function updateProfile(e) {
  e.preventDefault();

  try {
    const name = document.getElementById('edit-name').value.trim();

    // Validar nombre
    if (!name) {
      document.getElementById('error-name').textContent =
        'El nombre es obligatorio';
      return;
    }

    // Enviar solicitud para actualizar perfil
    const response = await fetch(`${API_URL}/users/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      throw new Error('Error al actualizar perfil');
    }

    const data = await response.json();

    // Actualizar datos del usuario
    currentUser = data.data.user;

    // Actualizar UI
    profileName.textContent = currentUser.name;

    // Actualizar avatar si muestra iniciales
    if (!currentUser.avatar) {
      profileAvatar.textContent = getInitials(currentUser.name);
    }

    // Cerrar modal
    editProfileModal.classList.add('hidden');
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    document.getElementById('error-name').textContent =
      'Error al actualizar perfil';
  }
}

// Cambiar contraseña
async function changePassword(e) {
  e.preventDefault();

  try {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById(
      'confirm-new-password'
    ).value;

    // Validar contraseña actual
    if (!currentPassword) {
      document.getElementById('error-current-password').textContent =
        'La contraseña actual es obligatoria';
      return;
    }

    // Validar nueva contraseña
    if (!newPassword) {
      document.getElementById('error-new-password').textContent =
        'La nueva contraseña es obligatoria';
      return;
    }

    if (newPassword.length < 6) {
      document.getElementById('error-new-password').textContent =
        'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    // Validar confirmación
    if (newPassword !== confirmNewPassword) {
      document.getElementById('error-confirm-new-password').textContent =
        'Las contraseñas no coinciden';
      return;
    }

    // Enviar solicitud para cambiar contraseña
    const response = await fetch(`${API_URL}/users/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Error al cambiar contraseña');
    }

    // Cerrar modal
    changePasswordModal.classList.add('hidden');
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);

    if (error.message === 'Contraseña actual incorrecta') {
      document.getElementById('error-current-password').textContent =
        'Contraseña actual incorrecta';
    } else {
      document.getElementById('error-current-password').textContent =
        'Error al cambiar contraseña';
    }
  }
}

// Previsualizar avatar
function previewAvatar(e) {
  const file = e.target.files[0];

  if (!file) {
    return;
  }

  // Validar tipo de archivo
  if (!file.type.startsWith('image/')) {
    document.getElementById('error-avatar-file').textContent =
      'El archivo debe ser una imagen';
    return;
  }

  // Validar tamaño (máximo 2MB)
  if (file.size > 2 * 1024 * 1024) {
    document.getElementById('error-avatar-file').textContent =
      'La imagen no debe superar los 2MB';
    return;
  }

  // Limpiar error
  document.getElementById('error-avatar-file').textContent = '';

  // Previsualizar imagen
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('avatar-preview');
    preview.style.backgroundImage = `url(${e.target.result})`;
    preview.textContent = '';
  };
  reader.readAsDataURL(file);
}

// Cambiar avatar
async function changeAvatar(e) {
  e.preventDefault();

  try {
    const fileInput = document.getElementById('avatar-file');

    if (!fileInput.files || !fileInput.files[0]) {
      document.getElementById('error-avatar-file').textContent =
        'Debe seleccionar una imagen';
      return;
    }

    const file = fileInput.files[0];

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      document.getElementById('error-avatar-file').textContent =
        'El archivo debe ser una imagen';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      document.getElementById('error-avatar-file').textContent =
        'La imagen no debe superar los 5MB';
      return;
    }

    // Crear FormData
    const formData = new FormData();
    formData.append('avatar', file);

    // Enviar solicitud para cambiar avatar
    const response = await fetch(`${API_URL}/users/avatar`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Error al cambiar avatar');
    }

    const data = await response.json();

    // Actualizar datos del usuario
    currentUser = data.data.user;

    // Actualizar UI
    profileAvatar.style.backgroundImage = `url(${API_URL}${currentUser.avatar})`;
    profileAvatar.textContent = '';

    // Cerrar modal
    changeAvatarModal.classList.add('hidden');
  } catch (error) {
    console.error('Error al cambiar avatar:', error);
    document.getElementById('error-avatar-file').textContent =
      'Error al cambiar avatar';
  }
}

// Cerrar sesión
function logout() {
  // Eliminar token del localStorage
  localStorage.removeItem('token');

  // Redirigir a la página de login
  window.location.href = 'login.html';
}

const deleteAccount = async () => {
  try {
    const response = await fetch(`${API_URL}/users/me`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('No se pudo eliminar la cuenta.');
    }

    localStorage.removeItem('token');
    deleteAccountModal.classList.add('hidden');
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
    deleteAccountModal.classList.add('hidden');
  }
};

// Obtener iniciales de un nombre
function getInitials(name) {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}
