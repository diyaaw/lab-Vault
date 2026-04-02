const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'pathology', 'admin'],
    default: 'patient',
  },
  phone: {
    type: String,
  },
  age: {
    type: Number,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
  },
  bloodGroup: {
    type: String,
  },
  address: {
    type: String,
  },
  specialization: {
    type: String,
  },
  pathologyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  patientCustomId: {
    type: String,
    unique: true,
    sparse: true, // Only for patients
    index: true,
  },
  grantedDoctors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  mustChangePassword: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password and generate patient ID before saving
// NOTE: In Mongoose 9, async pre hooks must NOT call next() - just return.
userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  // Generate unique patient ID if role is patient and ID is missing
  if (this.role === 'patient' && !this.patientCustomId) {
    let isUnique = false;
    while (!isUnique) {
      const newId = `LV-${Math.floor(10000 + Math.random() * 90000)}`;
      const existingUser = await mongoose.model('User').findOne({ patientCustomId: newId });
      if (!existingUser) {
        this.patientCustomId = newId;
        isUnique = true;
      }
    }
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
