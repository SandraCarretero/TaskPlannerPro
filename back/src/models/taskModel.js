const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El título es obligatorio'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  dueDate: {
    type: Date,
    required: [true, 'La fecha de vencimiento es obligatoria']
  },
  status: {
    type: String,
    enum: ['pending', 'progress', 'completed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['baja', 'media', 'alta'],
    default: 'media'
  },
  tags: [
    {
      type: String,
      enum: ['trabajo', 'personal', 'reunión', 'ocio', 'salud', 'otros']
    }
  ],
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Actualizar la fecha de modificación antes de guardar
taskSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
