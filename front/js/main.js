import { loadCurrentWeather } from './weather.js';
import { loadNews } from './news.js';

// Variables globales
let tasks = [];
let currentUser = null;
let socket = null;
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

    // Inicializar WebSocket
    initWebSocket();

    // Cargar tareas
    await loadTasks();

    // Cargar datos del clima
    loadCurrentWeather('Madrid');

    // Cargar noticias
    loadNews();

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
    titleElement.textContent = `Tareas de ${currentUser.name}`;

    // Mostrar avatar si existe
    const avatarElement = document.getElementById('avatar');
    if (currentUser.avatar) {
      avatarElement.style.backgroundImage = `url(${API_URL}${currentUser.avatar})`;
    } else {
      // Mostrar iniciales si no hay avatar
      avatarElement.textContent = getInitials(currentUser.name);
    }
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    throw error;
  }
}

// Inicializar WebSocket
function initWebSocket() {
  // Crear conexión WebSocket
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//localhost:3000`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('Conectado al servidor WebSocket');
  };

  socket.onmessage = event => {
    const data = JSON.parse(event.data);
    console.log('Mensaje WebSocket recibido:', data);

    // Manejar diferentes tipos de mensajes
    switch (data.type) {
      case 'TASK_CREATED':
      case 'TASK_UPDATED':
        handleTaskUpdate(data.payload);
        break;
      case 'TASK_DELETED':
        handleTaskDelete(data.payload.id);
        break;
      case 'PHOTO_UPLOADED':
      case 'PHOTO_DELETED':
        // Recargar tareas para reflejar cambios en fotos
        loadTasks();
        break;
    }
  };

  socket.onclose = () => {
    console.log('Desconectado del servidor WebSocket');
    // Intentar reconectar después de 5 segundos
    setTimeout(initWebSocket, 5000);
  };

  socket.onerror = error => {
    console.error('Error en WebSocket:', error);
  };
}

// Cargar tareas desde la API
async function loadTasks() {
  try {
    const response = await fetch(`${API_URL}/tasks`, {
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

// Crear elemento HTML para una tarea
function createTaskElement(task) {
  const taskElement = document.createElement('div');
  taskElement.className = `task priority-${task.priority}`;
  taskElement.dataset.id = task._id;

  // Calcular días restantes
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

  // Crear contenido HTML
  taskElement.innerHTML = `
    <div class="task-header">
      <div class="task-priority">
        <span class="priority-dot priority-${task.priority}"></span>
        <span>${capitalizeFirstLetter(task.priority)}</span>
      </div>
      <div class="task-actions">
        <button class="task-action edit-task" title="Editar">
          <i class="fas fa-edit"></i>
        </button>
        <button class="task-action delete-task" title="Eliminar">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
    <h3 class="task-title">${task.title}</h3>
    <p class="task-description">${task.description || 'Sin descripción'}</p>
    <div class="task-footer">
      <div class="task-date ${
        daysLeft < 0 ? 'overdue' : daysLeft === 0 ? 'today' : ''
      }">
        <i class="far fa-calendar"></i>
        <span>${daysLeftText}</span>
      </div>
      <div class="task-tags">
        ${task.tags
          .map(tag => `<span class="tag tag-${tag}">${tag}</span>`)
          .join('')}
      </div>
    </div>
  `;

  // Agregar eventos
  const editBtn = taskElement.querySelector('.edit-task');
  const deleteBtn = taskElement.querySelector('.delete-task');

  editBtn.addEventListener('click', () => openEditTaskModal(task));
  deleteBtn.addEventListener('click', () => openDeleteTaskModal(task._id));

  return taskElement;
}

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
}

// Abrir modal para editar tarea
function openEditTaskModal(task) {
  // Llenar formulario con datos de la tarea
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-description').value = task.description || '';
  document.getElementById('task-date').value = formatDateForInput(task.dueDate);
  document.getElementById('task-status').value = task.status;
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
  document.getElementById('modal-title').textContent = 'Editar tarea';

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
    // Validar formulario
    if (!validateTaskForm()) {
      return;
    }

    // Obtener datos del formulario
    const taskId = modal.dataset.taskId;
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const dueDate = document.getElementById('task-date').value;
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
    handleTaskDelete(taskId);
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

// Manejar actualización de tarea desde WebSocket
function handleTaskUpdate(task) {
  // Buscar si la tarea ya existe en el array
  const index = tasks.findIndex(t => t._id === task._id);

  if (index !== -1) {
    // Actualizar tarea existente
    tasks[index] = task;
  } else {
    // Agregar nueva tarea
    tasks.push(task);
  }

  // Renderizar tareas
  renderTasks();
}

// Manejar eliminación de tarea desde WebSocket
function handleTaskDelete(taskId) {
  // Eliminar tarea del array
  tasks = tasks.filter(task => task._id !== taskId);

  // Renderizar tareas
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
  const newsSearchForm = document.getElementById('news-search-form');
  if (newsSearchForm) {
    newsSearchForm.addEventListener('submit', e => {
      e.preventDefault();
      const query = document.getElementById('news-search').value.trim();
      if (query) {
        loadNews(query);
      }
    });
  }

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
