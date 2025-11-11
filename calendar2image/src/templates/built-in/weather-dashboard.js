/**
 * Weather Dashboard Template
 * Demonstrates extraData-only template without calendar (icsUrl is optional)
 * 
 * This template displays weather information from the Open-Meteo API.
 * Configure your location in the extraDataUrl:
 * https://api.open-meteo.com/v1/forecast?latitude=YOUR_LAT&longitude=YOUR_LON&hourly=temperature_2m,weather_code,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weather_code
 * 
 * Example config:
 * {
 *   "template": "weather-dashboard",
 *   "extraDataUrl": "https://api.open-meteo.com/v1/forecast?latitude=50.8505&longitude=4.3488&hourly=temperature_2m,weather_code,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weather_code",
 *   "width": 800,
 *   "height": 480,
 *   "grayscale": true,
 *   "bitDepth": 2,
 *   "imageType": "png"
 * }
 */

// Configuration
const CONFIG = {
  colors: {
    background: '#fff',
    headerText: '#333',
    tempText: '#000',
    labelText: '#666',
    divider: '#ddd'
  },
  fonts: {
    family: 'Arial, sans-serif',
    headerSize: '32px',
    tempSize: '48px',
    labelSize: '16px',
    forecastSize: '20px'
  },
  spacing: {
    padding: '20px',
    sectionGap: '30px'
  }
};

/**
 * Get weather description from WMO weather code
 * @param {number} code - WMO weather code
 * @returns {string} Weather description
 */
function getWeatherDescription(code) {
  const weatherCodes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with heavy hail'
  };
  return weatherCodes[code] || 'Unknown';
}

/**
 * Get weather emoji from WMO weather code
 * @param {number} code - WMO weather code
 * @returns {string} Weather emoji
 */
function getWeatherEmoji(code) {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 55) return '🌧️';
  if (code >= 61 && code <= 65) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 85 && code <= 86) return '❄️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

