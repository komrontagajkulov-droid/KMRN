const express = require("express");

const app = express();

app.use(express.json());
app.use(express.static("."));


// Проверка работы сервера
app.get("/api/status", (req, res) => {
    res.json({
        status: "KMRN AI работает"
    });
});


// AI CHAT
app.post("/api/chat", async (req, res) => {

    try {

        const message = req.body.message;

        if (!message) {
            return res.status(400).json({
                error: "Сообщение пустое"
            });
        }


        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse",
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


        if (!response.ok) {

            const errorText = await response.text();

            console.error("GEMINI ERROR:", errorText);

            return res.status(500).json({
                error: "Ошибка Gemini API"
            });
        }


        // Передаём поток ответа браузеру
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const reader = response.body.getReader();

        const decoder = new TextDecoder();


        while (true) {

            const { value, done } = await reader.read();

            if (done) {
                break;
            }


            const chunk = decoder.decode(value, {
                stream: true
            });


            res.write(chunk);
        }


        res.end();

    } catch (error) {

        console.error("SERVER ERROR:", error);

        if (!res.headersSent) {

            res.status(500).json({
                error: "Ошибка сервера"
            });

        } else {

            res.end();

        }

    }

});


const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {

    console.log(
        `KMRN AI запущен на порту ${PORT}`
    );

});
