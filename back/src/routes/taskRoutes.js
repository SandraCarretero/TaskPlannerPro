const express = require("express")
const taskController = require("../controllers/taskController")
const { protect, restrictTo } = require("../middlewares/authMiddleware")

const router = express.Router()

// Rutas protegidas para todos los usuarios
router.use(protect)

router.get("/", taskController.getTasks)
router.post("/", taskController.createTask)
router.get("/:id", taskController.getTask)
router.patch("/:id", taskController.updateTask)
router.delete("/:id", taskController.deleteTask)

// Rutas solo para administradores
router.get("/admin/all", restrictTo("admin"), taskController.getAllTasks)

module.exports = router
