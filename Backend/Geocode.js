const { get } = require("axios");

//https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=YOUR_API_KEY
const getGeocodeFromAddress = async (address) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  try {
    const response = await get(url);
    if (response.data.status === "OK") {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    } else {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }
  }catch (error) {
    console.error("Error fetching geocode:", error);
    throw error;
  }
}
module.exports = { getGeocodeFromAddress };