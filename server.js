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

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {

        try {

            console.log(
                `Gemini attempt ${attempt}/${maxAttempts}`
            );


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
            // 503 / 429
            // ========================================

            if (
                response.status === 503 ||
                response.status === 429
            ) {

                if (attempt < maxAttempts) {

                    const delay =
                        Math.pow(2, attempt) * 1000;


                    console.log(
                        `Gemini временно недоступен. Повтор через ${delay} мс`
                    );


                    await new Promise(
                        resolve =>
                            setTimeout(resolve, delay)
                    );


                    continue;

                }

            }


            // ========================================
            // ОШИБКА GEMINI
            // ========================================

            if (!response.ok) {

                throw new Error(
                    data.error?.message ||
                    "Ошибка Gemini API"
                );

            }


            // ========================================
            // ПОЛУЧАЕМ ТЕКСТ
            // ========================================

            const parts =
                data.candidates?.[0]
                    ?.content
                    ?.parts || [];


            let answer = "";


            for (const part of parts) {

                if (
                    typeof part.text === "string"
                ) {

                    answer += part.text;

                }

            }


            // ========================================
            // ПРОВЕРКА
            // ========================================

            if (answer.trim()) {

                console.log(
                    "KMRN AI ответ:",
                    answer
                );


                return answer;

            }


            console.error(
                "Gemini вернул ответ без текста:",
                JSON.stringify(data)
            );


            throw new Error(
                "Gemini не вернул текстовый ответ"
            );


        } catch (error) {

            console.error(
                `Gemini attempt ${attempt} error:`,
                error.message
            );


            if (
                attempt === maxAttempts
            ) {

                throw error;

            }

        }

    }

}


// ========================================
// CHAT
// ========================================

app.post("/api/chat", async (req, res) => {

    try {

        const message =
            req.body?.message;


        // Проверяем сообщение

        if (
            typeof message !== "string" ||
            !message.trim()
        ) {

            return res.status(400).json({

                error:
                    "Сообщение пустое"

            });

        }


        console.log(
            "Пользователь:",
            message
        );


        // Запрашиваем Gemini

        const answer =
            await askGemini(message);


        // ========================================
        // ОТПРАВЛЯЕМ ОБЫЧНЫЙ JSON
        // ========================================

        return res.json({

            answer: answer

        });


    } catch (error) {

        console.error(
            "SERVER ERROR:",
            error
        );


        return res.status(500).json({

            error:
                error.message ||
                "Ошибка сервера KMRN AI"

        });

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
