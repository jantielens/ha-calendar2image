/**
 * Weather Dashboard Template
 * Displays weather information from Open-Meteo API
 * Designed for e-ink displays - optimized for clarity and low refresh rates
 */

// Configuration - Customize these values to personalize your weather dashboard
const CONFIG = {
  // Colors
  colors: {
    background: '#fff',          // Background color of the entire page
    headerText: '#333',          // Color of the date/time header text
    currentTempText: '#000',     // Color of the current temperature (large)
    conditionText: '#666',       // Color of the weather condition text
    detailText: '#666',          // Color of detail labels
    detailValueText: '#333',     // Color of detail values
    hourlyText: '#333',          // Color of hourly forecast text
    hourlyTimeText: '#999',      // Color of hourly time labels
    divider: '#ddd'              // Color of divider lines
  },
  
  // Labels
  labels: {
    temperature: 'Temperature',
    humidity: 'Humidity',
    wind: 'Wind',
    precipitation: 'Rain',
    hourlyForecast: '24-Hour Forecast'
  },
  
  // Fonts
  fonts: {
    family: 'Arial, sans-serif',
    headerSize: '20px',
    headerWeight: 'bold',
    currentTempSize: '72px',
    currentTempWeight: 'bold',
    conditionSize: '18px',
    detailLabelSize: '14px',
    detailValueSize: '16px',
    detailValueWeight: 'bold',
    hourlyTimeSize: '12px',
    hourlyTempSize: '16px',
    hourlyTempWeight: 'bold'
  },
  
  // Spacing
  spacing: {
    bodyPadding: '20px',
    sectionMarginBottom: '20px',
    detailItemMargin: '10px',
    hourlyItemWidth: '70px',
    hourlyItemMargin: '10px'
  },
  
  // Weather code descriptions (WMO Weather interpretation codes)
  weatherCodes: {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Foggy',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Heavy drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Light showers',
    81: 'Showers',
    82: 'Heavy showers',
    85: 'Light snow showers',
    86: 'Snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Heavy thunderstorm'
  }
};

/**
 * Get weather description from WMO code
 */
function getWeatherDescription(code) {
  return CONFIG.weatherCodes[code] || 'Unknown';
}

/**
 * Get weather icon SVG path from WMO code
 * Uses Material Design Icons
 */
