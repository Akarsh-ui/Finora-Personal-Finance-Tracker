import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [emailRegex, 'Please provide a valid email address'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    currency: {
      type: String,
      enum: {
        values: ['INR', 'USD', 'EUR', 'GBP'],
        message: '{VALUE} is not a supported currency. Choose from INR, USD, EUR, GBP.',
      },
      default: 'INR',
    },
    notifications: {
      budgetThresholdAlerts: {
        type: Boolean,
        default: true,
      },
      budgetExceededAlerts: {
        type: Boolean,
        default: true,
      },
      transactionActivityAlerts: {
        type: Boolean,
        default: true,
      },
      monthlySummaryAlerts: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash password before persisting
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare candidate password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe JSON serialization excluding password hash
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    name: this.name,
    email: this.email,
    currency: this.currency || 'INR',
    notifications: {
      budgetThresholdAlerts: this.notifications?.budgetThresholdAlerts ?? true,
      budgetExceededAlerts: this.notifications?.budgetExceededAlerts ?? true,
      transactionActivityAlerts: this.notifications?.transactionActivityAlerts ?? true,
      monthlySummaryAlerts: this.notifications?.monthlySummaryAlerts ?? true,
    },
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Ensure toJSON also strips password
userSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.__v;
    ret.id = ret._id ? ret._id.toString() : undefined;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

export default User;
