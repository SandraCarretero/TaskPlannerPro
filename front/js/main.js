import { loadCurrentWeather } from './weather.js';
// import { loadNews } from './news.js';

// Variables globales
let tasks = [];
let currentUser = null;
let selectedPriority = 'all';

// URL base para la API
const API_URL = 'http://localhost:3000/api';

// Elementos DOM
const taskColumns = {
  pending: document.querySelector('.task-column.pending .tasks'),
  progress: document.querySelector('.task-column.progress .tasks'),
  completed: document.querySelector('.task-column.completed .tasks')
};

const badgeCounts = {
  pending: document.getElementById('badge-pending'),
  progress: document.getElementById('badge-progress'),
  completed: document.getElementById('badge-completed')
};

const modal = document.getElementById('modal');
const deleteModal = document.getElementById('delete-modal');
const addTaskBtn = document.getElementById('addTask');
const addTaskMenuBtn = document.getElementById('addTaskMenu');
const cancelBtn = document.getElementById('cancel-button');
const saveBtn = document.getElementById('save-button');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const priorityFilterBtn = document.getElementById('priority-filter-btn');
const priorityOptions = document.getElementById('priority-options');
const titleElement = document.getElementById('title');

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', async () => {
  // Verificar si hay un token en localStorage
  const token = localStorage.getItem('token');
  if (!token) {
    // Redirigir a la página de login si no hay token
    window.location.href = 'html/login.html';
    return;
  }

  try {
    // Obtener información del usuario actual
    await getCurrentUser();

    // Cargar tareas
    await loadTasks();

    // Cargar datos del clima
    loadCurrentWeather('Madrid');

    // Cargar noticias
    // loadNews();

    // Configurar eventos
    setupEventListeners();
  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);

    // Si hay un error de autenticación, redirigir al login
    if (error.status === 401) {
      localStorage.removeItem('token');
      window.location.href = 'html/login.html';
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
    const firstName = currentUser.name.split(' ')[0];
    titleElement.textContent = `Tareas de ${firstName}`;

    // Mostrar avatar si existe
    const avatarElement = document.getElementById('avatar');
    if (currentUser.avatar) {
      avatarElement.style.backgroundImage = `url(${API_URL}${currentUser.avatar})`;
    } else {
      // Mostrar iniciales si no hay avatar
      avatarElement.textContent = getInitials(currentUser.name);
    }

    if (currentUser.role === 'admin') {
      addTaskBtn.style.display = 'flex';
    }
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    throw error;
  }
}

// Cargar tareas desde la API
async function loadTasks() {
  try {
    const taskUrl =
      currentUser.role === 'admin'
        ? `${API_URL}/tasks/admin/all`
        : `${API_URL}/tasks`;
    console.log(currentUser.role);

    const response = await fetch(taskUrl, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al cargar tareas');
    }

    const data = await response.json();
    tasks = data.data.tasks;

    // Limpiar columnas
    Object.values(taskColumns).forEach(column => {
      column.innerHTML = '';
    });

    // Renderizar tareas
    renderTasks();
  } catch (error) {
    console.error('Error al cargar tareas:', error);
  }
}

const loadUsers = async () => {
  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) throw new Error('No se pudieron cargar los usuarios');

    const data = await response.json();
    populateUserDropdown(data.data.users);
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
  }
};

function populateUserDropdown(users) {
  const userSelect = document.getElementById('task-user');
  userSelect.innerHTML = '<option value="">Selecciona un usuario</option>';

  users.forEach(user => {
    const option = document.createElement('option');
    option.value = user._id;
    option.textContent = user.name;
    userSelect.appendChild(option);
  });
}

// Renderizar tareas en las columnas
function renderTasks() {
  Object.values(taskColumns).forEach(column => {
    column.innerHTML = '';
  });

  // Reiniciar contadores
  const counts = {
    pending: 0,
    progress: 0,
    completed: 0
  };

  // Filtrar por prioridad si es necesario
  const filteredTasks =
    selectedPriority === 'all'
      ? tasks
      : tasks.filter(task => task.priority === selectedPriority);

  // Agrupar tareas por estado
  const tasksByStatus = {
    pending: filteredTasks.filter(task => task.status === 'pending'),
    progress: filteredTasks.filter(task => task.status === 'progress'),
    completed: filteredTasks.filter(task => task.status === 'completed')
  };

  // Renderizar cada grupo
  Object.entries(tasksByStatus).forEach(([status, statusTasks]) => {
    counts[status] = statusTasks.length;

    statusTasks.forEach(task => {
      const taskElement = createTaskElement(task);
      taskColumns[status].appendChild(taskElement);
    });
  });

  // Actualizar contadores
  Object.entries(counts).forEach(([status, count]) => {
    badgeCounts[status].textContent = count;
  });
}

