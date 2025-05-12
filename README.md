# 🗂️ Flowtask

![Imagen del proyecto](https://github.com/SandraCarretero/TaskPlannerPro/blob/main/front/img/readme/flowtask_landing.png)

## Descripción 📑

**Flowtask** es una aplicación web full-stack para la gestión de tareas, eventos y comunicación entre usuarios. Está construida con JavaScript Vanilla y Node.js, siguiendo principios SOLID, con una estructura modular y escalable tanto en frontend como en backend.

🔗 **[Ver demo online](https://taskplannerpro-vcq0.onrender.com/)**

---

## ✨ Funcionalidades principales

👥 Autenticación y usuarios
Registro e inicio de sesión

- Gestión de perfil: nombre, avatar, contraseña
- Cierre de sesión y eliminación de cuenta
- Vista de estadísticas personales (eventos, tareas por estado)

📝 Tareas

- Crear, editar, eliminar tareas
- Cambiar estado: incompleta, en proceso, finalizada
- Cada tarea muestra título, descripción, fecha de inicio, tags y prioridad
- Vista por columnas: pendiente, en progreso, finalizadas
- Filtros por estado y proyecto

📅 Eventos

- Crear, editar, eliminar eventos
- Cada evento muestra título, descripción, fecha de inicio y fin

💬 Chat global

- Conversación en tiempo real entre todos los usuarios

👑 Administrador

- Puede ver todas las tareas del sistema
- Accede a las tareas con iniciales de usuarios asignados
- Control completo sobre tareas y eventos del resto de usuarios

📊 Dashboard personal

- Muestra tareas por estado y total de eventos asignados

---

## ¿Qué he aprendido en este proyecto? 🙇🏻

Este proyecto me ha permitido aplicar y consolidar muchos de los conocimientos adquiridos durante mi formación, entre ellos:

- Separar responsabilidades entre frontend y backend
- Diseñar una API RESTful y consumirla desde el cliente
- Aplicar principios SOLID y buenas prácticas de arquitectura
- Trabajar con control de accesos por roles (usuario vs administrador)
- Usar WebSockets para comunicación en tiempo real
- Integrar APIs externas para enriquecer la experiencia del usuario
- Modularizar todo el código para facilitar mantenimiento y escalabilidad

## 🛠️ Tecnologías utilizadas

[![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://es.wikipedia.org/wiki/HTML5)
[![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://es.wikipedia.org/wiki/CSS)
[![JS](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://es.wikipedia.org/wiki/JavaScript)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-35495E?style=for-the-badge&logo=websockets&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
![Multer](https://img.shields.io/badge/Multer-00BFFF?style=for-the-badge)
![Nodemailer](https://img.shields.io/badge/Nodemailer-3466A6?style=for-the-badge)

- [OpenWeather API](https://openweathermap.org/)
- [GNews API](https://gnews.io/)

---

## Autor ✒️

**SANDRA CARRETERO**

- [sandracarretero24@gmail.com](sandracarretero24@gmail.com)
- [LinkedIn](https://www.linkedin.com/in/sandra-carretero-lopez/)
<!-- - [Porfolio web](https://tu-dominio.com/) -->

## Instalación

🔧 Requisitos

- Node.js instalado
- MongoDB/PostgreSQL en funcionamiento (según tu proyecto)
- Variables de entorno configuradas

🖥️ Iniciar Backend
- cd backend
- npm install
- node server.js

💻 Iniciar Frontend
- cd frontend
- npm install
- npm run dev

## Licencia 📄

MIT Public License v3.0
No puede usarse comercialmente.
