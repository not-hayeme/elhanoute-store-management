const https = require('follow-redirects').https;

class WhatsAppService {
  constructor() {
    this.options = {
      'method': 'POST',
      'hostname': 'nmynq8.api.infobip.com',
      'path': '/whatsapp/1/message/template',
      'headers': {
        'Authorization': 'App adadc9c1364eeb557d78d56492b3341b-b355114d-afc2-4f54-ba2c-5f116d51aded',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      'maxRedirects': 20
    };
  }

  // Generate a 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP via WhatsApp
  async sendOTP(phoneNumber, otp) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        "messages": [
          {
            "from": "447860088970",
            "to": phoneNumber,
            "messageId": this.generateMessageId(),
            "content": {
              "templateName": "test_whatsapp_template_en",
              "templateData": {
                "body": {
                  "placeholders": [otp]
                }
              },
              "language": "en"
            }
          }
        ]
      });

      const req = https.request(this.options, (res) => {
        let chunks = [];

        res.on("data", (chunk) => {
          chunks.push(chunk);
        });

        res.on("end", () => {
          const body = Buffer.concat(chunks);
          try {
            const response = JSON.parse(body.toString());
            console.log('WhatsApp API Response:', response);
            resolve(response);
          } catch (error) {
            console.error('Error parsing WhatsApp response:', error);
            resolve({ success: true, rawResponse: body.toString() });
          }
        });

        res.on("error", (error) => {
          console.error('WhatsApp API Error:', error);
          reject(error);
        });
      });

      req.on('error', (error) => {
        console.error('Request Error:', error);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  // Send custom message
  async sendMessage(phoneNumber, message) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        "messages": [
          {
            "from": "447860088970",
            "to": phoneNumber,
            "messageId": this.generateMessageId(),
            "content": {
              "templateName": "test_whatsapp_template_en",
              "templateData": {
                "body": {
                  "placeholders": [message]
                }
              },
              "language": "en"
            }
          }
        ]
      });

      const req = https.request(this.options, (res) => {
        let chunks = [];

        res.on("data", (chunk) => {
          chunks.push(chunk);
        });

        res.on("end", () => {
          const body = Buffer.concat(chunks);
          try {
            const response = JSON.parse(body.toString());
            resolve(response);
          } catch (error) {
            resolve({ success: true, rawResponse: body.toString() });
          }
        });

        res.on("error", (error) => {
          reject(error);
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  // Generate unique message ID
  generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Validate phone number format (should start with country code)
  validatePhoneNumber(phoneNumber) {
    // Basic validation - should be numeric and reasonable length
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    return cleanNumber.length >= 10 && cleanNumber.length <= 15;
  }
}

module.exports = new WhatsAppService();