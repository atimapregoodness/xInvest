module.exports = {
  ensureAuthenticated: (req, res, next) => {
    if (req.isAuthenticated()) return next();
    req.flash('error_msg', 'Please log in');
    res.redirect('/auth/login');
  },
  ensureAdmin: (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') return next();
    req.flash('error_msg', 'Access denied');
    res.redirect('/dashboard');
  }
};
