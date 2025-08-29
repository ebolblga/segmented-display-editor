# template
## A template repository

[![en](https://img.shields.io/badge/lang-en-green.svg)](https://github.com/ebolblga/template/blob/master/README.md) <!-- Edit URL here -->
[![ru](https://img.shields.io/badge/lang-ru-red.svg)](https://github.com/ebolblga/template/blob/master/README.ru.md) <!-- Edit URL here -->
![Vercel](https://vercelbadge.vercel.app/api/ebolblga/template) <!-- Edit URL here -->
<!-- DeepWiki badge here: https://deepwiki.ryoppippi.com/ -->

## Introduction
> [!NOTE]
> Useful information that users should know, even when skimming content.

> [!TIP]
> Helpful advice for doing things better or more easily.

> [!IMPORTANT]
> Key information users need to know to achieve their goal.

> [!WARNING]
> Urgent info that needs immediate user attention to avoid problems.

> [!CAUTION]
> Advises about risks or negative outcomes of certain actions.

## Problem Statement

## Conclusion

## Setup with [Node.js](https://nodejs.org/en/)
```bash
# Install Node.js (v20+ recommended)
sudo apt update
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
# https://nodejs.org/en/download/ on Windows

# Install Yarn globally via npm
npm install --global yarn

# Clone the repository and navigate into it
git clone https://github.com/ebolblga/template.git
cd template

# Install all dependencies
yarn

# Start the project in development mode
yarn dev
```

## Setup with [Python](https://www.python.org/downloads/)
```bash
# Install the UV package manager
curl -LsSf https://astral.sh/uv/install.sh | sh
# powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex" on Windows

# Clone the repository and navigate into it
git clone https://github.com/ebolblga/template.git
cd template

# Create virtual environment and install dependencies
uv sync

# Activate virtual environment
. .venv/bin/activate
# .venv\Scripts\activate on Windows

# Install pre-commit hooks
uv run pre-commit install

# Run pre-commit
uv run pre-commit run --all-files

# Ruff
uv run ruff format
uv run ruff check --fix

# Run the script
uv run python -m main
```

## Contributors
<a href="https://github.com/ebolblga/template/graphs/contributors"> <!-- Edit URL here -->
  <img src="https://contrib.rocks/image?repo=ebolblga/template"/> <!-- Edit URL here -->
</a>

## [License](https://github.com/ebolblga/template/blob/master/LICENSE.md) <!-- Edit URL here -->
This program is licensed under the MIT License. Please read the License file to know about the usage terms and conditions.
