const { SMTPServer } = require('smtp-server');
const fs = require('fs');
const path = require('path');
const { simpleParser } = require('mailparser');

// JSON 파일 경로
const DATA_FILE = './cctv_data.json';
const ATTACHMENTS_DIR = './attachments';

// JSON 파일이 없거나 비어 있으면 초기화
if (!fs.existsSync(DATA_FILE) || fs.readFileSync(DATA_FILE, 'utf8').trim() === '') {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// 첨부파일 폴더 생성
if (!fs.existsSync(ATTACHMENTS_DIR)) {
    fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
}

// 첨부파일 저장 함수
function saveAttachmentsWithTimestamp(attachments, timestamp) {
    const savedAttachments = [];

    for (const attachment of attachments) {
        const filename = `${timestamp}.jpg`; // 타임스탬프 기반 파일 이름
        const filePath = path.join(ATTACHMENTS_DIR, filename);

        // 파일 저장
        fs.writeFileSync(filePath, attachment.content);
        savedAttachments.push(filePath);

        console.log('Attachment saved');
    }

    return savedAttachments;
}

// 다음 ID 가져오기
function getNextId(cctvData) {
    if (!Array.isArray(cctvData) || cctvData.length === 0) {
        return 1;
    }
    const maxId = Math.max(...cctvData.map(event => event.id || 0)); // ID가 없을 경우를 대비
    return maxId + 1;
}

// SMTP 서버 생성
const server = new SMTPServer({
    onData(stream, session, callback) {
        let emailData = '';

        stream.on('data', chunk => {
            emailData += chunk;
        });

        stream.on('end', async () => {
            try {
                // 이메일 데이터 파싱
                const parsedEmail = await simpleParser(emailData);
                const timestampMatch = parsedEmail.text.match(/EVENT TIME: (.+)/);
                const timestamp = timestampMatch ? timestampMatch[1].trim() : new Date().toISOString(); // 기본값 처리
                const { attachments } = parsedEmail;

                // 첨부파일 저장
                let savedAttachments = [];
                if (attachments && attachments.length > 0) {
                    savedAttachments = saveAttachmentsWithTimestamp(attachments, timestamp);
                }

                // CCTV 데이터 가져오기
                const cctvData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
                const nextId = getNextId(cctvData);

                // CCTV 이벤트 저장
                const cctvEvent = {
                    id: nextId,
                    time: timestamp,
                };

                cctvData.push(cctvEvent);
                fs.writeFileSync(DATA_FILE, JSON.stringify(cctvData, null, 2));

                console.log('CCTV Event Saved !');
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

server.listen(2525, () => {
    console.log('SMTP Server running');
});
