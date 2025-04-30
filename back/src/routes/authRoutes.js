const express = require("express")
const authController = require("../controllers/authController")
const { protect } = require("../middlewares/authMiddleware")

const router = express.Router()

// Rutas públicas
router.post("/register", authController.register)
router.post("/login", authController.login)

// Rutas protegidas
router.get("/me", protect, authController.getCurrentUser)

module.exports = router
