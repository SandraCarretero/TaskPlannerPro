// js/utils.js
export const getInitials = name => {
  if (!name) return '';
  const parts = name.split(' ');
  let initials = '';
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length > 0) {
      initials += parts[i][0].toUpperCase();
    }
    if (initials.length >= 2) break;
  }
  return initials;
};

export const formatDateForInput = dateString => {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

export const formatDateTimeForInput = dateString => {
  const date = new Date(dateString);
  return date.toISOString().slice(0, 16);
};

export const capitalizeFirstLetter = string => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const getDaysLeft = dueDate => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};
