const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express().use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'mojot_tajn_token_123';

// Верификација на Webhook со Facebook
app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// Примање на пораки од корисници
app.post('/webhook', (req, res) => {
    let body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(function(entry) {
            if (!entry.messaging || entry.messaging.length === 0) return;
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);

            let sender_psid = webhook_event.sender.id;
            if (webhook_event.message && webhook_event.message.text) {
                handleMessage(sender_psid, webhook_event.message);
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// Автоматски одговор
function handleMessage(sender_psid, received_message) {
    let response;

    if (received_message.text) {
        response = {
            "text": `Ти рече: "${received_message.text}". Јас сум минонот на Јован! 🤖`
        }
    }

    callSendAPI(sender_psid, response);
}

// Пратка на одговорот назад до Messenger
function callSendAPI(sender_psid, response) {
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }

    axios({
        method: 'POST',
        url: 'https://graph.facebook.com/v19.0/me/messages',
        params: { 'access_token': PAGE_ACCESS_TOKEN },
        data: request_body
    }).then(() => {
        console.log('Пораката е успешно испратена!');
    }).catch(err => {
        console.error('Грешка при праќање порака: ' + err);
    });
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Ботот слуша на порта ${PORT}`));
