require('dotenv').config(); // Load .env variables
const express = require('express');
const app = express();
app.use(express.json()); // Parse JSON bodies

let students = [
    { id: 101, name: 'Alice Smith', major: 'Computer Science', age: 20, gpa: 3.8, enrollmentDate: '2023-09-01' },
    { id: 102, name: 'Bob Johnson', major: 'Mechanical Engineering', age: 21, gpa: 3.2, enrollmentDate: '2022-09-01' },
    { id: 103, name: 'Charlie Brown', major: 'History', age: 19, gpa: 2.9, enrollmentDate: '2023-01-15' },
    { id: 104, name: 'Dana Scully', major: 'Biology', age: 22, gpa: 3.95, enrollmentDate: '2021-09-01' },
    { id: 105, name: 'Evan Peters', major: 'Fine Arts', age: 20, gpa: 3.5, enrollmentDate: '2023-09-01' },
];

let nextId = 106; // Counter for new student IDs

// READ (GET) - View all student records
app.get('/studentrecords', (req, res) => {
    res.status(200).json(students);
});


//  CREATE (POST) - Add a new student record
app.post('/studentrecords', (req, res) => {
    const { name, major, age, gpa, email, enrollmentDate } = req.body;

    // --- Validation for required fields ---
    if (!name || !email || gpa === undefined) {
        return res.status(400).json({
            error: 'Missing required fields: name, email, and gpa are required.'
        });
    }

    // --- GPA validation (0.0 - 4.0) ---
    if (gpa < 0.0 || gpa > 4.0) {
        return res.status(400).json({
            error: 'Invalid GPA. It must be between 0.0 and 4.0.'
        });
    }

    // --- Create the new student record ---
    const newStudent = {
        id: nextId++, // auto increment ID
        name,
        major: major || 'Undeclared', // optional field
        age: age || null,
        gpa,
        email,
        enrollmentDate: enrollmentDate || new Date().toISOString().split('T')[0] // default to today
    };

    // --- Add to the students array ---
    students.push(newStudent);
    // --- Response ---
    res.status(201).json({
        message: 'Student created successfully',
        student: newStudent
    });
});


const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Student Manager API listening on http://localhost:${PORT}`);
});
