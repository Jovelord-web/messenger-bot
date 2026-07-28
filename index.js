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

// Автоматски одговор (асинхрона функција за генерирање слики)
async function handleMessage(sender_psid, received_message) {
    let response;

    if (received_message.text) {
        let text = received_message.text.toLowerCase();

        if (text.includes("здраво")) {
            response = {
                "text": "Здраво! 👋 Јас сум твојот Vel'koz создавач! Пиши ми 'генерирај: [твојот опис за Vel\'koz]' и ќе ја направам сликата за тебе! 🚀"
            };
        } 
       else if (text.startsWith("генерирај:") || text.startsWith("генерирај ")) {
            let prompt_macedonian = text.split(":")[1] || text.split("генерирај")[1];
            prompt_macedonian = prompt_macedonian.trim();

            // 1. Веднаш му праќаме порака на корисникот дека AI-то работи
            callSendAPI(sender_psid, { "text": `🎨 Ја цртам сликата за: '${prompt_macedonian}'... Почекај околу 10 секунди! ⌛` });

            // 2. Превод на основни зборови
            let prompt_english = prompt_macedonian
                .replace("велкоз", "Vel'koz")
                .replace("на плажа", "on the beach")
                .replace("како", "like")
                .replace("на марс", "on Mars");

            if (!prompt_english.toLowerCase().includes("vel'koz") && !prompt_english.toLowerCase().includes("velkoz")) {
                prompt_english = "Vel'koz " + prompt_english;
            }

            try {
                // Правиме уникатен линк за секоја слика
                let randomSeed = Math.floor(Math.random() * 1000000);
                let imageUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt_english)}?width=512&height=512&nologo=true&seed=${randomSeed}`;

                // ВАЖНО: Прво го тераме нашиот бот да почека сликата да се нацрта во заднина,
                // за да може Фејсбук потоа да ја повлече за 0.1 секунда!
                await fetch(imageUrl);

                // 3. Сега и ја праќаме готовата слика на Facebook
                response = {
                    "attachment": {
                        "type": "image",
                        "payload": {
                            "url": imageUrl,
                            "is_reusable": false
                        }
                    }
                };
            } catch (error) {
                response = { "text": "Имаше грешка при генерирањето. Ве молам пробајте повторно!" };
            }
        }
        else {
            response = {
                "text": "Не те разбрав точно. Пиши ми 'здраво' или 'генерирај: [твојот опис]'! 🤖"
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
