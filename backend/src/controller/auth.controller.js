const authService = require("../services/auth.services");

async function login(req, res) {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "idToken is required" });
  }

  try {
    const user = await authService.loginWithFirebase(idToken);
    res.json({ user });
  } catch (err) {
    console.error("Auth login error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// 🔹 New: return the currently authenticated user (from middleware)
async function me(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ user: req.user });
}

module.exports = {
  login,
  me,
};
