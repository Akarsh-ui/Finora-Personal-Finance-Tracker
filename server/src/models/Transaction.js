import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description/title is required'],
      trim: true,
      minlength: [2, 'Description must be at least 2 characters'],
      maxlength: [150, 'Description cannot exceed 150 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
      validate: {
        validator: function (v) {
          return typeof v === 'number' && Number.isFinite(v) && v > 0;
        },
        message: 'Amount must be a positive finite number',
      },
    },
    type: {
      type: String,
      enum: {
        values: ['income', 'expense'],
        message: 'Type must be either income or expense',
      },
      required: [true, 'Transaction type is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      minlength: [2, 'Category must be at least 2 characters'],
      maxlength: [60, 'Category cannot exceed 60 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Transaction date is required'],
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: 'UPI Pay',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['completed', 'pending'],
      default: 'completed',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast user and date sorting/filtering
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1 });
transactionSchema.index({ user: 1, type: 1 });

// Ensure title is synchronized with description if missing
transactionSchema.pre('validate', function () {
  if (!this.description && this.title) {
    this.description = this.title;
  }
  if (!this.title && this.description) {
    this.title = this.description;
  }
});

// JSON formatting
transactionSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id ? ret._id.toString() : undefined;
    delete ret.__v;
    return ret;
  },
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
