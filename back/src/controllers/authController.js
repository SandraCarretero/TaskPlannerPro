const authService = require("../services/authService")
const { AppError } = require("../utils/errorUtil")

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    const { token, user } = await authService.registerUser({ name, email, password })

    res.status(201).json({
      status: "success",
      data: { token, user },
    })
  } catch (error) {
    next(error)
  }
}

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const { token, user } = await authService.loginUser({ email, password })

    res.status(200).json({
      status: "success",
      data: { token, user },
    })
  } catch (error) {
    next(error)
  }
}

exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.id)

    res.status(200).json({
      status: "success",
      data: { user },
    })
  } catch (error) {
    next(error)
  }
}
