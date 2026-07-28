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
            // Ги земаме само зборовите по "генерирај:"
            let prompt_macedonian = text.split(":")[1] || text.split("генерирај")[1];
            prompt_macedonian = prompt_macedonian.trim();

            response = { "text": `Секако! Ги користам моите AI моќи за да создадам слика од Великиот Око: '${prompt_macedonian}'! Ве молам почекајте малку... ⌛` };
            callSendAPI(sender_psid, response); // Праќаме порака за потврда

            // Го преведуваме описот на англиски (многу едноставен превод за демо, ти ќе мора да додадеш подобар)
            let prompt_english = prompt_macedonian
                .replace("велкоз", "Vel'koz")
                .replace("на плажа", "on the beach")
                .replace("како", "like")
                .replace("инженерот", "the engineer")
                .replace("на марс", "on Mars")
                .replace("скин", "skin")
                .replace("спарк-панк", "spark-punk");
            
            // Ако не го преведовме целосно, барем да има 'Vel'koz' во описот
            if (!prompt_english.includes("Vel'koz")) {
                prompt_english = "Vel'koz " + prompt_english;
            }

            try {
                // Генерираме слика користејќи бесплатен API сервис (ова е демо и може да не работи секогаш)
                // За да работи ова демо, користиме бесплатен модел кој генерира само стилизирани слики
                // Во вистинска апликација, треба да користиш платен API (OpenAI/DALL-E) и да ставиш свој клуч.
                
                let imageUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt_english)}`;

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
                response = { "text": "Не успеав да генерирам слика во моментов. Ве молам пробајте подоцна!" };
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
