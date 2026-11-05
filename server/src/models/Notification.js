import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must belong to a user'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    type: {
      type: String,
      enum: {
        values: [
          'budget_warning',
          'budget_exceeded',
          'transaction_activity',
          'monthly_summary',
          'system',
        ],
        message: '{VALUE} is not a valid notification type',
      },
      required: true,
      default: 'system',
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    relatedEntityId: {
      type: String,
      trim: true,
      default: null,
    },
    relatedEntityType: {
      type: String,
      enum: ['transaction', 'budget', 'report', null],
      default: null,
    },
    deduplicationKey: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user query speed
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

// Sparse compound unique index to guarantee deduplication per user when key is present
notificationSchema.index(
  { user: 1, deduplicationKey: 1 },
  {
    unique: true,
    partialFilterExpression: { deduplicationKey: { $type: 'string' } },
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
