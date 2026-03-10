# Telic System Simulation

A computational framework for testing whether **information structure (Φ)** drives goal‑directed behaviour in multi‑agent systems.  
This project implements the telic equation:

```
T = α·I_S + γ·Φ + δ·E − β·K
```

where agents maximise **T** (telic value) by moving on a grid, exchanging symbols, and responding to the information entropy (Φ) of their local neighbourhood.

This is a **Web-based Scientific Version** built with React, Vite, and TypeScript, featuring an integrated AI Analyst.

---

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [AI Analyst](#ai-analyst)
6. [Deployment](#deployment)
7. [Project Structure](#project-structure)
8. [License](#license)

---

## Overview

The simulation asks a fundamental question: **Does the information structure (Φ) in an agent's neighbourhood influence the system's behaviour?**  
By toggling the weight `γ` in the telic equation, we can compare:
- **Control** (`γ = 0`): Φ has no effect on decisions.
- **Test** (`γ = 1`): Φ contributes directly to the utility maximised by each agent.

The system exhibits rich dynamics:
- Agents cluster, disperse, or form stable territories.
- Information entropy can rise or fall.
- Telic value trajectories can be smooth, oscillatory, or chaotic.

---

## Features

- **Real-time Visualization**: Interactive grid view showing agent movement, energy levels, and symbols.
- **Dynamic Controls**: Adjust α, γ, vision range, and Φ type on the fly.
- **Emergence Detection**: Automatic tracking of clustering, movement coordination, and territorial behavior.
- **AI Analyst**: Integrated chat agent that can analyze simulation data and recommend parameter changes.
- **Multi-Provider AI Support**: Support for Google Gemini, OpenAI, Anthropic, DeepSeek, and Grok.
- **Data Export**: Export full simulation results (trajectories, step data, emergence metrics) as JSON.

---

## Installation

### Requirements
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or yarn

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/telic-system-simulation.git
   cd telic-system-simulation
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

---

## Configuration

The simulation parameters can be adjusted via the UI control panel:

| Parameter | Description |
| :--- | :--- |
| **α (Alpha)** | Weight for individual information $I_S$ |
| **γ (Gamma)** | Weight for collective structure $\Phi$ |
| **δ (Delta)** | Weight for energy $E$ |
| **β (Beta)** | Weight for complexity cost $K$ (distance from center) |
| **Vision Range** | Neighborhood radius for $\Phi$ calculation |
| **$\Phi$ Type** | Method for calculating information structure (Info Entropy, Spatial, etc.) |

---

## AI Analyst

The integrated AI Analyst helps interpret simulation data and suggests parameter adjustments.

### Supported Providers
- **Google Gemini**: Default provider (requires `GEMINI_API_KEY`).
- **OpenAI**: GPT-4o and other models.
- **Anthropic**: Claude 3.5 Sonnet.
- **DeepSeek**: DeepSeek-Chat.
- **xAI Grok**: Grok-Beta.

You can configure your own API keys directly in the "AI Provider Settings" panel within the application.

---

## Deployment

### Vercel

This project is optimized for deployment on [Vercel](https://vercel.com/).

1. Push your code to a GitHub repository.
2. Import the project into Vercel.
3. Add the following Environment Variable (optional, for default AI support):
   - `GEMINI_API_KEY`: Your Google AI Studio API key.

Vercel will automatically detect the Vite configuration and build the project.

---

## Project Structure

```
/src
  /components     # UI Components (Grid, Controls, Stats, Chat)
  /services       # AI Service integration
  /simulation     # Core simulation engine and types
  App.tsx         # Main application layout
  main.tsx        # Entry point
  index.css       # Global styles and Tailwind configuration
```

---

## License

This project is licensed under the MIT License.