const createTaskElement = task => {
  console.log(task);
  const userRole = currentUser.role;

  const taskCard = document.createElement('div');
  taskCard.className = `task priority-${task.priority}`;
  taskCard.setAttribute('data-id', task._id);

  const daysLeft = getDaysLeft(task.dueDate);
  const dueDateFormatted = new Date(task.dueDate).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  let daysLeftText;
  if (daysLeft > 0) {
    daysLeftText = `${dueDateFormatted} (${daysLeft} día${
      daysLeft !== 1 ? 's' : ''
    })`;
  } else if (daysLeft === 0) {
    daysLeftText = 'Hoy';
  } else {
    daysLeftText = `Vencida (${Math.abs(daysLeft)} día${
      Math.abs(daysLeft) !== 1 ? 's' : ''
    })`;
  }

  // Crear task-header
  const taskHeader = document.createElement('div');
  taskHeader.classList.add('task-header');

  // Prioridad
  const taskPriority = document.createElement('div');
  taskPriority.classList.add('task-priority');

  const priorityDot = document.createElement('span');
  priorityDot.classList.add('priority-dot', `priority-${task.priority}`);

  const priorityLabel = document.createElement('span');
  priorityLabel.textContent = capitalizeFirstLetter(task.priority);

  taskPriority.appendChild(priorityDot);
  taskPriority.appendChild(priorityLabel);
  taskHeader.appendChild(taskPriority);

  // Título
  const title = document.createElement('h3');
  title.classList.add('task-title');
  title.textContent = capitalizeFirstLetter(task.title);

  // Descripción
  const description = document.createElement('p');
  description.classList.add('task-description');
  description.textContent =
    capitalizeFirstLetter(task.description) || 'Sin descripción';

  // Footer
  const taskFooter = document.createElement('div');
  taskFooter.classList.add('task-footer');

  const taskDate = document.createElement('div');
  taskDate.classList.add('task-date');
  if (daysLeft < 0) {
    taskDate.classList.add('overdue');
  } else if (daysLeft === 0) {
    taskDate.classList.add('today');
  }

  taskDate.innerHTML = `<i class="far fa-calendar"></i><span>${daysLeftText}</span>`;

  const taskTags = document.createElement('div');
  taskTags.classList.add('task-tags');
  if (Array.isArray(task.tags)) {
    taskTags.innerHTML = task.tags
      .map(tag => `<span class="tag tag-${tag}">${tag}</span>`)
      .join('');
  }

  taskFooter.appendChild(taskTags);
  taskFooter.appendChild(taskDate);

  const taskActions = document.createElement('div');
  taskActions.classList.add('task-actions');

  const editButton = document.createElement('button');
  editButton.classList.add('task-action', 'edit-task');
  editButton.setAttribute('title', 'Editar');
  editButton.innerHTML = '<i class="fas fa-edit"></i>';

  editButton.addEventListener('click', () => openEditTaskModal(task));
  taskActions.appendChild(editButton);
  taskHeader.appendChild(taskActions);

  // Botones solo si es admin
  if (userRole === 'admin') {
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('task-action', 'delete-task');
    deleteButton.setAttribute('title', 'Eliminar');
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';

    // Agregar eventos
    deleteButton.addEventListener('click', () => openDeleteTaskModal(task._id));

    taskActions.appendChild(deleteButton);

    const user = task.users[0];
    console.log(user);
    const avatarImg = document.createElement('div');
    avatarImg.classList.add('avatar');
    avatarImg.classList.add('avatar-task');
    avatarImg.textContent = getInitials(user.name);

    taskFooter.appendChild(avatarImg);
  }

  // Ensamblar tarjeta
  taskCard.appendChild(taskHeader);
  taskCard.appendChild(title);
  taskCard.appendChild(description);
  taskCard.appendChild(taskFooter);

  return taskCard;
};

