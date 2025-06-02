require('dotenv').config();

const apiKey = process.env.OPENWEATHER_API_KEY;

const timeTillDate = (targetDateTime) => {
  const now = new Date();
  const targetDate = new Date(targetDateTime);
  const diff = targetDate - now; // Difference in milliseconds
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  return {
    days: days,
    hours: hours % 24,
    minutes: minutes % 60,
    seconds: seconds % 60
  };
}

// const getWeatherForCity = async (info) => {
//   // Get latitude and longitude from the location
//   const lat = info.lat;
//   const lon = info.lng;
//   const targetDateTime = info.time; // e.g., "2025-05-27 03:00:00"
//   // console.log(`Fetching weather for coordinates: ${lat}, ${lon}`);

//   // let targetDateTime = new Date();
//   // targetDateTime = "2025-05-27 03:00:00"
//   url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
//   await fetch(url)
//     .then(res => res.json())
//     .then(data => {
//       // console.log(`Weather data for ${lat}, ${lon}:`, data);
//       const forecast = data.list.find(item => item.dt_txt === targetDateTime);
//       //Maximum of 5 days forecast, every 3 hours
//       let weatherInfo = {
//         timeLeft: timeTillDate(targetDateTime),
//         temperature: null,
//         description: null,
//         pop: null
      
//       }
//       // console.log('timeLeft', weatherInfo.timeLeft);
//       if (!forecast) {
//         console.error(`No forecast data found for ${targetDateTime}`);
//         // console.log(weatherInfo)
//         return weatherInfo;
//       }
//       const description = forecast.weather[0].description;
//       const pop = (forecast.pop || 0) * 100; // Probability of precipitation in %
//       const temp = forecast.main.temp;
//       // console.log(`🌦 Forecast for ${targetDateTime}`);
//       // console.log(`Temperature: ${temp}°C`);
//       // console.log(`Weather: ${description}`);
//       // console.log(`Chance of precipiiation: ${pop.toFixed(0)}%`);
//       weatherInfo.temperature = temp;
//       weatherInfo.description = description;
//       weatherInfo.pop = pop.toFixed(0); // Probability of precipitation as a string
//       console.log(weatherInfo)
//       // console.log(`Weather Info: ${JSON.stringify(weatherInfo)}`);
//       return weatherInfo;
//       // data.list is an array of forecast entries every 3 hours
//       // data.list.forEach(forecast => {
//       //   const time = new Date(forecast.dt * 1000).toLocaleString();
//       //   const pop = (forecast.pop || 0) * 100; // probability of precipitation (%)
//       //   const weatherDesc = forecast.weather[0].description;
//       //   console.log(`${time} - Chance of precipitation: ${pop.toFixed(0)}%, Weather: ${weatherDesc}`);
//       // });
//       // console.log(`Chance of rain in the next hour: `, JSON.stringify(data));
//     })
//     .catch(err => console.error(err));
// }
const getWeatherForCity = async (info) => {
  const lat = info.lat;
  const lon = info.lng;
  const targetDateTime = info.time;
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const forecast = data.list.find(item => item.dt_txt === targetDateTime);

    let weatherInfo = {
      timeLeft: timeTillDate(targetDateTime),
      temperature: null,
      description: null,
      pop: null
    };

    if (!forecast) {
      console.error(`No forecast data found for ${targetDateTime}`);
      return weatherInfo;
    }

    weatherInfo.temperature = forecast.main.temp;
    weatherInfo.description = forecast.weather[0].description;
    weatherInfo.pop = ((forecast.pop || 0) * 100).toFixed(0);

    return weatherInfo;
  } catch (err) {
    console.error(err);
    return { error: 'Weather fetch failed' };
  }
};
module.exports = { getWeatherForCity };
