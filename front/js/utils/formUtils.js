import { capitalizeFirstLetter } from './domUtils.js';

export const validateFormFields = (fields) => {
  let isValid = true;

  // Limpiar mensajes de error anteriores
  document.querySelectorAll('.error-message').forEach(el => (el.textContent = ''));

  fields.forEach(({ element, errorId }) => {
    if (!element.value.trim()) {
      document.getElementById(errorId).textContent = 'Campo obligatorio';
      isValid = false;
    }
  });

  return isValid;
};

export const getInputValue = input => capitalizeFirstLetter(input.value.trim());

export const resetFormFields = (fields) => {
  fields.forEach(field => {
    if (field) field.value = '';
  });

  document.querySelectorAll('.error-message').forEach(el => (el.textContent = ''));
};
