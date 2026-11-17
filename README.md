\# TRIAD DMS – Document Management System



A full-stack Document Management System developed for the TRIAD AI Full Stack Developer Internship Take-Home Assignment.



\## Overview



TRIAD DMS is a web-based document management application providing secure document storage, customizable metadata, division-based access control, cross-division access approval, and OCR-powered document search.



\## Features



\- User registration and JWT-based authentication.

\- Division-based document isolation.

\- PDF and image document uploads.

\- MongoDB GridFS file storage.

\- Dynamic metadata fields configurable by administrators.

\- Cross-division access requests with approval and rejection.

\- OCR text extraction from uploaded PDFs and images.

\- Search across document titles, metadata, and extracted OCR content.

\- React-based dashboard and document management interface.



\## Technology Stack



\*\*Frontend\*\*

\- React

\- Vite

\- JavaScript

\- Axios

\- React Router

\- Lucide React



\*\*Backend\*\*

\- Python

\- Flask REST API

\- Flask-JWT-Extended

\- MongoDB

\- GridFS

\- PyMuPDF

\- Tesseract OCR



\## Project Structure



```text

TRIAD-DMS-SUBMISSION/

├── backend/

│   ├── app/

│   ├── app.py

│   ├── config.py

│   ├── requirements.txt

│   └── .env.example

├── frontend/

│   ├── public/

│   ├── src/

│   ├── package.json

│   └── .env.example

├── .gitignore

└── README.md

```



\## Prerequisites



\- Python 3.12

\- Node.js and npm

\- MongoDB Community Server

\- Tesseract OCR



Make sure MongoDB is running before starting the application.



\## Backend Setup



Open a terminal in the project root.



```powershell

cd backend

python -m venv venv

.\\venv\\Scripts\\Activate.ps1

pip install -r requirements.txt

Copy-Item .env.example .env

```



Configure the environment variables in `.env`, including the secret keys, MongoDB URI, and Tesseract executable path.



Start the backend:



```powershell

python app.py

```



Backend URL: http://127.0.0.1:5000



API base URL: http://127.0.0.1:5000/api



\## Frontend Setup



Open another terminal in the project root.



```powershell

cd frontend

npm install

Copy-Item .env.example .env

npm run dev

```



Frontend URL: http://localhost:5173



\## Core API Endpoints



| Method | Endpoint | Description |

|---|---|---|

| POST | `/api/auth/register` | Register a user |

| POST | `/api/auth/login` | Authenticate a user |

| POST | `/api/documents/upload` | Upload a document |

| GET | `/api/documents` | Retrieve accessible documents |

| GET | `/api/documents/<doc\_id>/download` | Download a document |

| POST | `/api/access/request` | Request cross-division access |

| POST | `/api/access/approve` | Approve an access request |

| GET | `/api/search?q=<query>` | Search documents |



Additional endpoints support document details, access request management, and dynamic metadata configuration.



\## Access Control Workflow



1\. Users register and belong to a division.

2\. Users can upload documents only to their own division.

3\. Users can access documents belonging to their division by default.

4\. Users from another division must request access.

5\. The document-owning division can approve or reject the request.

6\. Approved users can download the corresponding document.



\## OCR and Search



Uploaded PDFs and images are processed to extract text using OCR. The extracted text is stored with document metadata and made searchable through the search API.



\## File Storage



Uploaded files are stored in MongoDB GridFS. Document metadata and access information are maintained separately in MongoDB collections.



\## Notes



\- Docker is optional.

\- Never commit actual `.env` files or secret keys.

\- Use the provided `.env.example` files to configure local environments.



\## Author



Developed for the TRIAD AI Full Stack Developer Internship Take-Home Assignment.

