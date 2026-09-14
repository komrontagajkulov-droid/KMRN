const express = require("express");

const app = express();

app.use(express.json());
app.use(express.static("."));

const GEMINI_MODEL = "gemini-3.8-flash";

const GEMINI_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;


// ========================================
// STATUS
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

    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        console.log(
            `Gemini attempt ${attempt}/${maxAttempts}`
        );

        try {

            const response = await fetch(
                GEMINI_URL,
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
                "Gemini HTTP status:",
                response.status
            );


            console.log(
                "Gemini response:",
                JSON.stringify(data)
            );


            // ========================================
            // TEMPORARY GEMINI ERROR
            // ========================================

            if (
                response.status === 503 ||
                response.status === 429 ||
                response.status === 408 ||
                response.status >= 500
            ) {

                if (attempt < maxAttempts) {

                    const delay =
                        2000 * Math.pow(
                            2,
                            attempt - 1
                        );

                    console.log(
                        `Retry after ${delay} ms`
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


            // ========================================
            // API ERROR
            // ========================================

            if (!response.ok) {

                throw new Error(
                    data?.error?.message ||
                    `Gemini HTTP ${response.status}`
                );

            }


            // ========================================
            // GET TEXT
            // ========================================

            const parts =
                data?.candidates?.[0]?.content?.parts || [];


            console.log(
                "Gemini parts:",
                JSON.stringify(parts)
            );


            let answer = "";


            for (const part of parts) {

                if (
                    typeof part?.text === "string"
                ) {

                    answer += part.text;

                }

            }


            console.log(
                "FINAL ANSWER:",
                answer
            );


            if (answer.trim()) {

                return answer;

            }


            throw new Error(
                "Gemini не вернул текст"
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


    throw new Error(
        "Не удалось получить ответ Gemini"
    );

}


// ========================================
// CHAT
// ========================================

app.post(
    "/api/chat",
    async (req, res) => {

        try {

            const message =
                req.body?.message;


            if (
                typeof message !== "string" ||
                !message.trim()
            ) {

                return res.status(400).json({
                    error: "Сообщение пустое"
                });

            }


            console.log(
                "Пользователь:",
                message
            );


            const answer =
                await askGemini(message);


            console.log(
                "KMRN AI:",
                answer
            );


            return res.status(200).json({
                answer: answer
            });


        } catch (error) {

            console.error(
                "SERVER ERROR:",
                error
            );


            return res.status(500).json({
                error: error.message
            });

        }

    }
);


// ========================================
// START
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
