require('dotenv').config();

const apiKey = process.env.OPENWEATHER_API_KEY;
const getWeatherForCity = async (location) => {
  // Get latitude and longitude from the location
  const lat = location.lat;
  const lon = location.lng;
  console.log(`Fetching weather for coordinates: ${lat}, ${lon}`);

  // Fetch weather data for the given city
  let url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      console.log(`Weather in ${lat}, ${lon}:`);
      console.log(`- Condition: ${data.weather[0].description}`);
      console.log(`- Temp: ${data.main.temp} °C`);
      // console.log(`- Condition: ${data}`);
    })
    .catch(err => console.error(err));

  // // Fetch forecast data for the next day
  // fetch(`api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={API key}`)
  //   .then(res => res.json())
  //   .then(data => {
  //     const forecasts = data.list;

  //     // Get tomorrow's date in YYYY-MM-DD format
  //     const now = new Date();
  //     const tomorrow = new Date(now);
  //     tomorrow.setDate(now.getDate() + 1);
  //     const yyyy = tomorrow.getFullYear();
  //     const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  //     const dd = String(tomorrow.getDate()).padStart(2, '0');
  //     const targetDate = `${yyyy}-${mm}-${dd} 12:00:00`;

  //     // Find forecast for tomorrow at 12:00
  //     const forecast = forecasts.find(f => f.dt_txt === targetDate);

  //     if (forecast) {
  //       console.log(`Weather in ${city} for tomorrow at noon:`);
  //       console.log(`- Condition: ${forecast.weather[0].description}`);
  //       console.log(`- Temp: ${forecast.main.temp} °C`);
  //       console.log(`- Wind: ${forecast.wind.speed} m/s`);
  //     } else {
  //       console.log("No forecast found for tomorrow at noon.");
  //     }
  //   })
  //   .catch(err => console.error(err));

  url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  fetch(url)
  .then(res => res.json())
  .then(data => {
    // data.list is an array of forecast entries every 3 hours
    // data.list.forEach(forecast => {
    //   const time = new Date(forecast.dt * 1000).toLocaleString();
    //   const pop = (forecast.pop || 0) * 100; // probability of precipitation (%)
    //   const weatherDesc = forecast.weather[0].description;
    //   console.log(`${time} - Chance of precipitation: ${pop.toFixed(0)}%, Weather: ${weatherDesc}`);
    // });
    console.log(`Chance of rain in the next hour: `, JSON.stringify(data));
  })
  .catch(err => console.error(err));

}
module.exports = { getWeatherForCity };
