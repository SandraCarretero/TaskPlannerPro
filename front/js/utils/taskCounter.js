import { loadUserTasks } from './taskStorage.js';

export function renderTagSummaryCards(user) {
  if (!user) return;

  const tasks = loadUserTasks(user);
  const container = document.getElementById('project-cards-container');
  container.innerHTML = '';

  const etiquetas = {};

  tasks.forEach(task => {
    task.tags.forEach(tag => {
      if (!etiquetas[tag]) etiquetas[tag] = [];
      etiquetas[tag].push(task);
    });
  });

  const ordenEtiquetas = [
    'Trabajo',
    'Personal',
    'Estudios',
    'Salud',
    'Reunión',
    'Ocio',
    'Otros'
  ];

  const etiquetasOrdenadas = Object.entries(etiquetas).sort(([a], [b]) => {
    const indexA = ordenEtiquetas.indexOf(a);
    const indexB = ordenEtiquetas.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  etiquetasOrdenadas.forEach(([etiqueta, tareas]) => {
    const total = tareas.length;
    const completadas = tareas.filter(t => t.status === 'completed').length;
    const porcentaje = Math.round((completadas / total) * 100);

    const strokeDasharray = 2 * Math.PI * 22;
    const dashoffset = strokeDasharray * (1 - porcentaje / 100);

    const color = getColorFromCSSVariable(etiqueta);
    const iconClass = getIconClassForLabel(etiqueta);

    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <div class="project-info">
        <div class="icon-container" style="background-color: ${color}60">
          <i class="${iconClass}"></i>
        </div>
        <div class="text-info">
          <h4>${etiqueta}</h4>
          <p>${total} tareas</p>
        </div>
      </div>
      <div class="progress-circle">
        <svg width="50" height="50">
          <circle cx="25" cy="25" r="22" stroke="${color}20" stroke-width="5" fill="none" />
          <circle cx="25" cy="25" r="22" stroke="${color}" stroke-width="5" fill="none" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${dashoffset}" stroke-linecap="round"
  transform="rotate(-90 25 25)" />
        </svg>
        <div class="progress-text">${porcentaje}%</div>
      </div>
    `;

    container.appendChild(card);
  });
}

const getColorFromCSSVariable = label => {
  const rootStyles = getComputedStyle(document.documentElement);
  return rootStyles.getPropertyValue(`--${label}`).trim();
};

const getIconClassForLabel = label => {
  const iconClasses = {
    Trabajo: 'fas fa-briefcase',
    Personal: 'fas fa-user',
    Reunión: 'fas fa-users',
    Salud: 'fas fa-heartbeat',
    Ocio: 'fas fa-gamepad',
    Otros: 'fas fa-tag'
  };
  return iconClasses[label] || 'fas fa-question';
};