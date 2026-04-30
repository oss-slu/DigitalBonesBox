# Project Documentation

This directory serves as the central knowledge base for the DigitalBoneBox project. It contains high-level strategic documents, architectural diagrams, and technical guides for scripts and testing.

## 📂 Contents

### 1. [Threat Model](./Threat_Model.pdf)

**Focus:** Security, Risk Assessment, and Mitigation.

This document provides a comprehensive security analysis of the application. It details:

* **The "GitHub-as-a-Database" Risk Profile:** Analysis of our dependency on the GitHub Raw API.
* **Critical Vulnerabilities:** Risks associated with the unprotected `data` branch.
* **Mitigation Strategy:** The roadmap for securing the supply chain.

Much of the threat model document describes the old model for the app, which we are moving away from, which involves storing the app data in a separate branch in the repository and fetching it from GitHub while running the app. The new model involves storing the data directly in the server.

---

### 2. Visual Design Artifacts

**Focus:** System architecture, data flow, and database design.

This document contains visual diagrams illustrating:

* **[Old](./overall_data_flow_old.png) and [New Overall Data Flow](./overall_data_flow_new.png):** How data flows from the original PowerPoint files, through data extraction and uploading to the database, through the web app.
* **[Old](./backend_data_flow_old.png) and [New Backend Data Flow](./backend_data_flow_new.png):** How the app backend caches and serves data.
* **[Database Structure](./database_structure.png):** How the data in the database is structured.

The old model for the app, which we are moving away from, involves storing the app data in a separate branch in the repository and fetching it from GitHub while running the app. This is reflected in the old diagrams. The new model, reflected in the new diagrams, involves storing the data directly in the server.

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
