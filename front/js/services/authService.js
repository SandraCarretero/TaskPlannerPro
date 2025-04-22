export const checkUserSession = () => {
  const session =
    JSON.parse(localStorage.getItem('session')) ||
    JSON.parse(sessionStorage.getItem('session'));

  if (!session || !session.isLoggedIn) {
    return null;
  }

  return session;
};

export const getCurrentUser = () => {
  return checkUserSession();
};

export const logoutUser = () => {
  localStorage.removeItem('session');
  sessionStorage.removeItem('session');
};
