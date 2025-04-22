export const capitalizeFirstLetter = str => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const validateTaskForm = elements => {
  let isValid = true;

  document
    .querySelectorAll('.error-message')
    .forEach(el => (el.textContent = ''));

  const requiredFields = [
    { element: elements.titleTask, errorId: 'error-title' },
    { element: elements.dateTask, errorId: 'error-date' },
    { element: elements.descriptionTask, errorId: 'error-description' },
    { element: elements.priorityTask, errorId: 'error-priority' },
    { element: elements.statusTask, errorId: 'error-status' }
  ];

  requiredFields.forEach(field => {
    if (!field.element.value.trim()) {
      document.getElementById(field.errorId).textContent = 'Campo obligatorio';
      isValid = false;
    }
  });

  const selectedTags = Array.from(
    document.querySelectorAll('.tags-selection .tag.selected')
  );

  if (selectedTags.length === 0) {
    document.getElementById('error-tags').textContent =
      'Debes seleccionar al menos una etiqueta';
    isValid = false;
  }

  return isValid;
};

export const getTaskFormData = (elements, existingId, idGenerator) => {
  const title = capitalizeFirstLetter(elements.titleTask.value);
  const date = elements.dateTask.value;
  const description = capitalizeFirstLetter(elements.descriptionTask.value);
  const priority = elements.priorityTask.value;
  const status = elements.statusTask.value;

  const selectedTags = Array.from(
    document.querySelectorAll('.tags-selection .tag.selected')
  ).map(tag => tag.textContent.trim());

  return {
    id: existingId || idGenerator(),
    title,
    date,
    description,
    priority,
    status,
    tags: selectedTags,
    updatedAt: new Date().toISOString()
  };
};

export const clearTaskForm = elements => {
  elements.titleTask.value = '';
  elements.dateTask.value = '';
  elements.descriptionTask.value = '';
  elements.priorityTask.value = '';
  elements.statusTask.value = '';

  document.querySelectorAll('.tags-selection .tag').forEach(tag => {
    tag.classList.remove('selected');
    tag.classList.add('noselected');
  });

  document
    .querySelectorAll('.error-message')
    .forEach(el => (el.textContent = ''));
};
