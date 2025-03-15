const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  enrollment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  session: {
    type: String,
    enum: ['morning', 'afternoon', 'evening'],
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    required: true
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure unique attendance records per enrollment, date, and session
attendanceSchema.index({ enrollment: 1, date: 1, session: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance; 