function getWeatherIcon(code) {
  // 0, 1: Clear sky / Mainly clear
  if (code === 0 || code === 1) {
    return 'M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z';
  }
  // 2: Partly cloudy
  if (code === 2) {
    return 'M12.74,5.47C15.1,6.5 16.35,9.03 15.92,11.46C17.19,12.56 18,14.19 18,16V16.17C18.31,16.06 18.65,16 19,16A3,3 0 0,1 22,19A3,3 0 0,1 19,22H6A4,4 0 0,1 2,18A4,4 0 0,1 6,14H6.27C5,12.45 4.6,10.24 5.5,8.26C6.72,5.5 9.97,4.24 12.74,5.47M11.93,7.3C10.16,6.5 8.09,7.31 7.31,9.07C6.85,10.09 6.93,11.22 7.41,12.13C8.5,10.83 10.16,10 12,10C12.7,10 13.38,10.12 14,10.34C13.94,9.06 13.18,7.86 11.93,7.3M13.55,3.64C13,3.4 12.45,3.23 11.88,3.12L14.37,1.82L15.27,4.71C14.76,4.29 14.19,3.93 13.55,3.64M6.09,4.44C5.6,4.79 5.17,5.19 4.8,5.63L4.91,2.82L7.87,3.5C7.25,3.71 6.65,4.03 6.09,4.44M18,9.71C17.91,9.12 17.78,8.55 17.59,8L19.97,9.5L17.92,11.73C18.03,11.08 18.05,10.4 18,9.71M3.04,11.3C3.11,11.9 3.24,12.47 3.43,13L1.06,11.5L3.1,9.28C3,9.93 2.97,10.61 3.04,11.3M19,18H16V16A4,4 0 0,0 12,12A4,4 0 0,0 8,16H6A2,2 0 0,0 4,18A2,2 0 0,0 6,20H19A1,1 0 0,0 20,19A1,1 0 0,0 19,18Z';
  }
  // 3: Overcast
  if (code === 3) {
    return 'M6,19A5,5 0 0,1 1,14A5,5 0 0,1 6,9C7,6.65 9.3,5 12,5C15.43,5 18.24,7.66 18.5,11.03L19,11A4,4 0 0,1 23,15A4,4 0 0,1 19,19H6M19,13H17V12A5,5 0 0,0 12,7C9.5,7 7.45,8.82 7.06,11.19C6.73,11.07 6.37,11 6,11A3,3 0 0,0 3,14A3,3 0 0,0 6,17H19A2,2 0 0,0 21,15A2,2 0 0,0 19,13Z';
  }
  // 45, 48: Fog
  if (code === 45 || code === 48) {
    return 'M3,15H13A1,1 0 0,1 14,16A1,1 0 0,1 13,17H3A1,1 0 0,1 2,16A1,1 0 0,1 3,15M16,15H21A1,1 0 0,1 22,16A1,1 0 0,1 21,17H16A1,1 0 0,1 15,16A1,1 0 0,1 16,15M1,12A5,5 0 0,1 6,7C7,4.65 9.3,3 12,3C15.43,3 18.24,5.66 18.5,9.03L19,9C21.19,9 22.97,10.76 23,13H21A2,2 0 0,0 19,11H17V10A5,5 0 0,0 12,5C9.5,5 7.45,6.82 7.06,9.19C6.73,9.07 6.37,9 6,9A3,3 0 0,0 3,12C3,12.35 3.06,12.69 3.17,13H1.1L1,12M3,19H5A1,1 0 0,1 6,20A1,1 0 0,1 5,21H3A1,1 0 0,1 2,20A1,1 0 0,1 3,19M8,19H21A1,1 0 0,1 22,20A1,1 0 0,1 21,21H8A1,1 0 0,1 7,20A1,1 0 0,1 8,19Z';
  }
  // 51-55: Drizzle
  if (code >= 51 && code <= 55) {
    return 'M6,14.03A1,1 0 0,1 7,15.03C7,15.58 6.55,16.03 6,16.03C3.24,16.03 1,13.79 1,11.03C1,8.27 3.24,6.03 6,6.03C7,3.68 9.3,2.03 12,2.03C15.43,2.03 18.24,4.69 18.5,8.06L19,8.03A4,4 0 0,1 23,12.03C23,14.23 21.21,16.03 19,16.03H18C17.45,16.03 17,15.58 17,15.03C17,14.47 17.45,14.03 18,14.03H19A2,2 0 0,0 21,12.03A2,2 0 0,0 19,10.03H17V9.03C17,6.27 14.76,4.03 12,4.03C9.5,4.03 7.45,5.84 7.06,8.21C6.73,8.09 6.37,8.03 6,8.03A3,3 0 0,0 3,11.03A3,3 0 0,0 6,14.03M12,14.15C12.18,14.39 12.37,14.66 12.56,14.94C13,15.56 14,17.03 14,18C14,19.11 13.1,20 12,20A2,2 0 0,1 10,18C10,17.03 11,15.56 11.44,14.94C11.63,14.66 11.82,14.4 12,14.15M12,11.03L11.5,11.59C11.5,11.59 10.65,12.55 9.79,13.81C8.93,15.06 8,16.56 8,18A4,4 0 0,0 12,22A4,4 0 0,0 16,18C16,16.56 15.07,15.06 14.21,13.81C13.35,12.55 12.5,11.59 12.5,11.59';
  }
  // 56, 57: Freezing Drizzle
  if (code === 56 || code === 57) {
    return 'M4.5,15.03C4.22,15.03 4,15.26 4,15.53C4,15.65 4.04,15.77 4.12,15.86L5.57,17.31C5.66,17.39 5.78,17.44 5.9,17.44C6.17,17.44 6.4,17.21 6.4,16.94C6.4,16.82 6.35,16.7 6.27,16.61L4.82,15.16C4.73,15.07 4.61,15.03 4.5,15.03M8.5,15.03C8.22,15.03 8,15.26 8,15.53C8,15.65 8.04,15.77 8.12,15.86L9.57,17.31C9.66,17.39 9.78,17.44 9.9,17.44C10.17,17.44 10.4,17.21 10.4,16.94C10.4,16.82 10.36,16.7 10.27,16.61L8.82,15.16C8.73,15.07 8.61,15.03 8.5,15.03M6,13.67L6.45,14.12C6.54,14.21 6.66,14.25 6.78,14.25C7.05,14.25 7.28,14.03 7.28,13.75C7.28,13.64 7.24,13.53 7.15,13.45L6.7,13C6.61,12.91 6.5,12.87 6.38,12.87C6.11,12.87 5.88,13.09 5.88,13.37C5.88,13.47 5.92,13.58 6,13.67M12,2C15.5,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16H6A5,5 0 0,1 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2M12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11A3,3 0 0,0 6,14H19A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4Z';
  }
  // 61-65: Rain
  if (code >= 61 && code <= 65) {
    return 'M9,12C9.53,12.14 9.85,12.69 9.71,13.22L8.41,18.05C8.27,18.59 7.72,18.9 7.19,18.76C6.65,18.62 6.34,18.07 6.5,17.54L7.78,12.71C7.92,12.17 8.47,11.86 9,12M13,12C13.53,12.14 13.85,12.69 13.71,13.22L11.64,20.95C11.5,21.5 10.95,21.8 10.41,21.66C9.88,21.5 9.56,20.97 9.7,20.43L11.78,12.71C11.92,12.17 12.47,11.86 13,12M17,12C17.53,12.14 17.85,12.69 17.71,13.22L16.41,18.05C16.27,18.59 15.72,18.9 15.19,18.76C14.65,18.62 14.34,18.07 14.5,17.54L15.78,12.71C15.92,12.17 16.47,11.86 17,12M17,10V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11C3,12.11 3.6,13.08 4.5,13.6V13.59C5,13.87 5.14,14.5 4.87,14.96C4.59,15.43 4,15.6 3.5,15.32V15.33C2,14.47 1,12.85 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12C23,13.5 22.2,14.77 21,15.46V15.46C20.5,15.73 19.91,15.57 19.63,15.09C19.36,14.61 19.5,14 20,13.72V13.73C20.6,13.39 21,12.74 21,12A2,2 0 0,0 19,10H17Z';
  }
  // 66, 67: Freezing Rain
  if (code === 66 || code === 67) {
    return 'M19.8,17.1L20.9,16.5L22,17.1L21.5,16L22.6,15.4L21.4,15.4L20.9,14.3L20.4,15.4L19.2,15.4L20.3,16L19.8,17.1M15.8,17.1L16.9,16.5L18,17.1L17.5,16L18.6,15.4L17.4,15.4L16.9,14.3L16.4,15.4L15.2,15.4L16.3,16L15.8,17.1M11.8,17.1L12.9,16.5L14,17.1L13.5,16L14.6,15.4L13.4,15.4L12.9,14.3L12.4,15.4L11.2,15.4L12.3,16L11.8,17.1M7.8,17.1L8.9,16.5L10,17.1L9.5,16L10.6,15.4L9.4,15.4L8.9,14.3L8.4,15.4L7.2,15.4L8.3,16L7.8,17.1M3.8,17.1L4.9,16.5L6,17.1L5.5,16L6.6,15.4L5.4,15.4L4.9,14.3L4.4,15.4L3.2,15.4L4.3,16L3.8,17.1M18,12A4,4 0 0,1 22,16A4,4 0 0,1 18,20H6A5,5 0 0,1 1,15A5,5 0 0,1 6,10C7,7.65 9.3,6 12,6C15.43,6 18.24,8.66 18.5,12.03L18,12M12,8C9.5,8 7.45,9.82 7.06,12.19C6.73,12.07 6.37,12 6,12A3,3 0 0,0 3,15A3,3 0 0,0 6,18H18A2,2 0 0,0 20,16A2,2 0 0,0 18,14H16V13A4,4 0 0,0 12,9';
  }
  // 71-75, 77: Snow
  if ((code >= 71 && code <= 75) || code === 77) {
    return 'M6,14A1,1 0 0,1 7,15A1,1 0 0,1 6,16A5,5 0 0,1 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16H18A1,1 0 0,1 17,15A1,1 0 0,1 18,14H19A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11A3,3 0 0,0 6,14M7.88,18.07L10.07,17.5L8.76,15.55L10.5,14.24L9.93,12.06L12.12,12.63L12.69,10.44L14.87,11L14.31,13.2L16.5,14.5L15.19,16.44L16.5,18.39L14.56,19.7L13.25,17.75L11.07,18.32L10.5,20.5L8.31,19.94L8.88,17.75L7.07,16.45L8.38,14.5L7.07,12.55L9.06,11.25L9.63,9.06L7.44,8.5L8.01,6.31L10.19,6.88L11.5,4.93L13.44,6.24L14.75,4.29L16.69,5.6L15.38,7.55L17.57,8.11L17,10.3L14.81,9.74L14.24,11.93L16.43,12.5L15.86,14.68L13.67,14.12L12.37,16.07L10.43,14.76L9.12,16.71L10.55,18.66L8.76,19.96L7.88,18.07Z';
  }
  // 80-82: Rain showers
  if (code >= 80 && code <= 82) {
    return 'M9,12C9.53,12.14 9.85,12.69 9.71,13.22L8.41,18.05C8.27,18.59 7.72,18.9 7.19,18.76C6.65,18.62 6.34,18.07 6.5,17.54L7.78,12.71C7.92,12.17 8.47,11.86 9,12M13,12C13.53,12.14 13.85,12.69 13.71,13.22L11.64,20.95C11.5,21.5 10.95,21.8 10.41,21.66C9.88,21.5 9.56,20.97 9.7,20.43L11.78,12.71C11.92,12.17 12.47,11.86 13,12M17,12C17.53,12.14 17.85,12.69 17.71,13.22L16.41,18.05C16.27,18.59 15.72,18.9 15.19,18.76C14.65,18.62 14.34,18.07 14.5,17.54L15.78,12.71C15.92,12.17 16.47,11.86 17,12M17,10V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11C3,12.11 3.6,13.08 4.5,13.6V13.59C5,13.87 5.14,14.5 4.87,14.96C4.59,15.43 4,15.6 3.5,15.32V15.33C2,14.47 1,12.85 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12C23,13.5 22.2,14.77 21,15.46V15.46C20.5,15.73 19.91,15.57 19.63,15.09C19.36,14.61 19.5,14 20,13.72V13.73C20.6,13.39 21,12.74 21,12A2,2 0 0,0 19,10H17Z';
  }
  // 85, 86: Snow showers
  if (code === 85 || code === 86) {
    return 'M19.8,17.1L20.9,16.5L22,17.1L21.5,16L22.6,15.4L21.4,15.4L20.9,14.3L20.4,15.4L19.2,15.4L20.3,16L19.8,17.1M15.8,17.1L16.9,16.5L18,17.1L17.5,16L18.6,15.4L17.4,15.4L16.9,14.3L16.4,15.4L15.2,15.4L16.3,16L15.8,17.1M11.8,17.1L12.9,16.5L14,17.1L13.5,16L14.6,15.4L13.4,15.4L12.9,14.3L12.4,15.4L11.2,15.4L12.3,16L11.8,17.1M7.8,17.1L8.9,16.5L10,17.1L9.5,16L10.6,15.4L9.4,15.4L8.9,14.3L8.4,15.4L7.2,15.4L8.3,16L7.8,17.1M3.8,17.1L4.9,16.5L6,17.1L5.5,16L6.6,15.4L5.4,15.4L4.9,14.3L4.4,15.4L3.2,15.4L4.3,16L3.8,17.1M18,12A4,4 0 0,1 22,16A4,4 0 0,1 18,20H6A5,5 0,1 6,10C7,7.65 9.3,6 12,6C15.43,6 18.24,8.66 18.5,12.03L18,12M12,8C9.5,8 7.45,9.82 7.06,12.19C6.73,12.07 6.37,12 6,12A3,3 0 0,0 3,15A3,3 0 0,0 6,18H18A2,2 0 0,0 20,16A2,2 0 0,0 18,14H16V13A4,4 0 0,0 12,9';
  }
  // 95: Thunderstorm
  if (code === 95) {
    return 'M6,16A5,5 0 0,1 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16H18A1,1 0 0,1 17,15A1,1 0 0,1 18,14H19A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11A3,3 0 0,0 6,14A1,1 0 0,1 7,15A1,1 0 0,1 6,16M13,13V10L8,17H11V20L16,13H13Z';
  }
  // 96, 99: Thunderstorm with hail
  if (code === 96 || code === 99) {
    return 'M4.5,15.03C4.22,15.03 4,15.26 4,15.53C4,15.65 4.04,15.77 4.12,15.86L5.57,17.31C5.66,17.39 5.78,17.44 5.9,17.44C6.17,17.44 6.4,17.21 6.4,16.94C6.4,16.82 6.35,16.7 6.27,16.61L4.82,15.16C4.73,15.07 4.61,15.03 4.5,15.03M8.5,15.03C8.22,15.03 8,15.26 8,15.53C8,15.65 8.04,15.77 8.12,15.86L9.57,17.31C9.66,17.39 9.78,17.44 9.9,17.44C10.17,17.44 10.4,17.21 10.4,16.94C10.4,16.82 10.36,16.7 10.27,16.61L8.82,15.16C8.73,15.07 8.61,15.03 8.5,15.03M6,13.67L6.45,14.12C6.54,14.21 6.66,14.25 6.78,14.25C7.05,14.25 7.28,14.03 7.28,13.75C7.28,13.64 7.24,13.53 7.15,13.45L6.7,13C6.61,12.91 6.5,12.87 6.38,12.87C6.11,12.87 5.88,13.09 5.88,13.37C5.88,13.47 5.92,13.58 6,13.67M12,2C15.5,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16H14.31L13,13H16L11,22V17H8L13,8V10.44C12.5,10.19 12,10.06 11.5,10.06C10.5,10.06 9.54,10.5 8.92,11.25C8.5,11.13 8.05,11.06 7.59,11.06C6,11.06 4.69,12.19 4.5,13.67C4.33,13.6 4.16,13.56 4,13.56C2.89,13.56 2,14.46 2,15.56C2,16.66 2.89,17.56 4,17.56L5.97,17.5L6,17.53C6,17.81 6.22,18.03 6.5,18.03C6.63,18.03 6.74,17.97 6.82,17.88L7.97,16.72C8.22,16.97 8.59,17.13 9,17.13C9.41,17.13 9.78,16.97 10.03,16.72L11.18,17.88C11.26,17.97 11.37,18.03 11.5,18.03C11.78,18.03 12,17.81 12,17.53L12,17.5L14,17.56C15.11,17.56 16,16.66 16,15.56C16,14.46 15.11,13.56 14,13.56C13.84,13.56 13.67,13.6 13.5,13.67C13.31,12.19 12,11.06 10.41,11.06C9.95,11.06 9.5,11.13 9.08,11.25C9.54,10.5 10.5,10.06 11.5,10.06C12,10.06 12.5,10.19 13,10.44V8L12,2Z';
  }
  // Default fallback (clear sky)
  return 'M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z';
}

