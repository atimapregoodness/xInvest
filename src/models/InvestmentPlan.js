const mongoose = require("mongoose");

const investmentPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Plan description is required"],
      trim: true,
    },
    icon: {
      type: String,
      required: [true, "Plan icon is required"],
      default: "fas fa-chart-line",
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be positive"],
    },
    roi: {
      type: Number,
      required: [true, "ROI is required"],
      default: 10,
      min: [1, "ROI must be at least 1%"],
      max: [100, "ROI cannot exceed 100%"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      default: "General",
      trim: true,
      enum: {
        values: [
          "Beginner",
          "Intermediate",
          "Professional",
          "Elite",
          "Advanced",
          "Exclusive",
        ],
        message:
          "Category must be Beginner, Intermediate, Professional, Elite, Advanced, or Exclusive",
      },
    },
    features: {
      type: [String],
      required: [true, "Features are required"],
      validate: {
        validator: function (features) {
          return features && features.length > 0;
        },
        message: "At least one feature is required",
      },
    },
    duration: {
      type: String,
      required: [true, "Duration is required"],
      trim: true,
    },
    riskLevel: {
      type: String,
      required: [true, "Risk level is required"],
      enum: {
        values: ["Low", "Medium", "High", "Very High"],
        message: "Risk level must be Low, Medium, High, or Very High",
      },
    },
    // Keep image for backward compatibility, but mark as optional
    image: {
      type: String,
      default: "/images/plans/default-plan.png",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Additional fields for enhanced functionality
    minInvestment: {
      type: Number,
      default: 0,
      min: [0, "Minimum investment must be positive"],
    },
    maxInvestment: {
      type: Number,
      min: [0, "Maximum investment must be positive"],
    },
    tags: {
      type: [String],
      default: [],
    },
    popularity: {
      type: Number,
      default: 0,
      min: 0,
    },
    recommended: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for formatted price display
investmentPlanSchema.virtual("formattedPrice").get(function () {
  return `$${this.price.toFixed(2)}`;
});

// Virtual for formatted ROI display
investmentPlanSchema.virtual("formattedROI").get(function () {
  return `${this.roi}%`;
});

// Virtual for display name with category
investmentPlanSchema.virtual("displayName").get(function () {
  return `${this.name} - ${this.category}`;
});

// Instance method to check if plan is affordable
investmentPlanSchema.methods.isAffordable = function (amount) {
  return amount >= (this.minInvestment || this.price);
};

// Instance method to get risk color
investmentPlanSchema.methods.getRiskColor = function () {
  const colors = {
    Low: "success",
    Medium: "warning",
    High: "danger",
    "Very High": "dark",
  };
  return colors[this.riskLevel] || "secondary";
};

// Static method to find plans by risk level
investmentPlanSchema.statics.findByRiskLevel = function (riskLevel) {
  return this.find({ riskLevel, isActive: true });
};

// Static method to find featured plans
investmentPlanSchema.statics.getFeaturedPlans = function () {
  return this.find({ recommended: true, isActive: true })
    .sort({ popularity: -1, price: 1 })
    .limit(3);
};

// Static method to find plans by price range
investmentPlanSchema.statics.findByPriceRange = function (min, max) {
  return this.find({
    price: { $gte: min, $lte: max },
    isActive: true,
  }).sort({ price: 1 });
};

// Prevent duplicate names (case-insensitive)
investmentPlanSchema.pre("save", async function (next) {
  if (this.isModified("name")) {
    const existing = await mongoose.models.InvestmentPlan.findOne({
      name: new RegExp(`^${this.name}$`, "i"),
      _id: { $ne: this._id },
    });

    if (existing) {
      const err = new Error("Investment plan with this name already exists");
      err.status = 400;
      return next(err);
    }
  }
  next();
});

// Auto-set minInvestment to price if not provided
investmentPlanSchema.pre("save", function (next) {
  if (!this.minInvestment && this.minInvestment !== 0) {
    this.minInvestment = this.price;
  }
  next();
});

// Index for better query performance
investmentPlanSchema.index({ category: 1, price: 1 });
investmentPlanSchema.index({ riskLevel: 1 });
investmentPlanSchema.index({ isActive: 1, recommended: 1 });
investmentPlanSchema.index({ popularity: -1 });

module.exports = mongoose.model("InvestmentPlan", investmentPlanSchema);
