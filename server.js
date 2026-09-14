const express = require("express");

const app = express();

app.use(express.json());
app.use(express.static("."));

app.get("/api/status", (req, res) => {
    res.json({
        status: "SHOHIN AI работает"
    });
});

app.post("/api/chat", async (req, res) => {

    try {

        const message = req.body.message;

        if (!message) {
            return res.status(400).json({
                error: "Сообщение пустое"
            });
        }

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
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

        console.log("Gemini response:", data);

        if (!response.ok) {

            return res.status(500).json({
                error: data.error?.message || "Ошибка Gemini API"
            });

        }

        const answer =
            data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!answer) {

            return res.status(500).json({
                error: "Gemini не вернул ответ"
            });

        }

        res.json({
            answer: answer
        });

    } catch (error) {

        console.error("SERVER ERROR:", error);

        res.status(500).json({
            error: "Ошибка сервера"
        });

    }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        `SHOHIN AI запущен на порту ${PORT}`
    );

});
