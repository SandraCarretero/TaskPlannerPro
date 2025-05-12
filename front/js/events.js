import { loadCurrentWeather } from './weather.js';
import { fetchCurrentUser, updateUIForUser } from './utils/getUser.js';

// Variables globales
let events = [];
let currentUser = null;

// URL base para la API
const API_URL = 'https://taskplannerpro-api.onrender.com/api';

// Elementos DOM
const eventsContainer = document.getElementById('events-container');
const modal = document.getElementById('event-modal');
const deleteModal = document.getElementById('delete-modal');
const addEventBtn = document.getElementById('addEvent');
const cancelBtn = document.getElementById('cancel-button');
const saveBtn = document.getElementById('save-button');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const roleFilterBtn = document.getElementById('role-filter-btn');
const roleOptions = document.getElementById('role-options');

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

const getCurrentUser = async () => {
  try {
    currentUser = await fetchCurrentUser(API_URL);
    updateUIForUser(currentUser, API_URL, 'Eventos');

    if (currentUser.role === 'admin') {
      addEventBtn.style.display = 'flex';
      roleFilterBtn.style.display = 'flex';
    }
  } catch (error) {
    console.error('Error al obtener usuario:', error);
  }
};

// Cargar eventos desde la API
const loadEvents = async () => {
  try {
    const eventUrl =
      currentUser.role === 'admin'
        ? `${API_URL}/events/admin/all`
        : `${API_URL}/events`;
    const response = await fetch(eventUrl, {
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
    filterEvents();
  } catch (error) {
    console.error('Error al cargar eventos:', error);
  }
};

const loadUsers = async (role = 'all') => {
  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) throw new Error('No se pudieron cargar los usuarios');

    const data = await response.json();
    let users = data.data.users;

    if (role !== 'all') {
      users = users.filter(user => user.role === role);
    }

    populateUserDropdown(users);
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
  }
};

const populateUserDropdown = () => {
  const userSelect = document.getElementById('event-user');
  userSelect.innerHTML = ''; // Limpiar opciones

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Selecciona un grupo';
  userSelect.appendChild(defaultOption);

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'Todos';
  userSelect.appendChild(allOption);

  const userOption = document.createElement('option');
  userOption.value = 'user';
  userOption.textContent = 'Usuarios';
  userSelect.appendChild(userOption);

  const adminOption = document.createElement('option');
  adminOption.value = 'admin';
  adminOption.textContent = 'Administradores';
  userSelect.appendChild(adminOption);
};

// Renderizar eventos
const renderEvents = () => {
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
};

