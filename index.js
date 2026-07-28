const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express().use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'EAATPJv8odAoBSIxHwnkgGL6kgUnMgAjmXtX3TyZAZCZAl5A3FVX80tzxp6croT0ZBq1AKJbZAWHGQA8Et0UI2raSTrccCYrIkFLCZCKXWkOnfInThcFLOn2AuqbKM873mrLwVMZBEp0ZCbZBVfmYkBLt8kigx6LRlCrtKkZChoYt9StpS0GucCRdktp0sakhndtQRrb22ylZAZANfQZDZD';
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
        let text = received_message.text.toLowerCase();

        // 1. Ако му кажеш "здраво"
        if (text.includes("здраво")) {
            response = {
                "text": "Здраво! 👋 Како си денес? Напиши ми 'прати ми слика од научна фантастика' за да ти пратам нешто интересно :>! 🚀"
            };
        } 
        // 2. Ако побараш слика од научна фантастика
       // Новиот код со динамична (рандом) слика
        else if (text.includes("научна фантастика") || text.includes("прати ми слика")) {
            // Листа со директни слики што Facebook ги прифаќа веднаш
            let scifiImages = [
                "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?q=80&w=600",
                "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600",
                "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=600",
                "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600"
            ];

            // Избира случајна слика од листата
            let randomImage = scifiImages[Math.floor(Math.random() * scifiImages.length)];

            response = {
                "attachment": {
                    "type": "image",
                    "payload": {
                        "url": randomImage,
                        "is_reusable": false
                    }
                }
            };
        }
        // 3. За сè останато
        else {
            response = {
                "text": "Не те разбрав точно. Пиши ми 'здраво' или 'прати ми слика од научна фантастика'! 🤖"
            };
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
