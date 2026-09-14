```javascript
const express = require("express");

const app = express();

app.use(express.json());
app.use(express.static("."));


// ========================================
// ПРОВЕРКА СЕРВЕРА
// ========================================

app.get("/api/status", (req, res) => {
    res.json({
        status: "KMRN AI работает"
    });
});


// ========================================
// GEMINI
// ========================================

async function askGemini(message) {

    const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": process.env.GEMINI_API_KEY
            },

            body: JSON.stringify({

                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: message
                            }
                        ]
                    }
                ]

            })
        }
    );


    const data = await response.json();


    console.log(
        "Gemini response:",
        JSON.stringify(data)
    );


    // ========================================
    // ПРОВЕРКА ОШИБКИ
    // ========================================

    if (!response.ok) {

        throw new Error(
            data.error?.message ||
            "Ошибка Gemini API"
        );

    }


    // ========================================
    // ПОЛУЧАЕМ ТЕКСТ GEMINI
    // ========================================

    const answer =
        data.candidates?.[0]
            ?.content
            ?.parts
            ?.map(part => part.text || "")
            ?.join("");


    // ========================================
    // ПРОВЕРКА ОТВЕТА
    // ========================================

    if (!answer || !answer.trim()) {

        console.error(
            "Gemini вернул данные, но текст отсутствует:",
            JSON.stringify(data)
        );

        throw new Error(
            "Gemini не вернул текстовый ответ"
        );

    }


    return answer;

}


// ========================================
// CHAT
// ========================================

app.post("/api/chat", async (req, res) => {

    try {

        const message = req.body.message;


        if (!message || !message.trim()) {

            return res.status(400).json({
                error: "Сообщение пустое"
            });

        }


        console.log(
            "Пользователь:",
            message
        );


        // Получаем ответ Gemini

        const answer =
            await askGemini(message);


        console.log(
            "KMRN AI:",
            answer
        );


        // ========================================
        // SSE
        // ========================================

        res.setHeader(
            "Content-Type",
            "text/event-stream; charset=utf-8"
        );

        res.setHeader(
            "Cache-Control",
            "no-cache, no-transform"
        );

        res.setHeader(
            "Connection",
            "keep-alive"
        );


        // Отправляем ответ

        res.write(
            `data: ${JSON.stringify({
                text: answer
            })}\n\n`
        );


        // Сообщаем браузеру,
        // что ответ закончен

        res.write(
            `data: [DONE]\n\n`
        );


        res.end();


    } catch (error) {

        console.error(
            "SERVER ERROR:",
            error
        );


        if (!res.headersSent) {

            return res.status(500).json({

                error:
                    error.message ||
                    "Ошибка сервера KMRN AI"

            });

        }


        res.write(
            `data: ${JSON.stringify({
                error:
                    error.message ||
                    "Ошибка KMRN AI"
            })}\n\n`
        );


        res.end();

    }

});


// ========================================
// ЗАПУСК
// ========================================

const PORT =
    process.env.PORT || 3000;


app.listen(PORT, () => {

    console.log(
        `KMRN AI запущен на порту ${PORT}`
    );

});
```
