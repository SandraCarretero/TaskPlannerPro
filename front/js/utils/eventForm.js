import {
    validateFormFields,
    getInputValue,
    resetFormFields
  } from './formUtils.js';
  
  export const validateEventForm = (elements) => {
    const requiredFields = [
      { element: elements.titleTask, errorId: 'error-title' },
      { element: elements.startDateTask, errorId: 'error-start-date' },
      { element: elements.endDateTask, errorId: 'error-end-date' },
      { element: elements.locationTask, errorId: 'error-location' },
      { element: elements.descriptionTask, errorId: 'error-description' },
      { element: elements.statusTask, errorId: 'error-status' }
    ];
  
    return validateFormFields(requiredFields);
  };
  
  export const getEventFormData = (elements, existingId, idGenerator) => {
    return {
      id: existingId || idGenerator(),
      title: getInputValue(elements.titleTask),
      startDate: elements.startDateTask.value,
      endDate: elements.endDateTask.value,
      location: getInputValue(elements.locationTask),
      description: getInputValue(elements.descriptionTask),
      status: elements.statusTask.value,
      createdAt: new Date().toISOString()
    };
  };
  
  export const clearEventForm = (elements) => {
    resetFormFields([
      elements.titleTask,
      elements.startDateTask,
      elements.endDateTask,
      elements.locationTask,
      elements.descriptionTask,
      elements.statusTask
    ]);
  };
  