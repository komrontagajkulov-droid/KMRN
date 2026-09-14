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
// МОДЕЛИ GEMINI
// ========================================

// Основная модель
const PRIMARY_MODEL = "gemini-3.5-flash";

// Резервная модель
const BACKUP_MODEL = "gemini-3.5-flash-lite";


// ========================================
// ЗАПРОС К GEMINI
// ========================================

async function requestGemini(model, message) {

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
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
        `Gemini ${model} response:`,
        JSON.stringify(data)
    );


    // Возвращаем информацию об ошибке
    if (!response.ok) {

        const error = new Error(
            data.error?.message ||
            "Ошибка Gemini API"
        );

        error.status = response.status;

        throw error;
    }


    // ========================================
    // ПОЛУЧАЕМ ТЕКСТ
    // ========================================

    const parts =
        data.candidates?.[0]?.content?.parts || [];


    const answer = parts
        .filter(part => part.text)
        .map(part => part.text)
        .join("");


    if (!answer.trim()) {

        throw new Error(
            "Gemini не вернул текстовый ответ"
        );

    }


    return answer;
}


// ========================================
// AI CHAT
// ========================================

app.post("/api/chat", async (req, res) => {

    try {

        const message = req.body.message;


        // Проверяем сообщение

        if (!message || !message.trim()) {

            return res.status(400).json({
                error: "Сообщение пустое"
            });

        }


        console.log(
            "Пользователь:",
            message
        );


        let answer = null;


        // ========================================
        // 1. ПРОБУЕМ ОСНОВНУЮ МОДЕЛЬ
        // ========================================

        try {

            console.log(
                `Пробуем ${PRIMARY_MODEL}`
            );


            answer = await requestGemini(
                PRIMARY_MODEL,
                message
            );


        } catch (error) {

            console.error(
                `${PRIMARY_MODEL} ошибка:`,
                error.message
            );


            // ========================================
            // 2. ЕСЛИ 503/429 — ПРОБУЕМ РЕЗЕРВ
            // ========================================

            if (
                error.status === 503 ||
                error.status === 429
            ) {

                console.log(
                    `Переключаемся на ${BACKUP_MODEL}`
                );


                try {

                    answer = await requestGemini(
                        BACKUP_MODEL,
                        message
                    );


                } catch (backupError) {

                    console.error(
                        `${BACKUP_MODEL} ошибка:`,
                        backupError.message
                    );


                    throw backupError;
                }


            } else {

                throw error;

            }

        }


        // ========================================
        // ПРОВЕРКА ОТВЕТА
        // ========================================

        if (!answer) {

            throw new Error(
                "Не удалось получить ответ от Gemini"
            );

        }


        console.log(
            "KMRN AI ответ:",
            answer
        );


        // ========================================
        // SSE ОТВЕТ
        // ========================================
        //
        // Твой текущий index.html ожидает
        // потоковый формат data: {...}
        //
        // Gemini здесь отвечает целиком,
        // после чего мы передаём ответ
        // браузеру через SSE.
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


        // Отправляем текст

        res.write(
            `data: ${JSON.stringify({
                text: answer
            })}\n\n`
        );


        // Завершение потока

        res.write(
            `data: [DONE]\n\n`
        );


        res.end();


    } catch (error) {

        console.error(
            "SERVER ERROR:",
            error
        );


        // Если поток ещё не был открыт,
        // отправляем обычную ошибку

        if (!res.headersSent) {

            return res.status(500).json({

                error:
                    "KMRN AI временно не может получить ответ. Попробуйте ещё раз."

            });

        }


        res.write(
            `data: ${JSON.stringify({
                error:
                    "KMRN AI временно не может получить ответ."
            })}\n\n`
        );


        res.end();

    }

});


// ========================================
// ЗАПУСК СЕРВЕРА
// ========================================

const PORT =
    process.env.PORT || 3000;


app.listen(PORT, () => {

    console.log(
        `KMRN AI запущен на порту ${PORT}`
    );

});
```
