# EXE Installation

This guide explains how to create a standalone executable for the Flask backend.

First, create and activate a virtual environment:

```bash
python -m venv venv
```

```

- **Windows:** `venv\Scripts\activate`
- **Linux/macOS:** `source venv/bin/activate`
```

Then, install all required dependencies from `requirements.txt`:

```bash
pip install -r requirements.txt
```

Next, navigate to the `backend` directory

```bash
cd backend
```

Use PyInstaller to build a single executable file for your Flask app:

```bash
pyinstaller --onefile --noconsole --add-data "templates;templates" --add-data "public;public" --add-data "config.json;." app.py
```

Then just run

```bash
nmp run build
```

and now you have one single exe file in dist that runs flask and electron
