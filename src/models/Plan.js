const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  slug: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  description: String,
  minAmount: { type: Number, default: 0 },
  apy: { type: Number, required: true }, // e.g., 12 meaning 12%
  durationDays: { type: Number, default: 30 },
  payoutInterval: { type: String, enum: ['daily','weekly','monthly'], default: 'daily' },
  featured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Plan', PlanSchema);
