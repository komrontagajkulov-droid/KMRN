const express = require("express");

const app = express();

app.use(express.json());
app.use(express.static("."));


// Проверка сервера
app.get("/api/status", (req, res) => {
    res.json({
        status: "KMRN AI работает"
    });
});


// Запрос к Gemini с повторными попытками
async function askGemini(message) {

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {

        try {

            console.log(`Gemini attempt ${attempt}/${maxAttempts}`);

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


            // Если Gemini временно перегружен
            if (response.status === 503 || response.status === 429) {

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


            if (!response.ok) {

                throw new Error(
                    data.error?.message ||
                    "Ошибка Gemini API"
                );

            }


            const answer =
                data.candidates?.[0]
                    ?.content?.parts
                    ?.map(part => part.text || "")
                    ?.join("");


            if (!answer) {

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


// AI
app.post("/api/chat", async (req, res) => {

    try {

        const message = req.body.message;


        if (!message) {

            return res.status(400).json({
                error: "Сообщение пустое"
            });

        }


        const answer = await askGemini(message);


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


const PORT =
    process.env.PORT || 3000;


app.listen(PORT, () => {

    console.log(
        `KMRN AI запущен на порту ${PORT}`
    );

});
