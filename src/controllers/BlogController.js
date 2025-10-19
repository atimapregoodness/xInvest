exports.blog = (req, res) => {
  const posts = [
    { title: 'Understanding Bitcoin', content: 'Bitcoin is the first decentralized cryptocurrency...' },
    { title: 'USDT Staking Guide', content: 'Learn how to stake USDT for yields...' }
  ];
  res.render('blog', { title: 'Blog', posts });
};
