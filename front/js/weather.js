import { weatherService } from './services/weatherService.js';

const weatherTemp = document.getElementById('weather-temp');
const weatherIcon = document.getElementById('weather-icon');

export const loadCurrentWeather = async city => {
  try {
    const weather = await weatherService.getWeatherByCity(city);
    if (weather) {
      const roundedTemperature = Math.round(weather.temperature);
      weatherTemp.textContent = `${roundedTemperature}°C`;

      weatherIcon.src = weather.icon;
      weatherIcon.alt = weather.description;
    }
  } catch (error) {
    console.error('Error al obtener el clima:', error);
    weatherTemp.textContent = 'Error';
    weatherIcon.alt = 'Error';
  }
};
