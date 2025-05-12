const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { sendRegistrationConfirmation } = require('./emailService');
const { AppError } = require('../utils/errorUtil');

const JWT_SECRET = process.env.JWT_SECRET || 'taskplanner-secret-key';

const generateToken = user => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

exports.registerUser = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new AppError('El email ya está registrado', 400);

  const role = email.endsWith('@admin.com') ? 'admin' : 'user';
  const user = new User({ name, email, password, role });
  await user.save();

  await sendRegistrationConfirmation({ name: user.name, email: user.email });

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};

exports.loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError('Credenciales inválidas', 401);

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) throw new AppError('Credenciales inválidas', 401);

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    }
  };
};

exports.getCurrentUser = async userId => {
  const user = await User.findById(userId).select('-password');
  if (!user) throw new AppError('Usuario no encontrado', 404);
  return user;
};
