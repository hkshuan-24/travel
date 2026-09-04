const { JSONFileSyncPreset } = require('lowdb/node');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const db = JSONFileSyncPreset(path.join(__dirname, 'trippilot.json'), {
  users: [],
  trips: [],
  itinerary: [],
  activities: [],
  weather: []
});

db.read();

// Seed activities if empty
if (!db.data.activities || db.data.activities.length === 0) {
  db.data.activities = [
    { id: uuidv4(), name: "Chengdu Panda Base", name_local: "成都大熊猫繁育研究基地", city: "Chengdu", category: "Wildlife", description: "See giant pandas up close", duration: "3h", price: "$10", best_time: "8:00am", weather_sensitivity: "Low", difficulty: "Easy", family: 1, teen: 1, photo: 9, tags: "wildlife,family,photo" },
    { id: uuidv4(), name: "Jinli Ancient Street", name_local: "锦里古街", city: "Chengdu", category: "Culture", description: "Traditional street food and crafts", duration: "2h", price: "Free", best_time: "Evening", weather_sensitivity: "Low", difficulty: "Easy", family: 1, teen: 1, photo: 7, tags: "culture,food,shopping" },
    { id: uuidv4(), name: "People's Park", name_local: "人民公园", city: "Chengdu", category: "Nature", description: "Tea houses and local life", duration: "2h", price: "Free", best_time: "Morning", weather_sensitivity: "Medium", difficulty: "Easy", family: 1, teen: 1, photo: 6, tags: "nature,tea,relax" },
    { id: uuidv4(), name: "Mount Qingcheng", name_local: "青城山", city: "Chengdu", category: "Nature", description: "Taoist mountain temples", duration: "6h", price: "$15", best_time: "8:00am", weather_sensitivity: "High", difficulty: "Moderate", family: 0, teen: 1, photo: 8, tags: "nature,hiking,temples" },
    { id: uuidv4(), name: "Taikoo Li", name_local: "太古里", city: "Chengdu", category: "Shopping", description: "Luxury shopping district", duration: "3h", price: "Free", best_time: "Afternoon", weather_sensitivity: "Low", difficulty: "Easy", family: 1, teen: 1, photo: 7, tags: "shopping,modern,food" },
    { id: uuidv4(), name: "Forbidden City", name_local: "故宫", city: "Beijing", category: "History", description: "Imperial palace complex", duration: "4h", price: "$8", best_time: "8:30am", weather_sensitivity: "Low", difficulty: "Easy", family: 1, teen: 1, photo: 9, tags: "history,architecture,unesco" },
    { id: uuidv4(), name: "Great Wall", name_local: "长城", city: "Beijing", category: "History", description: "Ancient defensive wall", duration: "5h", price: "$12", best_time: "8:00am", weather_sensitivity: "High", difficulty: "Moderate", family: 1, teen: 1, photo: 10, tags: "history,scenic,hiking" },
    { id: uuidv4(), name: "The Bund", name_local: "外滩", city: "Shanghai", category: "Landmark", description: "Historic waterfront", duration: "2h", price: "Free", best_time: "Sunset", weather_sensitivity: "Medium", difficulty: "Easy", family: 1, teen: 1, photo: 9, tags: "views,architecture,night" },
  ];
  db.write();
}

module.exports = db;