// Crear elemento HTML para un evento
const createEventElement = event => {
  const userRole = currentUser.role;

  const eventCard = document.createElement('div');
  eventCard.className = 'event-card';
  eventCard.setAttribute('data-id', event._id);

  // Formatear fechas
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);

  const formattedStartDate = startDate.toLocaleDateString('es', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const formattedEndDate = endDate.toLocaleDateString('es', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Header
  const eventHeader = document.createElement('div');
  eventHeader.classList.add('event-header');

  // Nombre del evento
  const eventTitle = document.createElement('h3');
  eventTitle.classList.add('event-title');
  eventTitle.textContent = capitalizeFirstLetter(event.title);
  eventHeader.appendChild(eventTitle);

  // Fecha del evento
  const eventDate = document.createElement('div');
  eventDate.classList.add('event-date');

  const calendarIcon = document.createElement('i');
  calendarIcon.classList.add('far', 'fa-calendar');

  const dateSpan = document.createElement('span');
  const now = new Date();

  if (endDate < now) {
    dateSpan.textContent = 'Finalizado';
    eventDate.classList.add('finalizado');
  } else if (now >= startDate && now <= endDate) {
    dateSpan.textContent = 'Hoy';
    eventDate.classList.add('hoy');
  } else {
    dateSpan.textContent = `${formattedStartDate} - ${formattedEndDate}`;
  }

  eventDate.appendChild(calendarIcon);
  eventDate.appendChild(dateSpan);

  // Botones solo si es admin
  if (userRole === 'admin') {
    const eventActions = document.createElement('div');
    eventActions.classList.add('event-actions');

    const editButton = document.createElement('button');
    editButton.classList.add('event-action', 'edit-event');
    editButton.setAttribute('title', 'Editar');
    editButton.innerHTML = '<i class="fas fa-edit"></i>';

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('event-action', 'delete-event');
    deleteButton.setAttribute('title', 'Eliminar');
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';

    editButton.addEventListener('click', () => openEditEventModal(event));
    deleteButton.addEventListener('click', () =>
      openDeleteEventModal(event._id)
    );

    eventActions.appendChild(editButton);
    eventActions.appendChild(deleteButton);
    eventHeader.appendChild(eventActions);
  }

  // Descripción del evento
  const eventDescription = document.createElement('p');
  eventDescription.classList.add('event-description');
  eventDescription.textContent =
    capitalizeFirstLetter(event.description) || 'Sin descripción';

  // Footer (opcional: para añadir etiquetas u otros detalles en el futuro)
  const eventFooter = document.createElement('div');
  eventFooter.classList.add('event-footer');
  eventFooter.appendChild(eventDate);

  // Ensamblar tarjeta
  eventCard.appendChild(eventHeader);
  eventCard.appendChild(eventDescription);
  eventCard.appendChild(eventFooter);

  return eventCard;
};

// Abrir modal para crear nuevo evento
const openNewEventModal = async () => {
  await loadUsers();

  // Limpiar formulario
  document.getElementById('event-title').value = '';
  document.getElementById('event-description').value = '';
  document.getElementById('event-start-date').value = '';
  document.getElementById('event-end-date').value = '';
  document.getElementById('event-user').value = '';
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
};

// Abrir modal para editar evento
const openEditEventModal = async event => {
  await loadUsers();

  // Llenar formulario con datos del evento
  document.getElementById('event-title').value = event.title;
  document.getElementById('event-description').value = event.description || '';
  document.getElementById('event-start-date').value = formatDateTimeForInput(
    event.startDate
  );
  document.getElementById('event-end-date').value = formatDateTimeForInput(
    event.endDate
  );
  document.getElementById('event-user').value = event.targetGroup;
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
};

// Abrir modal para confirmar eliminación
const openDeleteEventModal = eventId => {
  deleteModal.classList.remove('hidden');
  deleteModal.dataset.eventId = eventId;
};

// Guardar evento (crear o actualizar)
const saveEvent = async () => {
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
    const targetGroup = document.getElementById('event-user').value;
    const location = document.getElementById('event-location').value;

    // Crear objeto con datos del evento
    const eventData = {
      title,
      description,
      startDate,
      endDate,
      targetGroup,
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
};

// Eliminar evento
const deleteEvent = async eventId => {
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
    events = events.filter(event => event._id !== eventId);
    renderEvents();
  } catch (error) {
    console.error('Error al eliminar evento:', error);
  }
};

// Validar formulario de evento
const validateEventForm = () => {
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

  // Validar usuarios
  const userInput = document.getElementById('event-user');
  const userError = document.getElementById('error-user');

  if (!userInput.value) {
    userError.textContent = 'Asigna un grupo';
    isValid = false;
  } else {
    userError.textContent = '';
  }

  return isValid;
};

const filterEvents = () => {
  let filteredEvents = [...events]; // Crear una copia del array original
  const selectedRole =
    document
      .querySelector('.role-options li.active')
      ?.getAttribute('data-role') || 'all';

  // Filtrar eventos basados en el rol seleccionado
  if (selectedRole !== 'all') {
    filteredEvents = events.filter(event => event.targetGroup === selectedRole);
  }

  // Renderizar eventos filtrados
  renderFilteredEvents(filteredEvents);
};

// Función para renderizar eventos filtrados
const renderFilteredEvents = filteredEvents => {
  // Limpiar contenedor
  eventsContainer.innerHTML = '';

  if (filteredEvents.length === 0) {
    eventsContainer.innerHTML =
      '<p class="no-events">No hay eventos para este filtro</p>';
    return;
  }

  // Ordenar eventos por fecha
  filteredEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  // Agrupar eventos por mes
  const eventsByMonth = {};

  filteredEvents.forEach(event => {
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
};

// Configurar eventos
const setupEventListeners = () => {
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

  document.addEventListener('click', e => {
    if (
      !e.target.closest('#role-filter-btn') &&
      !e.target.closest('#role-options')
    ) {
      roleOptions.classList.add('hidden');
    }
  });

  // Filtrar eventos
  roleFilterBtn.addEventListener('click', () => {
    roleOptions.classList.toggle('hidden');
  });

  document.querySelectorAll('#role-options li').forEach(option => {
    option.addEventListener('click', function () {
      // Remover la clase active de todas las opciones
      document
        .querySelectorAll('#role-options li')
        .forEach(opt => opt.classList.remove('active'));

      // Agregar la clase active a la opción seleccionada
      this.classList.add('active');

      // Ocultar el menú de opciones
      roleOptions.classList.add('hidden');

      // Filtrar los eventos según la selección
      filterEvents();
    });
  });

  document
    .querySelector('#role-options li[data-role="all"]')
    .classList.add('active');
};

// Funciones de utilidad

// Formatear fecha y hora para input type="datetime-local"
const formatDateTimeForInput = dateString => {
  const date = new Date(dateString);
  return date.toISOString().slice(0, 16);
};

const capitalizeFirstLetter = string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};
