import {
  validateFormFields,
  getInputValue,
  resetFormFields
} from './formUtils.js';

export const validateTaskForm = (elements) => {
  const requiredFields = [
    { element: elements.titleTask, errorId: 'error-title' },
    { element: elements.dateTask, errorId: 'error-date' },
    { element: elements.descriptionTask, errorId: 'error-description' },
    { element: elements.priorityTask, errorId: 'error-priority' },
    { element: elements.statusTask, errorId: 'error-status' }
  ];

  const isValid = validateFormFields(requiredFields);

  const selectedTags = Array.from(
    document.querySelectorAll('.tags-selection .tag.selected')
  );

  if (selectedTags.length === 0) {
    document.getElementById('error-tags').textContent = 'Debes seleccionar al menos una etiqueta';
    return false;
  }

  return isValid;
};

export const getTaskFormData = (elements, existingId, idGenerator) => {
  const selectedTags = Array.from(
    document.querySelectorAll('.tags-selection .tag.selected')
  ).map(tag => tag.textContent.trim());

  return {
    id: existingId || idGenerator(),
    title: getInputValue(elements.titleTask),
    date: elements.dateTask.value,
    description: getInputValue(elements.descriptionTask),
    priority: elements.priorityTask.value,
    status: elements.statusTask.value,
    tags: selectedTags,
    updatedAt: new Date().toISOString()
  };
};

export const clearTaskForm = (elements) => {
  resetFormFields([
    elements.titleTask,
    elements.dateTask,
    elements.descriptionTask,
    elements.priorityTask,
    elements.statusTask
  ]);

  document.querySelectorAll('.tags-selection .tag').forEach(tag => {
    tag.classList.remove('selected');
    tag.classList.add('noselected');
  });
};
