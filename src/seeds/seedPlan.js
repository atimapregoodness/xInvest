const mongoose = require('mongoose');
require('dotenv').config();
const Plan = require('../src/models/Plan');

async function seed(){
  await mongoose.connect(process.env.MONGODB_URI);
  const plans = [
    { slug:'starter', title:'Starter', apy: 8, minAmount: 100, durationDays: 30, payoutInterval:'daily', featured:false },
    { slug:'pro', title:'Pro', apy: 12, minAmount: 1000, durationDays: 90, payoutInterval:'weekly', featured:true },
    { slug:'institutional', title:'Institutional', apy:18, minAmount:10000, durationDays:180, payoutInterval:'monthly', featured:false }
  ];
  for(const p of plans){
    await Plan.updateOne({slug:p.slug}, p, { upsert: true });
  }
  console.log('Plans seeded'); process.exit(0);
}
seed();
