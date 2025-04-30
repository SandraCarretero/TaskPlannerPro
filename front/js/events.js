import { loadCurrentWeather } from './weather.js';

// Variables globales
let events = [];
let currentUser = null;
let socket = null;

// URL base para la API
const API_URL = 'http://localhost:3000/api';

// Elementos DOM
const eventsContainer = document.getElementById('events-container');
const modal = document.getElementById('event-modal');
const deleteModal = document.getElementById('delete-modal');
const addEventBtn = document.getElementById('addEvent');
const cancelBtn = document.getElementById('cancel-button');
const saveBtn = document.getElementById('save-button');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const titleElement = document.getElementById('title');
const finishedFilterBtn = document.getElementById('finished-filter-btn');
const finishedOptions = document.getElementById('finished-options');

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

    // Inicializar WebSocket
    initWebSocket();

    // Cargar eventos
    await loadEvents();

    loadCurrentWeather('Madrid');

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
    titleElement.textContent = `Eventos de ${currentUser.name}`;

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
      case 'EVENT_CREATED':
      case 'EVENT_UPDATED':
        handleEventUpdate(data.payload);
        break;
      case 'EVENT_DELETED':
        handleEventDelete(data.payload.id);
        break;
      case 'PHOTO_UPLOADED':
      case 'PHOTO_DELETED':
        // Recargar eventos para reflejar cambios en fotos
        loadEvents();
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

// Cargar eventos desde la API
async function loadEvents() {
  try {
    const response = await fetch(`${API_URL}/events`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al cargar eventos');
    }

    const data = await response.json();
    events = data.data.events;

    // Renderizar eventos
    renderEvents();
  } catch (error) {
    console.error('Error al cargar eventos:', error);
  }
}

// Renderizar eventos
function renderEvents() {
  // Limpiar contenedor
  eventsContainer.innerHTML = '';

  if (events.length === 0) {
    eventsContainer.innerHTML =
      '<p class="no-events">No hay eventos programados</p>';
    return;
  }

  // Ordenar eventos por fecha
  events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  // Agrupar eventos por mes
  const eventsByMonth = {};

  events.forEach(event => {
    const date = new Date(event.startDate);
    const monthYear = `${date.getMonth()}-${date.getFullYear()}`;

    if (!eventsByMonth[monthYear]) {
      eventsByMonth[monthYear] = [];
    }

    eventsByMonth[monthYear].push(event);
  });

  // Renderizar eventos por mes
  Object.entries(eventsByMonth).forEach(([monthYear, monthEvents]) => {
    const [month, year] = monthYear.split('-');
    const monthName = new Date(
      Number.parseInt(year),
      Number.parseInt(month),
      1
    ).toLocaleString('es', { month: 'long' });

    const monthSection = document.createElement('div');
    monthSection.className = 'events-month';
    monthSection.innerHTML = `<h2>${monthName} ${year}</h2>`;

    const eventsList = document.createElement('div');
    eventsList.className = 'events-list';

    monthEvents.forEach(event => {
      const eventElement = createEventElement(event);
      eventsList.appendChild(eventElement);
    });

    monthSection.appendChild(eventsList);
    eventsContainer.appendChild(monthSection);
  });
}

// Crear elemento HTML para un evento
function createEventElement(event) {
  const eventElement = document.createElement('div');
  eventElement.className = 'event-card';
  eventElement.dataset.id = event._id;

  // Formatear fechas
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);

  const formattedStartDate = startDate.toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  const formattedEndDate = endDate.toLocaleDateString('es', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Crear contenido HTML
  eventElement.innerHTML = `
    <div class="event-header">
      <h3>${event.title}</h3>
      <div class="event-actions">
        <button class="event-action edit-event" title="Editar">
          <i class="fas fa-edit"></i>
        </button>
        <button class="event-action delete-event" title="Eliminar">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
    <div class="event-details">
      <div class="event-date">
        <i class="far fa-calendar"></i>
        <span>${formatEventDateDisplay(startDate, endDate)}</span>
      </div>
      ${
        event.location
          ? `
        <div class="event-location">
          <i class="fas fa-map-marker-alt"></i>
          <span>${event.location}</span>
        </div>
      `
          : ''
      }
      ${
        event.description
          ? `
        <div class="event-description">
          <p>${event.description}</p>
        </div>
      `
          : ''
      }
    </div>
  `;

  // Agregar eventos
  const editBtn = eventElement.querySelector('.edit-event');
  const deleteBtn = eventElement.querySelector('.delete-event');

  editBtn.addEventListener('click', () => openEditEventModal(event));
  deleteBtn.addEventListener('click', () => openDeleteEventModal(event._id));

  return eventElement;
}