module.exports = function weatherDashboard(data) {
  const { events, now, locale, extraData } = data;
  
  // Note: events will be an empty array if icsUrl is not configured
  // This template demonstrates working purely with extraData
  
  if (!extraData || !extraData.hourly) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              margin: 0;
              padding: ${CONFIG.spacing.padding};
              font-family: ${CONFIG.fonts.family};
              background: ${CONFIG.colors.background};
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
            }
            .error {
              text-align: center;
              color: ${CONFIG.colors.labelText};
              font-size: ${CONFIG.fonts.labelSize};
            }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>⚠️ No weather data available</h2>
            <p>Configure extraDataUrl with Open-Meteo API</p>
            <p style="font-size: 12px; margin-top: 20px;">
              Example: https://api.open-meteo.com/v1/forecast?latitude=50.8505&longitude=4.3488&hourly=temperature_2m,weather_code,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weather_code
            </p>
          </div>
        </body>
      </html>
    `;
  }
  
  const currentDate = new Date(now);
  const currentHour = currentDate.getHours();
  
  // Get current weather
  const currentTemp = extraData.hourly.temperature_2m[currentHour];
  const currentCode = extraData.hourly.weather_code[currentHour];
  const currentPrecip = extraData.hourly.precipitation_probability ? extraData.hourly.precipitation_probability[currentHour] : 0;
  
  // Get today's forecast
  const todayMax = extraData.daily?.temperature_2m_max?.[0] || currentTemp;
  const todayMin = extraData.daily?.temperature_2m_min?.[0] || currentTemp;
  
  // Get next 6 hours forecast
  const nextHours = [];
  for (let i = 1; i <= 6 && currentHour + i < 24; i++) {
    nextHours.push({
      hour: currentHour + i,
      temp: extraData.hourly.temperature_2m[currentHour + i],
      code: extraData.hourly.weather_code[currentHour + i],
      precip: extraData.hourly.precipitation_probability ? extraData.hourly.precipitation_probability[currentHour + i] : 0
    });
  }
  
  const dateStr = currentDate.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            margin: 0;
            padding: ${CONFIG.spacing.padding};
            font-family: ${CONFIG.fonts.family};
            background: ${CONFIG.colors.background};
            color: ${CONFIG.colors.headerText};
          }
          .header {
            text-align: center;
            margin-bottom: ${CONFIG.spacing.sectionGap};
          }
          .date {
            font-size: ${CONFIG.fonts.labelSize};
            color: ${CONFIG.colors.labelText};
            margin-bottom: 10px;
          }
          .current {
            text-align: center;
            padding: 20px;
            border-bottom: 2px solid ${CONFIG.colors.divider};
            margin-bottom: ${CONFIG.spacing.sectionGap};
          }
          .current-temp {
            font-size: ${CONFIG.fonts.tempSize};
            font-weight: bold;
            color: ${CONFIG.colors.tempText};
            margin: 10px 0;
          }
          .current-emoji {
            font-size: 64px;
            margin: 10px 0;
          }
          .current-description {
            font-size: ${CONFIG.fonts.forecastSize};
            color: ${CONFIG.colors.labelText};
            margin: 10px 0;
          }
          .stats {
            display: flex;
            justify-content: space-around;
            margin-top: 20px;
            font-size: ${CONFIG.fonts.labelSize};
          }
          .stat {
            text-align: center;
          }
          .stat-value {
            font-size: ${CONFIG.fonts.forecastSize};
            font-weight: bold;
            color: ${CONFIG.colors.tempText};
          }
          .stat-label {
            color: ${CONFIG.colors.labelText};
            margin-top: 5px;
          }
          .forecast {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 15px;
            margin-top: ${CONFIG.spacing.sectionGap};
          }
          .forecast-item {
            text-align: center;
            padding: 15px;
            border: 1px solid ${CONFIG.colors.divider};
            border-radius: 8px;
          }
          .forecast-hour {
            font-weight: bold;
            color: ${CONFIG.colors.labelText};
            margin-bottom: 10px;
          }
          .forecast-emoji {
            font-size: 32px;
            margin: 10px 0;
          }
          .forecast-temp {
            font-size: ${CONFIG.fonts.forecastSize};
            font-weight: bold;
            color: ${CONFIG.colors.tempText};
          }
          .forecast-precip {
            font-size: 12px;
            color: ${CONFIG.colors.labelText};
            margin-top: 5px;
          }
          .note {
            text-align: center;
            margin-top: ${CONFIG.spacing.sectionGap};
            font-size: 12px;
            color: ${CONFIG.colors.labelText};
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="date">${dateStr}</div>
        </div>
        
        <div class="current">
          <div class="current-emoji">${getWeatherEmoji(currentCode)}</div>
          <div class="current-temp">${Math.round(currentTemp)}°C</div>
          <div class="current-description">${getWeatherDescription(currentCode)}</div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${Math.round(todayMax)}°C</div>
              <div class="stat-label">High</div>
            </div>
            <div class="stat">
              <div class="stat-value">${Math.round(todayMin)}°C</div>
              <div class="stat-label">Low</div>
            </div>
            <div class="stat">
              <div class="stat-value">${currentPrecip}%</div>
              <div class="stat-label">Rain</div>
            </div>
          </div>
        </div>
        
        ${nextHours.length > 0 ? `
          <h3 style="text-align: center; color: ${CONFIG.colors.headerText};">Next ${nextHours.length} Hours</h3>
          <div class="forecast">
            ${nextHours.map(h => `
              <div class="forecast-item">
                <div class="forecast-hour">${h.hour}:00</div>
                <div class="forecast-emoji">${getWeatherEmoji(h.code)}</div>
                <div class="forecast-temp">${Math.round(h.temp)}°C</div>
                <div class="forecast-precip">💧 ${h.precip}%</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="note">
          Weather data from Open-Meteo API • This template works without calendar (icsUrl optional)
        </div>
      </body>
    </html>
  `;
};
