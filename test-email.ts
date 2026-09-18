import nodemailer from 'nodemailer';
import { configs } from './src/app/configs/index.ts';

const t0 = performance.now();
const transporter = nodemailer.createTransport({
  host: configs.nodeMailer.host,
  port: 587,
  secure: false,
  auth: {
    user: configs.nodeMailer.email,
    pass: configs.nodeMailer.password,
  },
});

console.log('Sending email...');
await transporter.sendMail({
  from: \"\" <\>\,
  to: 'test@example.com',
  subject: 'Test',
  html: 'Test',
  text: 'Test',
});
const t1 = performance.now();
console.log('Email sent in:', t1 - t0, 'ms');