function formatEventDateDisplay(startDate, endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDay = new Date(startDate);
  startDay.setHours(0, 0, 0, 0);

  const endDay = new Date(endDate);
  endDay.setHours(0, 0, 0, 0);

  // Formatear la fecha de inicio
  let formattedStartDate = startDate.toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Si la fecha de inicio es hoy, reemplazar con "hoy"
  if (startDay.getTime() === today.getTime()) {
    formattedStartDate = formattedStartDate.replace(
      startDate.toLocaleDateString('es', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }),
      'hoy'
    );
  }

  // Formatear la fecha de fin
  const formattedEndDate = endDate.toLocaleDateString('es', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Calcular días restantes o si el evento ha finalizado
  const now = new Date();

  if (now > endDate) {
    // El evento ha finalizado
    return `${formattedStartDate} - ${formattedEndDate} <span style="color: red; font-weight: bold;">finalizado</span>`;
  } else {
    // El evento está en curso o es futuro
    const daysRemaining = Math.ceil((endDay - today) / (1000 * 60 * 60 * 24));
    let daysText = '';

    if (daysRemaining > 0) {
      daysText = `(${daysRemaining} día${daysRemaining !== 1 ? 's' : ''})`;
    }

    return `${formattedStartDate} - ${formattedEndDate} ${daysText}`;
  }
}

// Abrir modal para crear nuevo evento
function openNewEventModal() {
  // Limpiar formulario
  document.getElementById('event-title').value = '';
  document.getElementById('event-description').value = '';
  document.getElementById('event-start-date').value = '';
  document.getElementById('event-end-date').value = '';
  document.getElementById('event-location').value = '';

  // Limpiar mensajes de error
  document.querySelectorAll('.error-message').forEach(el => {
    el.textContent = '';
  });

  // Actualizar título del modal
  document.getElementById('modal-title').textContent = 'Nuevo evento';

  // Mostrar modal
  modal.classList.remove('hidden');

  // Guardar ID de evento (null para nuevo evento)
  modal.dataset.eventId = '';
}

// Abrir modal para editar evento
function openEditEventModal(event) {
  // Llenar formulario con datos del evento
  document.getElementById('event-title').value = event.title;
  document.getElementById('event-description').value = event.description || '';
  document.getElementById('event-start-date').value = formatDateTimeForInput(
    event.startDate
  );
  document.getElementById('event-end-date').value = formatDateTimeForInput(
    event.endDate
  );
  document.getElementById('event-location').value = event.location || '';

  // Limpiar mensajes de error
  document.querySelectorAll('.error-message').forEach(el => {
    el.textContent = '';
  });

  // Actualizar título del modal
  document.getElementById('modal-title').textContent = 'Editar evento';

  // Mostrar modal
  modal.classList.remove('hidden');

  // Guardar ID de evento
  modal.dataset.eventId = event._id;
}

// Abrir modal para confirmar eliminación
function openDeleteEventModal(eventId) {
  deleteModal.classList.remove('hidden');
  deleteModal.dataset.eventId = eventId;
}