// Abrir modal para crear nueva tarea
function openNewTaskModal() {
  // Limpiar formulario
  document.getElementById('task-title').value = '';
  document.getElementById('task-description').value = '';
  document.getElementById('task-date').value = '';
  document.getElementById('task-status').value = '';
  document.getElementById('task-priority').value = '';

  // Deseleccionar todas las etiquetas
  document.querySelectorAll('#task-tags .tag').forEach(tag => {
    tag.classList.remove('selected');
    tag.classList.add('noselected');
  });

  // Limpiar mensajes de error
  document.querySelectorAll('.error-message').forEach(el => {
    el.textContent = '';
  });

  // Actualizar título del modal
  document.getElementById('modal-title').textContent = 'Nueva tarea';

  // Mostrar modal
  modal.classList.remove('hidden');

  // Guardar ID de tarea (null para nueva tarea)
  modal.dataset.taskId = '';

  loadUsers();
}

// Abrir modal para editar tarea
async function openEditTaskModal(task) {
  const userRole = currentUser.role;

  if (userRole === 'admin') {
    await loadUsers();
  }

  // Llenar formulario con datos de la tarea
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-description').value = task.description || '';
  document.getElementById('task-date').value = formatDateForInput(task.dueDate);
  document.getElementById('task-user').value = task.users[0]._id;
  document.getElementById('task-status').value = task.status;
  console.log(task.status);
  document.getElementById('task-priority').value = task.priority;

  // Seleccionar etiquetas
  document.querySelectorAll('#task-tags .tag').forEach(tagElement => {
    const tagValue = tagElement.dataset.tag;
    if (task.tags.includes(tagValue)) {
      tagElement.classList.add('selected');
      tagElement.classList.remove('noselected');
    } else {
      tagElement.classList.remove('selected');
      tagElement.classList.add('noselected');
    }
  });

  // Limpiar mensajes de error
  document.querySelectorAll('.error-message').forEach(el => {
    el.textContent = '';
  });

  // Actualizar título del modal
  document.getElementById('modal-title').textContent =
    userRole === 'admin' ? 'Editar tarea' : 'Actualizar estado';

  const fieldsToToggle = [
    'form-group-title',
    'form-group-date',
    'form-group-user',
    'form-group-tags',
    'form-group-description',
    'form-group-priority'
  ];

  fieldsToToggle.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.style.display = userRole === 'admin' ? 'block' : 'none';
    }
  });

  // Asegurarse de que el campo de estado siempre sea visible
  const statusField = document.getElementById('form-group-status');
  if (statusField) {
    statusField.style.display = 'block';

    if (userRole === 'user') {
      statusField.style.width = '100%';
    } else {
      statusField.style.width = '';
    }
  }

  // Mostrar modal
  modal.classList.remove('hidden');

  // Guardar ID de tarea
  modal.dataset.taskId = task._id;
}

// Abrir modal para confirmar eliminación
function openDeleteTaskModal(taskId) {
  deleteModal.classList.remove('hidden');
  deleteModal.dataset.taskId = taskId;
}

