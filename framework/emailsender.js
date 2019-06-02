const nodemailer = require("nodemailer");
const logger = require("../framework/logger");
const { EMAIL_SERVICE ,EMAIL_AUTH,EMAIL_PASSWORD} = require("../config");

const transporter = nodemailer.createTransport({
  service: EMAIL_SERVICE || "gmail",
  auth: {
    user: EMAIL_AUTH,
    pass: EMAIL_PASSWORD
  }
});

module.exports.send = ({ from, to, subject, text }) => {
  logger.info(`Sending Email from ${from} to ${to}`);
  if (!from || !to || !subject || !text) {
    logger.error("Send Email: Required params not found");
  }
  const mailOptions = { from, to, subject, html:text };
  transporter.sendMail(mailOptions, (error, info) =>{
    if (error) {
      logger.error(`Send Email: ${JSON.stringify(error)}`);
    } else {
      logger.info(`Email sent: from: ${from}, to: ${to}, text: ${text} response: ${info.response}`);
    }
  });
};