// Guardar evento (crear o actualizar)
async function saveEvent() {
  try {
    // Validar formulario
    if (!validateEventForm()) {
      return;
    }

    // Obtener datos del formulario
    const eventId = modal.dataset.eventId;
    const title = document.getElementById('event-title').value;
    const description = document.getElementById('event-description').value;
    const startDate = document.getElementById('event-start-date').value;
    const endDate = document.getElementById('event-end-date').value;
    const location = document.getElementById('event-location').value;

    // Crear objeto con datos del evento
    const eventData = {
      title,
      description,
      startDate,
      endDate,
      location
    };

    let response;

    if (eventId) {
      // Actualizar evento existente
      response = await fetch(`${API_URL}/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(eventData)
      });
    } else {
      // Crear nuevo evento
      response = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(eventData)
      });
    }

    if (!response.ok) {
      throw new Error('Error al guardar evento');
    }

    // Cerrar modal
    modal.classList.add('hidden');

    // Recargar eventos
    await loadEvents();
  } catch (error) {
    console.error('Error al guardar evento:', error);
  }
}

// Eliminar evento
async function deleteEvent(eventId) {
  try {
    const response = await fetch(`${API_URL}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al eliminar evento');
    }

    // Cerrar modal
    deleteModal.classList.add('hidden');

    // Eliminar evento del array local
    handleEventDelete(eventId);
  } catch (error) {
    console.error('Error al eliminar evento:', error);
  }
}

// Validar formulario de evento
function validateEventForm() {
  let isValid = true;

  // Validar título
  const titleInput = document.getElementById('event-title');
  const titleError = document.getElementById('error-title');

  if (!titleInput.value.trim()) {
    titleError.textContent = 'El título es obligatorio';
    isValid = false;
  } else {
    titleError.textContent = '';
  }

  // Validar fecha de inicio
  const startDateInput = document.getElementById('event-start-date');
  const startDateError = document.getElementById('error-start-date');

  if (!startDateInput.value) {
    startDateError.textContent = 'La fecha de inicio es obligatoria';
    isValid = false;
  } else {
    startDateError.textContent = '';
  }

  // Validar fecha de fin
  const endDateInput = document.getElementById('event-end-date');
  const endDateError = document.getElementById('error-end-date');

  if (!endDateInput.value) {
    endDateError.textContent = 'La fecha de fin es obligatoria';
    isValid = false;
  } else if (new Date(endDateInput.value) <= new Date(startDateInput.value)) {
    endDateError.textContent =
      'La fecha de fin debe ser posterior a la fecha de inicio';
    isValid = false;
  } else {
    endDateError.textContent = '';
  }

  return isValid;
}

// Manejar actualización de evento desde WebSocket
function handleEventUpdate(event) {
  // Buscar si el evento ya existe en el array
  const index = events.findIndex(e => e._id === event._id);

  if (index !== -1) {
    // Actualizar evento existente
    events[index] = event;
  } else {
    // Agregar nuevo evento
    events.push(event);
  }

  // Renderizar eventos
  renderEvents();
}

// Manejar eliminación de evento desde WebSocket
function handleEventDelete(eventId) {
  // Eliminar evento del array
  events = events.filter(event => event._id !== eventId);

  // Renderizar eventos
  renderEvents();
}

// Configurar eventos
function setupEventListeners() {
  // Botón para agregar evento
  addEventBtn.addEventListener('click', openNewEventModal);

  // Botones del modal de evento
  cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
  saveBtn.addEventListener('click', saveEvent);

  // Botones del modal de eliminación
  confirmDeleteBtn.addEventListener('click', () => {
    const eventId = deleteModal.dataset.eventId;
    deleteEvent(eventId);
  });

  cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.classList.add('hidden');
  });

  // Cerrar modales al hacer clic fuera
  window.addEventListener('click', e => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
    if (e.target === deleteModal) {
      deleteModal.classList.add('hidden');
    }
  });

  // Filtrar eventos
  finishedFilterBtn.addEventListener('click', () => {
    finishedOptions.classList.toggle('hidden');
  });
}

// Funciones de utilidad

// Formatear fecha y hora para input type="datetime-local"
function formatDateTimeForInput(dateString) {
  const date = new Date(dateString);
  return date.toISOString().slice(0, 16);
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
