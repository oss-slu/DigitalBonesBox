# Project Documentation

This directory serves as the central knowledge base for the DigitalBoneBox project. It contains high-level strategic documents, architectural diagrams, and technical guides for scripts and testing.

## 📂 Contents

### 1. [Threat Model](./Threat_Model.pdf)
**Focus:** Security, Risk Assessment, and Mitigation.

This document provides a comprehensive security analysis of the application. It details:
* **The "GitHub-as-a-Database" Risk Profile:** Analysis of our dependency on the GitHub Raw API.
* **Critical Vulnerabilities:** Risks associated with the unprotected `data` branch.
* **Mitigation Strategy:** The roadmap for securing the supply chain.

---

### 2. [Visual Design Artifacts](./Design_Artifacts.pdf)
**Focus:** System Architecture, Data Flow, and User Experience.

This document contains visual diagrams illustrating:
* **System Architecture:** The relationship between Frontend, Node.js Middleware, and GitHub.
* **Data Flow:** How the "Warm Cache" resolves the N+1 fetch problem.
* **User Flows:** Diagrams of user navigation and interaction.

---

### 3. Technical Guides & Script Documentation
**Focus:** Operational workflows, Data Extraction, and Testing.

This directory also aggregates the technical `README` files for our internal tooling:
* **Data Extraction Scripts:** Documentation on how to run the Python scripts to parse PowerPoint slides into JSON.
* **Testing Guides:** Instructions for running local tests and verifying the quiz logic.
* **Utility Scripts:** Guides for any helper scripts used for maintenance or data validation.

*Please refer to the individual files within this folder for specific instructions.*

---

## 📝 Note for Contributors
Please review these documents before proposing significant changes to the backend architecture or data fetching logic. Preserving the **security boundaries** and **caching strategy** outlined here is critical for the application's stability.