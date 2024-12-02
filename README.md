# DigitalBoneBox : A Web-Based Study Tool for Human Anatomy
This project is a Web App project that aims to convert an existing PowerPoint-based educational tool into an interactive, mobile-friendly web application.

## How / why did we get here? 

This project is based on the work of Prof. Brian Elliott, created during his final years of education.
In the human anatomy class, students must purchase a bone set to study the bones of the human body, but they are not allowed to take these models out of the lab. Prof. Elliott observed that this restriction could cause inconvenience for students who want to quickly review the bones before an exam.

To address this, he created a PowerPoint presentation that includes images of the bones taken from different angles (with permission from the department) and annotated these images to highlight the various bones in the set using different colors and filters. He utilized all available features to create an easily accessible presentation that students could use for quick revision or brief study sessions before tests.

However, he wanted to make this resource even more accessible. He envisioned offering students a platform they could access on their iPads, or laptops—devices commonly used by students. This is where the web application comes in. It is designed to be a quick and easy guide for students to use for exams, to quiz themselves on essential knowledge, or to learn from material that is simple and provides an overview of the human bones. This application is based on the information in the presentations created by Prof. Brian Elliott.

## Tech Stack
This project was developed using the following technologies:

Node.js: Used for server-side development to handle requests and serve the application.
HTML: For structuring the content of the web pages.
HTMX: A lightweight JavaScript library for enhancing interactivity by allowing partial page updates without a full page reload.
CSS: For styling and layout of the web pages to ensure a clean and responsive design for users across devices.

## Auto-Update Feature
Purpose
The auto-update feature allows the web application to periodically refresh the displayed data without requiring manual intervention. This ensures that users always have access to the latest information, such as newly added bones or updates to annotations.

How to Configure or Use
The auto-update functionality is enabled by default and is integrated with the application's main display page.
To modify the auto-update interval or disable it:
Open the bones.js file.
Locate the auto-update configuration settings.
Adjust the interval (in milliseconds) or disable the feature as needed.
Dependencies or Requirements
HTMX: Ensures partial page updates are seamless.
Browser Support: Modern browsers are recommended for optimal performance.

## Features
Interactive and accessible web application for students to study human anatomy.
Quick revision tool with annotated images of bones.
Designed for use on iPads, laptops, or other devices commonly used by students.

## Setup
Clone the repository:
- git clone [https://github.com/oss-slu/DigitalBonesBox.git](https://github.com/oss-slu/DigitalBonesBox.git)
- Open the project in your preferred code editor.

## Contributing
Contributions are welcome! Check out the CONTRIBUTING.md for guidelines.

