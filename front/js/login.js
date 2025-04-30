// URL base para la API
const API_URL = "http://localhost:3000/api"

// Elementos DOM
const loginForm = document.getElementById("login-form")
const registerForm = document.getElementById("register-form")
const loginBox = document.getElementById("login-box")
const registerBox = document.getElementById("register-box")
const showRegisterBtn = document.getElementById("show-register")
const cancelRegisterBtn = document.getElementById("cancel-register")
const loginError = document.getElementById("login-error")
const registerError = document.getElementById("register-error")

// Mostrar formulario de registro
showRegisterBtn.addEventListener("click", () => {
  loginBox.classList.add("hidden")
  registerBox.classList.remove("hidden")
})

// Cancelar registro y volver al login
cancelRegisterBtn.addEventListener("click", () => {
  registerBox.classList.add("hidden")
  loginBox.classList.remove("hidden")

  // Limpiar formulario y errores
  registerForm.reset()
  clearRegisterErrors()
})

// Manejar envío del formulario de login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const email = document.getElementById("email").value
  const password = document.getElementById("password").value

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || "Error al iniciar sesión")
    }

    // Guardar token en localStorage
    localStorage.setItem("token", data.data.token)

    // Redirigir a la página principal
    window.location.href = "../index.html"
  } catch (error) {
    console.error("Error al iniciar sesión:", error)
    loginError.textContent = "Usuario o contraseña incorrectos"
    loginError.classList.remove("hidden")
  }
})

// Manejar envío del formulario de registro
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  // Limpiar errores previos
  clearRegisterErrors()

  // Validar formulario
  if (!validateRegisterForm()) {
    return
  }

  const email = document.getElementById("new-email").value
  const name = document.getElementById("new-name").value
  const password = document.getElementById("new-password").value

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, name, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || "Error al registrar usuario")
    }

    // Guardar token en localStorage
    localStorage.setItem("token", data.data.token)

    // Redirigir a la página principal
    window.location.href = "../index.html"
  } catch (error) {
    console.error("Error al registrar usuario:", error)
    registerError.textContent = error.message || "Error al registrar usuario"
    registerError.classList.remove("hidden")
  }
})

// Validar formulario de registro
function validateRegisterForm() {
  let isValid = true

  // Validar email
  const emailInput = document.getElementById("new-email")
  const emailError = document.getElementById("error-new-email")
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailInput.value.trim()) {
    emailError.textContent = "El email es obligatorio"
    emailError.classList.remove("hidden")
    isValid = false
  } else if (!emailRegex.test(emailInput.value)) {
    emailError.textContent = "Email inválido"
    emailError.classList.remove("hidden")
    isValid = false
  }

  // Validar nombre
  const nameInput = document.getElementById("new-name")
  const nameError = document.getElementById("error-new-name")

  if (!nameInput.value.trim()) {
    nameError.textContent = "El nombre es obligatorio"
    nameError.classList.remove("hidden")
    isValid = false
  }

  // Validar contraseña
  const passwordInput = document.getElementById("new-password")
  const passwordError = document.getElementById("error-new-password")

  if (!passwordInput.value) {
    passwordError.textContent = "La contraseña es obligatoria"
    passwordError.classList.remove("hidden")
    isValid = false
  } else if (passwordInput.value.length < 6) {
    passwordError.textContent = "La contraseña debe tener al menos 6 caracteres"
    passwordError.classList.remove("hidden")
    isValid = false
  }

  // Validar confirmación de contraseña
  const confirmInput = document.getElementById("confirm-password")
  const confirmError = document.getElementById("error-confirm-password")

  if (!confirmInput.value) {
    confirmError.textContent = "Debe confirmar la contraseña"
    confirmError.classList.remove("hidden")
    isValid = false
  } else if (confirmInput.value !== passwordInput.value) {
    confirmError.textContent = "Las contraseñas no coinciden"
    confirmError.classList.remove("hidden")
    isValid = false
  }

  return isValid
}

// Limpiar errores del formulario de registro
function clearRegisterErrors() {
  document.getElementById("error-new-email").textContent = ""
  document.getElementById("error-new-email").classList.add("hidden")

  document.getElementById("error-new-name").textContent = ""
  document.getElementById("error-new-name").classList.add("hidden")

  document.getElementById("error-new-password").textContent = ""
  document.getElementById("error-new-password").classList.add("hidden")

  document.getElementById("error-confirm-password").textContent = ""
  document.getElementById("error-confirm-password").classList.add("hidden")

  registerError.textContent = ""
  registerError.classList.add("hidden")
}
