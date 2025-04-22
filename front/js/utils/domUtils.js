export const getDOMElements = () => {
  return {
    addButtonElement: document.getElementById('addTask'),
    addButtonMenuElement: document.getElementById('addTaskMenu'),
    modalElement: document.getElementById('modal'),
    modalTitleElement: document.getElementById('modal-title'),
    cancelButtonElement: document.getElementById('cancel-button'),
    saveButtonElement: document.getElementById('save-button'),

    titleTask: document.getElementById('task-title'),
    dateTask: document.getElementById('task-date'),
    descriptionTask: document.getElementById('task-description'),
    priorityTask: document.getElementById('task-priority'),
    statusTask: document.getElementById('task-status'),

    deleteModal: document.getElementById('delete-modal'),
    confirmDeleteBtn: document.getElementById('confirm-delete'),
    cancelDeleteBtn: document.getElementById('cancel-delete'),

    userNameElement: document.getElementById('title'),
    avatarElement: document.getElementById('avatar'),

    filterBtn: document.getElementById('priority-filter-btn'),
    priorityOptions: document.getElementById('priority-options')
  };
};

export const showElement = element => {
  element.classList.remove('hidden');
};

export const hideElement = element => {
  element.classList.add('hidden');
};

export const updateBadgeCount = (badgeId, count) => {
  const badge = document.getElementById(badgeId);
  if (badge) {
    badge.textContent = count;
  }
};

export const createTaskCardElement = (taskData, onEdit, onDelete) => {
  const { id, title, date, tags, description, priority, status } = taskData;

  const taskCard = document.createElement('div');
  taskCard.className = `task-card priority-${priority}`;
  taskCard.dataset.taskId = id;

  const dateDiv = document.createElement('div');
  dateDiv.className = 'date';
  dateDiv.innerHTML = `<i class="fa-regular fa-calendar"></i><span>${date}</span>`;
  taskCard.appendChild(dateDiv);

  const h3 = document.createElement('h3');
  h3.textContent = title;
  taskCard.appendChild(h3);

  const tagContainer = document.createElement('div');
  tagContainer.className = 'tag-container';
  tags.forEach(tag => {
    const tagEl = document.createElement('span');
    tagEl.className = `tag tag-${tag.toLowerCase()}`;
    tagEl.innerHTML = `${tag}`;
    tagContainer.appendChild(tagEl);
  });
  taskCard.appendChild(tagContainer);

  const p = document.createElement('p');
  p.textContent = description;
  taskCard.appendChild(p);

  const footer = document.createElement('div');
  footer.className = `task-footer priority-${priority}`;

  const priorityDiv = document.createElement('div');
  priorityDiv.className = 'priority-indicator';
  const capitalizedPriority =
    priority.charAt(0).toUpperCase() + priority.slice(1);
  priorityDiv.innerHTML = `
      <span class="priority-dot priority-${priority}"></span>
      <span class="priority-text">${capitalizedPriority}</span>
    `;

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'task-actions';

  const editIcon = document.createElement('i');
  editIcon.className = 'fas fa-pen editIcon';

  const deleteIcon = document.createElement('i');
  deleteIcon.className = 'fas fa-trash deleteIcon';

  actionsDiv.appendChild(editIcon);
  actionsDiv.appendChild(deleteIcon);
  footer.appendChild(priorityDiv);
  footer.appendChild(actionsDiv);
  taskCard.appendChild(footer);

  editIcon.addEventListener('click', () => onEdit(taskCard, id));
  deleteIcon.addEventListener('click', () => onDelete(taskCard, id));

  return taskCard;
};
