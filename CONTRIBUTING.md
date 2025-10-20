# 🤝 Contributing to DigitalBoneBox

Thank you for your interest in contributing to **DigitalBoneBox**!  
Your feedback, reviews, and code improvements make this project better for students everywhere.

---

## 🧩 How to Contribute

### 1️⃣ Fork the Repository

Click the **Fork** button on the top-right of the [DigitalBoneBox GitHub page](https://github.com/oss-slu/DigitalBonesBox).  
This will create a copy under your own GitHub account.

### 2️⃣ Clone Your Fork

```bash
git clone https://github.com/<your-username>/DigitalBonesBox.git
cd DigitalBonesBox
```

### 3️⃣ Create a New Branch

Before making any changes, create a new branch:

```bash
git checkout -b feature/<short-description>
```

Example:

```bash
git checkout -b feature/improve-sidebar-links
```

### 4️⃣ Make Your Changes

- For **feedback/review tasks**, document your findings in `Issues` or `PR description`.
- For **code tasks**, modify the files as needed and ensure everything runs locally.

### 5️⃣ Commit Your Work

```bash
git add .
git commit -m "fix: updated sidebar navigation and content flow"
```

### 6️⃣ Push to Your Fork

```bash
git push origin feature/<short-description>
```

### 7️⃣ Create a Pull Request (PR)

Go to your fork on GitHub → **Compare & pull request**  
Write a **clear PR description** mentioning:

- The issue number (e.g., `Closes #145`)
- Summary of what you did
- Screenshots or notes if applicable

Example PR template:

```markdown
## 📝 Summary

- Fixed sidebar link navigation not working
- Added clear error messages for login/signup
- Improved README and contributing documentation

## 🔗 Related Issue

Closes #145

## ✅ Checklist

- [x] Ran app locally without errors
- [x] Verified links work correctly
- [x] Updated documentation
```

---

## 🧠 Feedback or Non-Code Contributions

If you're reviewing the app (like Issue #145):

1. Run the app locally.
2. Use it like a first-time student.
3. Note issues with:
   - Navigation flow
   - Content accuracy
   - UI/UX clarity
4. Comment your findings in the issue thread.

Example comment:

```markdown
### 🧭 User Flow Feedback

- Sidebar links not working; unclear navigation.

### 🦴 Content Review

- Missing descriptions for sub-bones in “Bony Pelvis”.

### 🎨 UI Suggestions

- Buttons overlap on smaller screens.
```

---

## 🧰 Code Style Guidelines

- Use clear, readable variable names.
- Follow existing project folder structure.
- Write commits in **imperative form** (e.g., “add”, “fix”, “update”).

---

## 🪪 License

All contributions to **DigitalBoneBox** fall under the MIT License.
