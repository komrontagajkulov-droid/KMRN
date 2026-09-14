const express = require("express");

const app = express();

app.use(express.json());
app.use(express.static("."));

app.get("/api/status", (req, res) => {
    res.json({
        status: "SHOHIN AI работает"
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`SHOHIN AI запущен на порту ${PORT}`);
});
