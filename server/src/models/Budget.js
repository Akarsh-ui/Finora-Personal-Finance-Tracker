import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Budget category is required'],
      trim: true,
      minlength: [2, 'Category must be at least 2 characters'],
      maxlength: [60, 'Category cannot exceed 60 characters'],
    },
    monthlyLimit: {
      type: Number,
      required: [true, 'Monthly budget limit is required'],
      min: [1, 'Monthly limit must be greater than zero'],
      validate: {
        validator: function (v) {
          return typeof v === 'number' && Number.isFinite(v) && v > 0;
        },
        message: 'Monthly limit must be a positive finite number',
      },
    },
    month: {
      type: Number,
      required: [true, 'Month is required'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12'],
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [2000, 'Year must be 2000 or later'],
      max: [2100, 'Year must be 2100 or earlier'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring each user can have only one budget per category per month/year
budgetSchema.index({ user: 1, category: 1, month: 1, year: 1 }, { unique: true });
budgetSchema.index({ user: 1, month: 1, year: 1 });

// Clean JSON serialization
budgetSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id ? ret._id.toString() : undefined;
    delete ret.__v;
    return ret;
  },
});

const Budget = mongoose.model('Budget', budgetSchema);

export default Budget;
