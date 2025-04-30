const express = require("express")
const photoController = require("../controllers/avatarController")
const { protect } = require("../middlewares/authMiddleware")
const { uploadPhoto } = require("../middlewares/uploadMiddleware")

const router = express.Router()

// Rutas protegidas para todos los usuarios
router.use(protect)

router.get('/me', photoController.getAvatar);
router.get('/:userId', photoController.getAvatar);
router.post("/avatar", uploadPhoto.single("avatar"), photoController.uploadAvatar)
router.delete("/:id", photoController.deleteAvatar)

module.exports = router
