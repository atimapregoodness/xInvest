// src/controllers/investController.js
exports.createInvestment = async (req, res) => {
  try {
    const { amount, plan } = req.body;
    if (!amount || !plan) {
      req.flash("error_msg", "All fields are required.");
      return res.redirect("/invest");
    }

    // Simulate database save (replace with real DB model)
    console.log("Investment received:", { user: req.user?._id, amount, plan });

    req.flash("success_msg", "Investment successfully created!");
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Investment error:", error);
    req.flash("error_msg", "Something went wrong while creating investment.");
    res.redirect("/invest");
  }
};