// Guardar tarea (crear o actualizar)
async function saveTask() {
  try {
    const taskId = modal.dataset.taskId;
    const userRole = currentUser.role;

    // Si es usuario regular, solo validamos el estado
    if (userRole !== 'admin') {
      const status = document.getElementById('task-status').value;
      const statusError = document.getElementById('error-status');

      if (!status) {
        statusError.textContent = 'El estado es obligatorio';
        return;
      }

      // Actualizar solo el estado
      const response = await fetch(`${API_URL}/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar estado de tarea');
      }

      // Cerrar modal
      modal.classList.add('hidden');

      // Recargar tareas
      await loadTasks();
      return;
    }

    // Para administradores, mantener la validación completa
    if (!validateTaskForm()) {
      return;
    }

    // Obtener datos del formulario
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const dueDate = document.getElementById('task-date').value;
    const users = document.getElementById('task-user').value;
    const status = document.getElementById('task-status').value;
    const priority = document.getElementById('task-priority').value;

    // Obtener etiquetas seleccionadas
    const tags = [];
    document.querySelectorAll('#task-tags .tag.selected').forEach(tag => {
      tags.push(tag.dataset.tag);
    });

    // Crear objeto con datos de la tarea
    const taskData = {
      title,
      description,
      dueDate,
      users,
      status,
      priority,
      tags
    };

    let response;

    if (taskId) {
      // Actualizar tarea existente
      response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(taskData)
      });
    } else {
      // Crear nueva tarea
      response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(taskData)
      });
    }

    if (!response.ok) {
      throw new Error('Error al guardar tarea');
    }

    // Cerrar modal
    modal.classList.add('hidden');

    // Recargar tareas
    await loadTasks();
  } catch (error) {
    console.error('Error al guardar tarea:', error);
  }
}

// Eliminar tarea
async function deleteTask(taskId) {
  try {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al eliminar tarea');
    }

    // Cerrar modal
    deleteModal.classList.add('hidden');

    // Eliminar tarea del array local
    tasks = tasks.filter(task => task._id !== taskId);
    renderTasks();
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
  }
}

// Validar formulario de tarea
function validateTaskForm() {
  let isValid = true;

  // Validar título
  const titleInput = document.getElementById('task-title');
  const titleError = document.getElementById('error-title');

  if (!titleInput.value.trim()) {
    titleError.textContent = 'El título es obligatorio';
    isValid = false;
  } else {
    titleError.textContent = '';
  }

  // Validar fecha
  const dateInput = document.getElementById('task-date');
  const dateError = document.getElementById('error-date');

  if (!dateInput.value) {
    dateError.textContent = 'La fecha es obligatoria';
    isValid = false;
  } else {
    dateError.textContent = '';
  }

  // Validar usuarios
  const userInput = document.getElementById('task-user');
  const userError = document.getElementById('error-user');

  if (!userInput.value) {
    userError.textContent = 'Asigna al menos un usuario';
    isValid = false;
  } else {
    userError.textContent = '';
  }

  // Validar estado
  const statusInput = document.getElementById('task-status');
  const statusError = document.getElementById('error-status');

  if (!statusInput.value) {
    statusError.textContent = 'El estado es obligatorio';
    isValid = false;
  } else {
    statusError.textContent = '';
  }

  // Validar prioridad
  const priorityInput = document.getElementById('task-priority');
  const priorityError = document.getElementById('error-priority');

  if (!priorityInput.value) {
    priorityError.textContent = 'La prioridad es obligatoria';
    isValid = false;
  } else {
    priorityError.textContent = '';
  }

  return isValid;
}

function handleTaskDelete(taskId) {
  // Eliminar evento del array
  tasks = tasks.filter(task => task._id !== taskId);

  // Renderizar eventos
  renderTasks();
}

// Configurar eventos
function setupEventListeners() {
  // Botón para agregar tarea
  addTaskBtn.addEventListener('click', openNewTaskModal);

  // Botón móvil para agregar tarea
  if (addTaskMenuBtn) {
    addTaskMenuBtn.addEventListener('click', openNewTaskModal);
  }

  // Botones del modal de tarea
  cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
  saveBtn.addEventListener('click', saveTask);

  // Botones del modal de eliminación
  confirmDeleteBtn.addEventListener('click', () => {
    const taskId = deleteModal.dataset.taskId;
    deleteTask(taskId);
  });

  cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.classList.add('hidden');
  });

  // Selección de etiquetas
  document.querySelectorAll('#task-tags .tag').forEach(tag => {
    tag.addEventListener('click', () => {
      tag.classList.toggle('selected');
      tag.classList.toggle('noselected');
    });
  });

  // Filtro de prioridad
  priorityFilterBtn.addEventListener('click', () => {
    priorityOptions.classList.toggle('hidden');
  });

  priorityOptions.addEventListener('click', e => {
    if (e.target.tagName === 'LI') {
      selectedPriority = e.target.dataset.priority;
      loadTasks();
      priorityOptions.classList.add('hidden');
    }
  });

  // Formulario de búsqueda de noticias
  // const newsSearchForm = document.getElementById('news-search-form');
  // if (newsSearchForm) {
  //   newsSearchForm.addEventListener('submit', e => {
  //     e.preventDefault();
  //     const query = document.getElementById('news-search').value.trim();
  //     if (query) {
  //       loadNews(query);
  //     }
  //   });
  // }

  // Cerrar modales al hacer clic fuera
  window.addEventListener('click', e => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
    if (e.target === deleteModal) {
      deleteModal.classList.add('hidden');
    }
  });

  // Cerrar menú de prioridad al hacer clic fuera
  document.addEventListener('click', e => {
    if (
      !e.target.closest('#priority-filter-btn') &&
      !e.target.closest('#priority-options')
    ) {
      priorityOptions.classList.add('hidden');
    }
  });
}

// Funciones de utilidad

// Obtener días restantes hasta una fecha
function getDaysLeft(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

// Formatear fecha para input type="date"
function formatDateForInput(dateString) {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

// Capitalizar primera letra
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Obtener iniciales de un nombre
function getInitials(name) {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}