/**
 * Format temperature value
 */
function formatTemp(temp) {
  if (temp === null || temp === undefined) return '--';
  return Math.round(temp) + '°C';
}

/**
 * Format wind speed
 */
function formatWind(speed) {
  if (speed === null || speed === undefined) return '--';
  return Math.round(speed) + ' km/h';
}

/**
 * Format humidity
 */
function formatHumidity(humidity) {
  if (humidity === null || humidity === undefined) return '--';
  return Math.round(humidity) + '%';
}

/**
 * Format precipitation
 */
function formatPrecipitation(precip) {
  if (precip === null || precip === undefined) return '--';
  return precip.toFixed(1) + ' mm';
}

/**
 * Format time for hourly forecast
 */
function formatHourTime(dateStr) {
  const date = new Date(dateStr);
  return date.getHours().toString().padStart(2, '0') + ':00';
}

module.exports = function weatherDashboard(data) {
  const { extra, now, locale } = data;
  
  // Support both single extra data object and array format
  const weatherData = Array.isArray(extra) && extra.length > 0 ? extra[0] : extra;
  
  // Current date/time
  const currentDate = new Date(now);
  const dateHeader = currentDate.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const timeHeader = currentDate.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Extract current weather data
  const current = weatherData?.current || {};
  const currentTemp = current.temperature_2m;
  const currentHumidity = current.relative_humidity_2m;
  const currentWeatherCode = current.weather_code;
  const currentWindSpeed = current.wind_speed_10m;
  
  const weatherCondition = getWeatherDescription(currentWeatherCode);
  
  // Extract hourly forecast data (next 12 hours)
  const hourly = weatherData?.hourly || {};
  const hourlyTimes = hourly.time || [];
  const hourlyTemps = hourly.temperature_2m || [];
  const hourlyWeatherCodes = hourly.weather_code || [];
  const hourlyRain = hourly.rain || [];
  const hourlyShowers = hourly.showers || [];
  const hourlySnow = hourly.snowfall || [];
  const hourlyPrecipProb = hourly.precipitation_probability || [];
  
  // Get next 12 hours of forecast
  const currentHourIndex = hourlyTimes.findIndex(time => new Date(time) >= currentDate);
  const forecastHours = [];
  if (currentHourIndex >= 0) {
    for (let i = currentHourIndex; i < Math.min(currentHourIndex + 12, hourlyTimes.length); i++) {
      const totalPrecip = (hourlyRain[i] || 0) + (hourlyShowers[i] || 0) + (hourlySnow[i] || 0);
      forecastHours.push({
        time: hourlyTimes[i],
        temp: hourlyTemps[i],
        weatherCode: hourlyWeatherCodes[i],
        precipitation: totalPrecip,
        precipProb: hourlyPrecipProb[i]
      });
    }
  }
  
  // Build hourly forecast HTML
  const hourlyHTML = forecastHours.map(hour => {
    const precip = hour.precipitation > 0 ? formatPrecipitation(hour.precipitation) : '';
    const precipProb = hour.precipProb > 0 ? `${hour.precipProb}%` : '';
    const precipDisplay = precip || precipProb;
    
    return `
      <div class="hourly-item">
        <div class="hourly-time">${formatHourTime(hour.time)}</div>
        <div class="hourly-icon">
          <svg viewBox="0 0 24 24">
            <path d="${getWeatherIcon(hour.weatherCode)}"/>
          </svg>
        </div>
        <div class="hourly-temp">${formatTemp(hour.temp)}</div>
        ${precipDisplay ? `<div class="hourly-precip">${precipDisplay}</div>` : ''}
      </div>
    `;
  }).join('');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: ${CONFIG.fonts.family};
      margin: 0;
      padding: ${CONFIG.spacing.bodyPadding};
      background: ${CONFIG.colors.background};
    }
    .header {
      font-size: ${CONFIG.fonts.headerSize};
      font-weight: ${CONFIG.fonts.headerWeight};
      color: ${CONFIG.colors.headerText};
      margin-bottom: ${CONFIG.spacing.sectionMarginBottom};
    }
    .current-section {
      text-align: center;
      margin-bottom: ${CONFIG.spacing.sectionMarginBottom};
      padding-bottom: ${CONFIG.spacing.sectionMarginBottom};
      border-bottom: 2px solid ${CONFIG.colors.divider};
    }
    .weather-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 10px;
    }
    .weather-icon svg {
      width: 100%;
      height: 100%;
      fill: ${CONFIG.colors.headerText};
    }
    .current-temp {
      font-size: ${CONFIG.fonts.currentTempSize};
      font-weight: ${CONFIG.fonts.currentTempWeight};
      color: ${CONFIG.colors.currentTempText};
      line-height: 1;
    }
    .condition {
      font-size: ${CONFIG.fonts.conditionSize};
      color: ${CONFIG.colors.conditionText};
      margin-top: 10px;
    }
    .details-section {
      display: flex;
      justify-content: space-around;
      margin-bottom: ${CONFIG.spacing.sectionMarginBottom};
      padding-bottom: ${CONFIG.spacing.sectionMarginBottom};
      border-bottom: 1px solid ${CONFIG.colors.divider};
    }
    .detail-item {
      text-align: center;
    }
    .detail-label {
      font-size: ${CONFIG.fonts.detailLabelSize};
      color: ${CONFIG.colors.detailText};
      margin-bottom: 4px;
    }
    .detail-value {
      font-size: ${CONFIG.fonts.detailValueSize};
      font-weight: ${CONFIG.fonts.detailValueWeight};
      color: ${CONFIG.colors.detailValueText};
    }
    .hourly-section {
      margin-top: ${CONFIG.spacing.sectionMarginBottom};
    }
    .hourly-title {
      font-size: ${CONFIG.fonts.headerSize};
      font-weight: ${CONFIG.fonts.headerWeight};
      color: ${CONFIG.colors.headerText};
      margin-bottom: 15px;
    }
    .hourly-container {
      display: flex;
      overflow-x: auto;
      gap: ${CONFIG.spacing.hourlyItemMargin};
    }
    .hourly-item {
      text-align: center;
      min-width: ${CONFIG.spacing.hourlyItemWidth};
    }
    .hourly-icon {
      width: 35px;
      height: 35px;
      margin: 0 auto 4px;
    }
    .hourly-icon svg {
      width: 100%;
      height: 100%;
      fill: ${CONFIG.colors.conditionText};
    }
    .hourly-time {
      font-size: ${CONFIG.fonts.hourlyTimeSize};
      color: ${CONFIG.colors.hourlyTimeText};
      margin-bottom: 4px;
    }
    .hourly-temp {
      font-size: ${CONFIG.fonts.hourlyTempSize};
      font-weight: ${CONFIG.fonts.hourlyTempWeight};
      color: ${CONFIG.colors.hourlyText};
    }
    .hourly-precip {
      font-size: ${CONFIG.fonts.hourlyTimeSize};
      color: ${CONFIG.colors.conditionText};
      margin-top: 2px;
    }
    .no-data {
      text-align: center;
      padding: 40px;
      color: ${CONFIG.colors.conditionText};
      font-size: ${CONFIG.fonts.conditionSize};
    }
  </style>
</head>
<body>
  <div class="header">${dateHeader} • ${timeHeader}</div>
  
  ${weatherData && current.temperature_2m !== undefined ? `
  <div class="current-section">
    <div class="weather-icon">
      <svg viewBox="0 0 24 24">
        <path d="${getWeatherIcon(currentWeatherCode)}"/>
      </svg>
    </div>
    <div class="current-temp">${formatTemp(currentTemp)}</div>
    <div class="condition">${weatherCondition}</div>
  </div>
  
  <div class="details-section">
    <div class="detail-item">
      <div class="detail-label">${CONFIG.labels.humidity}</div>
      <div class="detail-value">${formatHumidity(currentHumidity)}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">${CONFIG.labels.wind}</div>
      <div class="detail-value">${formatWind(currentWindSpeed)}</div>
    </div>
  </div>
  
  ${forecastHours.length > 0 ? `
  <div class="hourly-section">
    <div class="hourly-title">${CONFIG.labels.hourlyForecast}</div>
    <div class="hourly-container">
      ${hourlyHTML}
    </div>
  </div>
  ` : ''}
  ` : `
  <div class="no-data">
    No weather data available.<br>
    Configure extraDataUrl with Open-Meteo API.
  </div>
  `}
</body>
</html>
  `;
};
