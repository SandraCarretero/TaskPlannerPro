export const updateUIForUser = (user, title) => {
    const userDetails = document.getElementById('user-details');
    if (userDetails) {
      userDetails.innerHTML = `
        <div class="user-info">
          <div class="avatar">${getInitials(user.name)}</div>
          <h2>${title}</h2>
          <p>Bienvenido, ${user.name} (${user.role})</p>
        </div>
      `;
    }
  };
  
  export const clearErrors = (errorElements) => {
    errorElements.forEach(el => {
      el.textContent = '';
    });
  };
  
  export const showModal = (modalElement) => {
    modalElement.classList.remove('hidden');
  };
  
  export const hideModal = (modalElement) => {
    modalElement.classList.add('hidden');
  };