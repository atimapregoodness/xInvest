const mongoose = require("mongoose");

const emailTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: function () {
        return this.isTemplate;
      },
    },
    subject: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    recipients: {
      type: String,
      required: function () {
        return !this.isTemplate;
      },
    },
    isTemplate: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    messageId: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
emailTemplateSchema.index({ isTemplate: 1, createdAt: -1 });
emailTemplateSchema.index({ sentAt: -1 });

module.exports = mongoose.model("EmailTemplate", emailTemplateSchema);
