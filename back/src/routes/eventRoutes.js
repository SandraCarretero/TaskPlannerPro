const express = require("express")
const eventController = require("../controllers/eventController")
const { protect, restrictTo } = require("../middlewares/authMiddleware")

const router = express.Router()

// Rutas protegidas para todos los usuarios
router.use(protect)

router.get("/", eventController.getEvents)
router.post("/", eventController.createEvent)
router.get("/:id", eventController.getEvent)
router.patch("/:id", eventController.updateEvent)
router.delete("/:id", eventController.deleteEvent)

// Rutas solo para administradores
router.get("/admin/all", restrictTo("admin"), eventController.getAllEvents)

module.exports = router
