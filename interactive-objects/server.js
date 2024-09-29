const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Sample data
const objectInfo = {
    '1': 'This is Object 1. It has various features.',
    '2': 'This is Object 2. It has various features.'
};


app.use(express.static(path.join(__dirname, 'public')));

app.get('/object-info/:id', (req, res) => {
    const id = req.params.id;
    const info = objectInfo[id];
    if (info) {
        res.send(info);
    } else {
        res.status(404).send('Object not found');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
