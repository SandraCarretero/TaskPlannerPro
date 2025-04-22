import { checkUserSession, logoutUser } from './services/authService.js';
import { renderTagSummaryCards } from './utils/taskCounter.js';

const passwordInput = document.getElementById('password');
const updateBtn = document.getElementById('update-btn');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const deleteUserBtn = document.getElementById('delete-user');
const confirmModal = document.getElementById('confirm-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const userAvatar = document.getElementById('user-avatar');
const logoutBtn = document.getElementById('logout-profile');
const editBtn = document.getElementById('edit-btn');

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

const initializeApp = () => {
  currentUser = checkUserSession();

  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  loadUserData();
  bindEventListeners();
  renderTagSummaryCards(currentUser);
};

const loadUserData = () => {
  const users = JSON.parse(localStorage.getItem('users')) || [];
  const userDetails = users.find(user => user.email === currentUser.email);

  if (userDetails) {
    usernameInput.value = userDetails.name;
    emailInput.value = userDetails.email;
    passwordInput.value = userDetails.password; 

    updateAvatar(userDetails.name);
  }
};

const updateAvatar = fullName => {
  const nameParts = fullName.split(' ');
  let initials;

  if (nameParts.length > 1) {
    initials = `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`;
  } else {
    initials = nameParts[0].charAt(0);
  }

  userAvatar.textContent = initials.toUpperCase();
};

const bindEventListeners = () => {
  editBtn.addEventListener('click', toggleEdit);
  updateBtn.addEventListener('click', handleProfileUpdate);
  deleteUserBtn.addEventListener('click', openConfirmModal);
  confirmDeleteBtn.addEventListener('click', deleteUserAccount);
  cancelDeleteBtn.addEventListener('click', closeConfirmModal);
  logoutBtn.addEventListener('click', handleLogout);
};

const toggleEdit = () => {
  const inputs = document.querySelectorAll('input');

  inputs.forEach(input => {
    input.disabled = !input.disabled;
  });

  updateBtn.disabled = !updateBtn.disabled;

  if (editBtn.textContent === 'Editar') {
    editBtn.textContent = 'Cancelar';

    passwordInput.type = 'text';
  } else {
    editBtn.textContent = 'Editar';

    inputs.forEach(input => {
      input.disabled = true;
    });
    updateBtn.disabled = true;

    passwordInput.type = 'password';
  }
};

const handleProfileUpdate = e => {
  e.preventDefault();

  const name = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!name || !email || (password && password.length < 6)) {
    alert(
      'Por favor completa todos los campos y asegúrate de que la contraseña tenga al menos 6 caracteres.'
    );
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert('Por favor ingresa un correo electrónico válido');
    return;
  }

  updateUserData(name, email, password);
};

const updateUserData = (name, email, password) => {
  const users = JSON.parse(localStorage.getItem('users')) || [];
  const oldEmail = currentUser.email;

  if (email !== oldEmail && users.some(user => user.email === email)) {
    alert('Este correo electrónico ya está en uso');
    return;
  }

  const userIndex = users.findIndex(user => user.email === oldEmail);

  if (userIndex !== -1) {
    const updatedUser = { ...users[userIndex], name, email };

    if (password) {
      updatedUser.password = password;
    }

    users[userIndex] = updatedUser;
    localStorage.setItem('users', JSON.stringify(users));

    if (email !== oldEmail) {
      const userTasks = JSON.parse(
        localStorage.getItem(`tasks_${oldEmail}`)
      ) || { tasks: [] };

      localStorage.setItem(`tasks_${email}`, JSON.stringify(userTasks));

      localStorage.removeItem(`tasks_${oldEmail}`);
    }

    const session = {
      email: email,
      name: name,
      isLoggedIn: true,
      timestamp: new Date().getTime()
    };

    sessionStorage.setItem('session', JSON.stringify(session));
    localStorage.setItem('session', JSON.stringify(session));

    updateAvatar(name);

    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
      input.disabled = true;
    });
    passwordInput.type = 'password';

    editBtn.textContent = 'Editar';
    updateBtn.disabled = true;
  }
};

const openConfirmModal = () => {
  confirmModal.classList.remove('hidden');
};

const closeConfirmModal = () => {
  confirmModal.classList.add('hidden');
};

const deleteUserAccount = () => {
  const users = JSON.parse(localStorage.getItem('users')) || [];
  const userEmail = currentUser.email;

  const updatedUsers = users.filter(user => user.email !== userEmail);

  localStorage.setItem('users', JSON.stringify(updatedUsers));

  localStorage.removeItem(`tasks_${userEmail}`);

  logoutUser();

  window.location.href = 'login.html';
};

const handleLogout = () => {
  logoutUser();
  window.location.href = 'login.html';
};
