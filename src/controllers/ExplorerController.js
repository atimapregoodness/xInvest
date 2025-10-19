const Transaction = require('../models/Transaction');

exports.explorer = async (req, res) => {
  const { search } = req.query;
  let query = {};
  if (search) {
    query.$or = [
      { txHash: { $regex: search, $options: 'i' } },
      { crypto: { $regex: search, $options: 'i' } },
      { type: { $regex: search, $options: 'i' } }
    ];
  }
  const transactions = await Transaction.find(query).sort({ date: -1 }).limit(50).populate('user', 'name');
  res.render('explorer', { title: 'Blockchain Explorer', transactions, search });
};
