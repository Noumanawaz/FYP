const fs = require('fs');

const code = fs.readFileSync('src/pages/RestaurantOwner/RestaurantOwnerDashboard.tsx', 'utf8');
const lines = code.split('\n');
console.log(lines.slice(318, 440).join('\n'));
