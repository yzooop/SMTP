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

// 날짜를 원하는 형식으로 변환 (파일 이름에 적합한 형식)
function formatDateToFilename(inputDate) {
    const d = new Date(inputDate);

    if (isNaN(d)) {
        console.warn('Invalid date input, using current date instead.');
        inputDate = new Date();
    }

    const date = d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }).replace(/\./g, '-').trim();
    const time = d.toLocaleTimeString('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour12: false, // 24시간 형식
    });

    return `${date} ${time}`; // 예: 2024-12-06 15:50:55
}

// 날짜를 표시 형식으로 변환
function formatDateToTimestamp(inputDate) {
    const d = new Date(inputDate);

    if (isNaN(d)) {
        console.warn('Invalid date input, using current date instead.');
        inputDate = new Date();
    }

    const date = d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
    const time = d.toLocaleTimeString('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour12: false, // 24시간 형식
    });

    return `${date} ${time}`; // 예: 2024.12.06 15:50:55
}

// 첨부파일 저장 함수
function saveAttachmentsWithTimestamp(attachments) {
    const savedAttachments = [];

    for (const attachment of attachments) {
        const timestamp = formatDateToFilename(new Date());
        const filename = `${timestamp}.jpg`; // 타임스탬프 기반 파일 이름
        const filePath = path.join(ATTACHMENTS_DIR, filename);

        // 파일 저장
        fs.writeFileSync(filePath, attachment.content);
        savedAttachments.push(filePath);

        console.log(`Attachment saved: ${filePath}`);
    }

    return savedAttachments;
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

                const { from, subject, text, date, attachments } = parsedEmail;

                // 첨부파일 저장
                let savedAttachments = [];
                if (attachments && attachments.length > 0) {
                    console.log(`Found ${attachments.length} attachment(s).`);
                    savedAttachments = saveAttachmentsWithTimestamp(attachments);
                } else {
                    console.log('No attachments found.');
                }

                // CCTV 이벤트 저장
                const cctvEvent = {
                    from: from.text,
                    subject,
                    text,
                    timestamp: formatDateToTimestamp(date || new Date()),
                    attachments: savedAttachments, // 저장된 첨부파일 경로 추가
                };

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

server.listen(2525, () => {
    console.log('SMTP Server running');
});
