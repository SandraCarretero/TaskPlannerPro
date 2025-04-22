import { loadCurrentWeather } from './weather.js';
import { loadNews } from './news.js';

import {
  getDOMElements,
  showElement,
  hideElement,
  updateBadgeCount,
  createTaskCardElement
} from './utils/domUtils.js';
import {
  validateTaskForm,
  getTaskFormData,
  clearTaskForm
} from './utils/formUtils.js';
import {
  loadUserTasks,
  saveUserTasks,
  getAllTasksFromDOM
} from './utils/taskStorage.js';
import {
  checkUserSession,
  getCurrentUser
} from './services/authService.js';

const TaskManager = (() => {
  let state = {
    editingTaskId: null,
    editingTaskCard: null,
    taskToDelete: null,
    currentUser: null
  };

  const init = () => {
    const elements = getDOMElements();
    bindEventListeners(elements);

    state.currentUser = checkUserSession();
    if (!state.currentUser) {
      window.location.href = 'html/login.html';
      return;
    }

    initializeUserInterface(state.currentUser, elements);
    loadUserTasks(state.currentUser).forEach(task => createTaskCard(task));
    updateBadges();

    loadCurrentWeather('Madrid');
    loadNews();
  };

  const initializeUserInterface = (user, elements) => {
    const firstName = user.name.split(' ')[0];
    elements.userNameElement.textContent = `Bienvenid@ ${firstName}`;

    const nameParts = user.name.split(' ');
    const initials =
      nameParts.length > 1
        ? `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`
        : nameParts[0].charAt(0);

    elements.avatarElement.textContent = initials.toUpperCase();
  };

  const bindEventListeners = elements => {
    elements.addButtonElement.addEventListener('click', () => openTaskModal());
    elements.addButtonMenuElement.addEventListener('click', () =>
      openTaskModal()
    );
    elements.cancelButtonElement.addEventListener('click', closeTaskModal);
    elements.saveButtonElement.addEventListener('click', saveTaskHandler);

    elements.confirmDeleteBtn.addEventListener('click', confirmDelete);
    elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);

    document.querySelectorAll('.tags-selection .tag').forEach(tag => {
      tag.addEventListener('click', () => {
        tag.classList.toggle('selected');
        tag.classList.toggle('noselected');
      });
    });

    const filterBtn = elements.filterBtn;
    const priorityOptions = elements.priorityOptions;

    filterBtn.addEventListener('click', () => {
      priorityOptions.classList.toggle('show');
    });

    priorityOptions.addEventListener('click', e => {
      if (e.target.tagName === 'LI') {
        const selectedPriority = e.target.getAttribute('data-priority');
        filterTasksByPriority(selectedPriority);
        priorityOptions.classList.remove('show');
      }
    });
  };

  const saveTaskHandler = () => {
    const elements = getDOMElements();
    if (!validateTaskForm(elements)) return;

    const taskData = getTaskFormData(
      elements,
      state.editingTaskId,
      generateTaskId
    );

    if (state.editingTaskCard) {
      state.editingTaskCard.remove();
      state.editingTaskCard = null;
    }

    if (state.editingTaskCard) {
      state.editingTaskCard.remove();
      state.editingTaskCard = null;
    }

    createTaskCard(taskData);
    persistTaskChanges();
    clearTaskForm(elements);
    closeTaskModal();
  };

  const openTaskModal = (taskData = null, taskCard = null) => {
    const elements = getDOMElements();

    if (taskData) {
      elements.modalTitleElement.textContent = 'Editar tarea';
      elements.saveButtonElement.textContent = 'Actualizar';
      state.editingTaskId = taskData.id;
      state.editingTaskCard = taskCard;

      elements.titleTask.value = taskData.title;
      elements.dateTask.value = taskData.date;
      elements.descriptionTask.value = taskData.description;
      elements.priorityTask.value = taskData.priority;
      elements.statusTask.value = taskData.status;

      document.querySelectorAll('.tags-selection .tag').forEach(tag => {
        const tagText = tag.textContent.trim().toLowerCase();
        if (taskData.tags.map(t => t.toLowerCase()).includes(tagText)) {
          tag.classList.add('selected');
          tag.classList.remove('noselected');
        } else {
          tag.classList.remove('selected');
          tag.classList.add('noselected');
        }
      });
    } else {
      elements.modalTitleElement.textContent = 'Nueva tarea';
      elements.saveButtonElement.textContent = 'Crear tarea';
      clearTaskForm(elements);
      state.editingTaskId = null;
      state.editingTaskCard = null;
    }

    showElement(elements.modalElement);
  };

  const closeTaskModal = () => {
    const elements = getDOMElements();
    hideElement(elements.modalElement);
    clearTaskForm(elements);
  };

  const openDeleteModal = (taskCard, taskId) => {
    const elements = getDOMElements();
    showElement(elements.deleteModal);
    state.taskToDelete = { taskCard, taskId };
  };

  const closeDeleteModal = () => {
    const elements = getDOMElements();
    hideElement(elements.deleteModal);
    state.taskToDelete = null;
  };

  const confirmDelete = () => {
    if (state.taskToDelete) {
      state.taskToDelete.taskCard.remove();
      persistTaskChanges();
      updateBadges();
    }
    closeDeleteModal();
  };

  const createTaskCard = taskData => {
    const taskCard = createTaskCardElement(
      taskData,
      (taskCard, id) => openTaskModal(taskData, taskCard),
      openDeleteModal
    );

    const column = document.querySelector(
      `.task-column.${taskData.status} .tasks`
    );
    if (column) {
      const allTaskCards = Array.from(column.children);
      allTaskCards.push(taskCard);
      allTaskCards.sort((a, b) => {
        const dateA = new Date(a.querySelector('.date span').textContent);
        const dateB = new Date(b.querySelector('.date span').textContent);
        return dateA - dateB; 
      });
      allTaskCards.forEach(card => column.appendChild(card));
    }
    updateBadges();
  };

  const updateBadges = () => {
    const statuses = ['pending', 'progress', 'completed'];

    statuses.forEach(status => {
      const columnTasks = document.querySelectorAll(
        `.task-column.${status} .task-card`
      );
      updateBadgeCount(`badge-${status}`, columnTasks.length);
    });
  };

  const persistTaskChanges = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const allTasks = getAllTasksFromDOM();

    allTasks.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });

    saveUserTasks(currentUser, allTasks);
  };

  const filterTasksByPriority = priority => {
    const allTasks = document.querySelectorAll('.task-card');

    allTasks.forEach(task => {
      const taskPriority = [...task.classList]
        .find(c => c.startsWith('priority-'))
        ?.replace('priority-', '');

      if (priority === 'all' || taskPriority === priority) {
        task.style.display = 'block';
      } else {
        task.style.display = 'none';
      }
    });
  };

  const generateTaskId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  return {
    init
  };
})();

document.addEventListener('DOMContentLoaded', TaskManager.init);
