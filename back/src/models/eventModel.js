const mongoose = require("mongoose")

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "El título es obligatorio"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  startDate: {
    type: Date,
    required: [true, "La fecha de inicio es obligatoria"],
  },
  endDate: {
    type: Date,
    required: [true, "La fecha de finalización es obligatoria"],
  },
  location: {
    type: String,
    trim: true,
  },
  photos: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photo",
    },
  ],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Actualizar la fecha de modificación antes de guardar
eventSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

const Event = mongoose.model("Event", eventSchema)

module.exports = Event
