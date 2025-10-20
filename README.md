# DigitalBoneBox: A Web-Based Study Tool for Human Anatomy

> **An interactive and mobile-friendly anatomy study tool inspired by Prof. Brian Elliott’s educational work.**

---

## 📖 Overview

**DigitalBoneBox** transforms an existing PowerPoint-based educational tool into a **modern web application** that helps students study human anatomy interactively on any device — laptops, tablets, or phones.

---

## 💡 Background: How & Why We Got Here

This project is based on the innovative work of **Prof. Brian Elliott**, developed during his academic journey.

In human anatomy classes, students often need to purchase physical bone sets, which they **cannot take outside the lab**. Prof. Elliott noticed this limitation made it difficult for students to review before exams.

To solve this, he created a **PowerPoint presentation** with:

- High-quality images of bones from multiple angles (with departmental permission)
- **Annotated visuals** using colors and filters to highlight key structures

However, he wanted a more accessible solution — a **web-based version** that allows students to:

- Revise quickly before exams
- Quiz themselves on bone anatomy
- Access visual aids on any device, anywhere

Thus, **DigitalBoneBox** was born.

---

## 🛠️ Tech Stack

| Technology  | Purpose                                    |
| ----------- | ------------------------------------------ |
| **Node.js** | Server-side logic & API handling           |
| **HTML**    | Content structure                          |
| **HTMX**    | Dynamic interactivity without full reloads |
| **CSS**     | Styling & responsive layout design         |

---

## ✨ Features

- 📚 **Interactive Study Platform** – Explore annotated bone images for quick revision
- ⚡ **Lightweight & Responsive** – Works seamlessly on laptops, tablets, and iPads
- 🧭 **Toggle Sidebar Navigation**
  - Expandable sidebar for smooth navigation
  - Placeholder sections for **Search**, **Contact**, **Recent**, and **Help**
  - Easily toggle using the ☰ button on the top-left corner

---

## ⚙️ Setup & Installation

Follow these steps to run the project locally:

### 1. Clone the repository

```bash
git clone https://github.com/oss-slu/DigitalBonesBox.git
cd DigitalBonesBox
```

### 2. Install dependencies

This installs required packages for both frontend and backend:

```bash
npm install && npm install --prefix boneset-api
```

### 3. Start the application

Run both backend API and frontend simultaneously:

```bash
npm start
```

The app will open automatically in your default browser.

---

## 🤝 Contributing

We welcome contributions from the community!

Please read our [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines before submitting a pull request.

---

## 🧬 Acknowledgments

Special thanks to **Prof. Brian Elliott** for his vision and dedication to improving anatomy education through accessible digital tools.

---

## 📜 License

This project is open-source and distributed under the **MIT License**.  
Feel free to fork, modify, and contribute!

---
