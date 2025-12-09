require("dotenv").config();
const app = require("./app");
const { testConnection } = require("./db");

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`✅ Backend running on port ${PORT}`);
  await testConnection();
});
