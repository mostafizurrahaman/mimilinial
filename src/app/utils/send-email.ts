import nodemailer from "nodemailer";
import { configs } from "../configs";

// ?? Create a transport
const transporter = nodemailer.createTransport({
   host: configs.nodeMailer.host,
   port: 587,
   secure: false,
   auth: {
      user: configs.nodeMailer.email,
      pass: configs.nodeMailer.password,
   },
});

// ?? Send Email:
export const sendEmail = async (
   to: string,
   subject: string,
   text: string,
   html: string,
   replyTo?: string,
) => {
   const replyEmail = configs?.nodeMailer.replyTo || replyTo;
   try {
      const info = await transporter.sendMail({
         from: `"${configs.site.name}" <${configs.nodeMailer.email}>`,
         to,
         subject: subject,
         replyTo: replyEmail,
         html: html,
         text: text,
      });

      console.log("Message sent: %s", info.messageId);
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
   } catch (err) {
      console.error("Error while sending mail:", err);
   }
};
