const express = require("express");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.use(express.json()); // JSON 요청 처리

// Nodemailer를 통해 SMTP 전송 설정
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, // Gmail의 SMTP 포트 (SSL)
  secure: true, // SSL/TLS 사용 여부
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// 간단한 라우트: 이메일 전송 테스트
app.post("/send-email", async (req, res) => {
  const { to, subject, text } = req.body;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL, // 발신자 이메일
      to, // 수신자 이메일
      subject, // 이메일 제목
      text, // 이메일 본문
    });

    console.log("Email sent:", info.messageId);
    res.status(200).send({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send({ success: false, message: "Failed to send email." });
  }
});

// 서버 실행
app.listen(8000, () => {
  console.log("SMTP Server running on http://localhost:8000");
});
