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
// НАСТРОЙКИ GEMINI
// ========================================

const GEMINI_MODEL = "gemini-3.8-flash";

const GEMINI_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;


// ========================================
// ЗАПРОС К GEMINI
// ========================================

async function askGemini(message) {

    const maxAttempts = 3;


    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        try {

            console.log(
                `Gemini attempt ${attempt}/${maxAttempts}`
            );


            // ====================================
            // ОТПРАВЛЯЕМ ЗАПРОС
            // ====================================

            const response = await fetch(
                GEMINI_URL,
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "x-goog-api-key":
                            process.env.GEMINI_API_KEY

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


            // ====================================
            // ПОЛУЧАЕМ JSON
            // ====================================

            const data =
                await response.json();


            console.log(
                "Gemini HTTP status:",
                response.status
            );


            console.log(
                "Gemini response:",
                JSON.stringify(data)
            );


            // ====================================
            // ВРЕМЕННАЯ ОШИБКА
            // ====================================

            if (
                response.status === 503 ||
                response.status === 429 ||
                response.status === 408 ||
                response.status >= 500
            ) {

                if (
                    attempt < maxAttempts
                ) {

                    const delay =
                        2000 * Math.pow(
                            2,
                            attempt - 1
                        );


                    console.log(
                        `Gemini временно недоступен. Повтор через ${delay} мс`
                    );


                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                delay
                            )
                    );


                    continue;

                }

            }


            // ====================================
            // ОШИБКА API
            // ====================================

            if (!response.ok) {

                const errorMessage =
                    data?.error?.message ||
                    `Gemini HTTP ${response.status}`;


                throw new Error(
                    errorMessage
                );

            }


            // ====================================
            // ПРОВЕРЯЕМ CANDIDATE
            // ====================================

            const candidate =
                data?.candidates?.[0];


            if (!candidate) {

                console.error(
                    "Gemini не вернул candidate:",
                    JSON.stringify(data)
                );


                throw new Error(
                    "Gemini не вернул candidate"
                );

            }


            // ====================================
            // ПОЛУЧАЕМ PARTS
            // ====================================

            const parts =
                candidate?.content?.parts || [];


            console.log(
                "Gemini parts:",
                JSON.stringify(parts)
            );


            // ====================================
            // ПОЛУЧАЕМ ТЕКСТ
            // ====================================

            const textParts = parts.filter(
                part => {

                    return (
                        typeof part?.text === "string" &&
                        part.text.trim().length > 0 &&
                        part.thought !== true
                    );

                }
            );


            const answer =
                textParts
                    .map(part => part.text)
                    .join("");


            console.log(
                "FINAL ANSWER:",
                answer
            );


            // ====================================
            // ПРОВЕРКА ТЕКСТА
            // ====================================

            if (
                typeof answer === "string" &&
                answer.trim().length > 0
            ) {

                return answer;

            }


            // ====================================
            // ЕСЛИ TEXT НЕ НАЙДЕН
            // ====================================

            console.error(
                "Gemini вернул ответ, но текст не найден:"
            );


            console.error(
                JSON.stringify(
                    data,
                    null,
                    2
                )
            );


            throw new Error(
                "Gemini не вернул текстовый ответ"
            );


        } catch (error) {

            console.error(
                `Gemini attempt ${attempt} error:`,
                error.message
            );


            // Последняя попытка

            if (
                attempt === maxAttempts
            ) {

                throw error;

            }

        }

    }


    throw new Error(
        "Не удалось получить ответ Gemini"
    );

}


// ========================================
// CHAT API
// ========================================

app.post(
    "/api/chat",
    async (req, res) => {

        try {

            // ====================================
            // ПОЛУЧАЕМ СООБЩЕНИЕ
            // ====================================

            const message =
                req.body?.message;


            // ====================================
            // ПРОВЕРКА
            // ====================================

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


            // ====================================
            // ЗАПРАШИВАЕМ GEMINI
            // ====================================

            const answer =
                await askGemini(
                    message
                );


            // ====================================
            // ЛОГ
            // ====================================

            console.log(
                "KMRN AI:",
                answer
            );


            // ====================================
            // ОТВЕТ БРАУЗЕРУ
            // ====================================

            return res.status(200).json({

                answer: answer

            });

        }


        catch (error) {

            console.error(
                "SERVER ERROR:",
                error
            );


            // ====================================
            // ОШИБКА
            // ====================================

            return res.status(500).json({

                error:
                    error.message ||
                    "Ошибка сервера KMRN AI"

            });

        }

    }
);


// ========================================
// ЗАПУСК
// ========================================

const PORT =
    process.env.PORT || 3000;


app.listen(
    PORT,
    () => {

        console.log(
            `KMRN AI запущен на порту ${PORT}`
        );

    }
);
```
