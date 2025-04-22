const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterBtn = document.getElementById('show-register');
const cancelRegisterBtn = document.getElementById('cancel-register');
const loginBox = document.getElementById('login-box');
const registerBox = document.getElementById('register-box');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');

const newName = document.getElementById('new-name');
const newEmail = document.getElementById('new-email');
const newPassword = document.getElementById('new-password');
const confirmPassword = document.getElementById('confirm-password');

document.addEventListener('DOMContentLoaded', () => {
  initUIHandlers();
  checkSession();
});

const initUIHandlers = () => {
  showRegisterBtn?.addEventListener('click', showRegisterForm);
  cancelRegisterBtn?.addEventListener('click', cancelRegisterForm);
  loginForm?.addEventListener('submit', handleLogin);
  registerForm?.addEventListener('submit', handleRegister);
};

const showRegisterForm = () => {
  registerBox?.classList.remove('hidden');
  loginBox?.classList.add('hidden');
};

const cancelRegisterForm = () => {
  registerBox?.classList.add('hidden');
  registerForm?.reset();
  registerError?.classList.add('hidden');
  loginBox?.classList.remove('hidden');
};

const handleLogin = e => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const user = getUsers().find(
    u => u.email === email && u.password === password
  );

  if (user) {
    createSession(user);
    redirectToHome();
  } else {
    document.getElementById('login-error')?.classList.remove('hidden');
  }
};

const handleRegister = e => {
  e.preventDefault();

  const name = newName?.value.trim();
  const email = newEmail?.value.trim();
  const password = newPassword?.value;
  const confirmPass = confirmPassword?.value;

  resetFormErrors();

  const { valid } = validateRegistration(
    name,
    email,
    password,
    confirmPass
  );

  if (!valid) return;

  const newUser = {
    name,
    email,
    password,
    createdAt: new Date().toISOString()
  };

  saveUser(newUser);
  createEmptyTaskList(email);
  createSession(newUser);
  redirectToHome();
};

const validateRegistration = (name, email, password, confirmPassword) => {
  let valid = true;

  if (!name) {
    showError('new-name', 'El nombre no puede estar vacío');
    valid = false;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('new-email', 'Introduce un correo válido');
    valid = false;
  }

  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password)) {
    showError(
      'new-password',
      'La contraseña debe tener al menos 6 caracteres, incluyendo letras y números'
    );
    valid = false;
  }

  if (password !== confirmPassword) {
    showError('confirm-password', 'Las contraseñas no coinciden');
    valid = false;
  }

  if (getUsers().some(u => u.email === email)) {
    showError('new-email', 'El correo ya está en uso');
    valid = false;
  }

  return { valid };
};

const getUsers = () => {
  return JSON.parse(localStorage.getItem('users')) || [];
};

const saveUser = user => {
  const users = getUsers();
  users.push(user);
  localStorage.setItem('users', JSON.stringify(users));
};

const createEmptyTaskList = email => {
  localStorage.setItem(`tasks_${email}`, JSON.stringify({ tasks: [] }));
};

const createSession = user => {
  const session = {
    email: user.email,
    name: user.name,
    isLoggedIn: true,
    timestamp: new Date().getTime()
  };
  sessionStorage.setItem('session', JSON.stringify(session));
};

const checkSession = () => {
  const session = JSON.parse(sessionStorage.getItem('session'));
  if (session?.isLoggedIn) {
    redirectToHome();
  }
};

const showError = (inputId, message) => {
  const input = document.getElementById(inputId);
  const error = document.getElementById(`error-${inputId}`);
  input?.classList.add('wrong');
  if (error) {
    error.textContent = message;
    error.classList.remove('hidden');
  }
};

const resetFormErrors = () => {
  document
    .querySelectorAll('.form-control')
    .forEach(input => input.classList.remove('wrong'));
  [
    'error-new-name',
    'error-new-email',
    'error-new-password',
    'error-confirm-password'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '';
      el.classList.add('hidden');
    }
  });
  registerError?.classList.add('hidden');
};

const redirectToHome = () => {
  window.location.href = '../index.html';
};
