exports.contact = (req, res) => res.render('contact', { title: 'Contact Us' });

exports.submitContact = async (req, res) => {
  // Simulate sending email or save to DB
  console.log('Contact form submitted:', req.body);
  req.flash('success_msg', 'Message sent');
  res.redirect('/contact');
};
