const { SMTPServer } = require('smtp-server');
const fs = require('fs');
const simpleParser = require('mailparser').simpleParser;

// JSON 파일 경로
const DATA_FILE = './cctv_data.json';

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// SMTP 서버 생성
const server = new SMTPServer({
    onData(stream, session, callback) {
        console.log('test : ', stream);
        let emailData = '';

        stream.on('data', chunk => {
            emailData += chunk;
        });

        stream.on('end', async () => {
            try {
                // 이메일 데이터 파싱
                const parsedEmail = await simpleParser(emailData);

                const { from, subject, text, date } = parsedEmail;
                const cctvEvent = {
                    from: from.text,
                    subject,
                    text,
                    timestamp: date || new Date(),
                };

                // JSON 파일에 저장
                const cctvData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
                cctvData.push(cctvEvent);
                fs.writeFileSync(DATA_FILE, JSON.stringify(cctvData, null, 2));

                console.log('CCTV Event Saved:', cctvEvent);
                callback(); // 성공
            } catch (error) {
                console.error('Error parsing email:', error);
                callback(error); // 실패
            }
        });
    },

    // 인증 비활성화
    authOptional: true,
});

server.listen(25, () => {
    console.log('SMTP Server running');
});
