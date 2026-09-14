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
// ЗАПРОС К GEMINI
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
                        ],

                        generationConfig: {

                            thinkingConfig: {
                                thinkingLevel: "low"
                            }

                        }

                    })
                }
            );


            const data = await response.json();


            console.log(
                "Gemini response:",
                JSON.stringify(data)
            );


            // ========================================
            // ВРЕМЕННАЯ ПЕРЕГРУЗКА GEMINI
            // ========================================

            if (
                response.status === 503 ||
                response.status === 429
            ) {

                if (attempt < maxAttempts) {

                    const delay = attempt * 2000;

                    console.log(
                        `Gemini временно недоступен. Повтор через ${delay} мс`
                    );


                    await new Promise(
                        resolve => setTimeout(resolve, delay)
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
            // ПОЛУЧАЕМ ОТВЕТ
            // ========================================

            const parts =
                data.candidates?.[0]?.content?.parts || [];


            const answer = parts
                .filter(part => {

                    return (
                        part.text &&
                        part.thought !== true
                    );

                })
                .map(part => part.text)
                .join("");


            // ========================================
            // ПРОВЕРКА ОТВЕТА
            // ========================================

            if (!answer.trim()) {

                console.error(
                    "Gemini не вернул текст.",
                    JSON.stringify(data, null, 2)
                );


                throw new Error(
                    "Gemini не вернул текстовый ответ"
                );

            }


            return answer;


        } catch (error) {

            console.error(
                `Gemini attempt ${attempt} error:`,
                error.message
            );


            if (attempt === maxAttempts) {

                throw error;

            }

        }

    }

}


// ========================================
// API CHAT
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


        // Получаем ответ Gemini

        const answer = await askGemini(message);


        console.log(
            "KMRN AI:",
            answer
        );


        // Отправляем ответ браузеру

        res.json({

            answer: answer

        });


    } catch (error) {

        console.error(
            "SERVER ERROR:",
            error
        );


        res.status(500).json({

            error:
                "KMRN AI временно не может получить ответ. Попробуйте ещё раз."

        });

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
