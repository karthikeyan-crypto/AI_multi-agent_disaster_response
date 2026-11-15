# ARES — AI-Powered Multi-Agent Disaster Response System

> **When a disaster changes the map, the response must change with it.**
>
> ARES is an interactive, AI-inspired disaster-response simulation that explores how aerial drones and ground robots can coordinate rescue missions, prioritize civilians, navigate hazards and adapt when the environment changes.

<p align="center"><strong>DECIDE • COORDINATE • ADAPT • RESCUE</strong></p>

---

## Table of Contents

- [Project at a Glance](#project-at-a-glance)
- [The Problem](#the-problem)
- [The ARES Approach](#the-ares-approach)
- [Features](#features)
- [How It Works](#how-it-works)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Command Center Walkthrough](#command-center-walkthrough)
- [Project Structure](#project-structure)
- [Decision Logic](#decision-logic)
- [Current Scope and Limitations](#current-scope-and-limitations)
- [Future Development](#future-development)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)

## Project at a Glance

| Item | Details |
|---|---|
| Project | AI-Powered Multi-Agent Disaster Response System |
| Short name | ARES |
| Type | Interactive web-based simulation and decision-support prototype |
| Goal | Demonstrate coordinated rescue operations in a changing virtual disaster environment |
| Agent types | Simulated aerial drones and ground robots |
| Environment | Grid-based virtual disaster zone with a 3D visual layer |
| Scenario types | Earthquake, flood, wildfire, cyclone and building collapse |
| Front end | React, TypeScript and Vite |
| Visualization | Three.js, React Three Fiber and Drei |
| Styling | Tailwind CSS 4 |
| Runtime | Client-side browser simulation |

ARES is a visual testbed for exploring the decisions behind a coordinated response: who needs help first, which unit should respond, how it should travel, and what should happen when the situation changes.

## The Problem

Disaster response is a time-sensitive coordination challenge. Response teams may need to locate people, prioritize urgent cases, allocate limited units, navigate damaged areas, avoid duplicated assignments and react to changing hazards.

A fixed plan can quickly become unsuitable when a road is blocked, a new fire appears or an agent loses battery. A response-support system must therefore repeatedly evaluate the situation and adapt its plan.

ARES turns these challenges into an interactive simulation that can be observed, tested and discussed.

## The ARES Approach

ARES models a response fleet containing two kinds of virtual agents:

- **Aerial drones** — simulated units that can navigate without being restricted to the road network.
- **Ground robots** — simulated units whose pathfinding is restricted to road cells and avoids buildings and active hazard cells.

The virtual world maintains a shared state containing agents, civilians, buildings, roads, hazards, missions, emergency events, logs and performance statistics.

The simulation repeatedly updates the environment, evaluates waiting civilians, assigns eligible agents, advances missions and refreshes statistics. Emergency events can change the world during a run, creating new conditions for the mission system.

**This is a software simulation. It does not currently control physical drones, robots, GPS devices or field sensors.**

## Features

### 1. Interactive disaster environment
Explore a virtual disaster zone containing a road network, buildings, hospital, shelter, civilians, agents and hazard zones. The 3D environment is rendered using Three.js through React Three Fiber.

### 2. Mixed response fleet
Configure the number of drones and ground robots. Agent panels display operational details such as state, battery, health, mission and target information.

### 3. Civilian urgency prioritization
Each civilian has an urgency category, health value and hazard-exposure value. The engine calculates a weighted priority score and considers higher-scoring waiting civilians first.

### 4. Mission assignment
The engine filters for available agents, then selects a unit using a score that combines distance to the target and a battery penalty.

### 5. Hazard-aware pathfinding
An A*-style grid search considers roads, buildings and active hazard cells. Ground robots must remain on the road network; drones are not subject to this road-only constraint.

### 6. Dynamic emergency events
While the simulation is running, the operator can trigger:
- Fire outbreak
- Flood surge
- Building collapse
- Road blockage
- Aftershock
- Low-battery emergency

These events modify the simulation state and create new conditions for agents and missions to handle.

### 7. State-aware AI Copilot
The built-in Copilot answers supported operational questions using the current simulation state. Example topics include highest-priority civilians, agent status, route risk, active fires and simulation statistics.

The current Copilot uses local rule-based intent matching and response templates. It is **not** connected to a large language model or external AI API.

### 8. Monitoring and analytics
The dashboard includes agent information, rescue priorities, decision details, mission logs and simulation statistics. These views help explain what the simulation is doing and how the situation changes.

### 9. Guided demonstration
Use Demo Mode to walk through a prepared sequence, or Test AI Adaptation to demonstrate how the simulation responds to changing conditions.

---

## How It Works

ARES follows a repeated decision cycle:

~~~text
INITIALIZE SCENARIO
  Create map, agents, civilians and hazards
          |
          v
READ WORLD STATE
  Inspect agents, civilians, roads and hazards
          |
          v
PRIORITIZE NEEDS
  Score waiting civilians by urgency and condition
          |
          v
ASSIGN AN AGENT
  Select an eligible unit using distance and battery
          |
          v
PLAN A ROUTE
  Search around blocked buildings and hazards
          |
          v
EXECUTE SIMULATED MISSION
  Advance agent movement and mission progress
          |
          v
UPDATE ENVIRONMENT
  Advance hazards, events, resources and statistics
          |
          +-----------> Repeat decision cycle
~~~

### Civilian priority scoring

The engine combines three factors:

~~~text
Priority Score =
    (Urgency Weight × 0.40)
  + (Health Deficit × 0.35)
  + (Hazard Exposure × 0.25)
~~~

- **Urgency weight:** maps critical, high, medium and low categories to descending weights.
- **Health deficit:** represents the difference between full health and current health.
- **Hazard exposure:** represents the civilian's exposure value in the simulation.

The resulting score is used to sort waiting civilians, with higher scores considered first.

### Agent selection

The engine considers agents that are idle or scanning, have more than 15% battery and more than 10% health.

For each eligible agent:

~~~text
Agent Selection Score =
    Distance to Civilian
  + ((100 - Battery) × 0.20)
~~~

The eligible agent with the lowest score is selected. This is an explicit heuristic used by the prototype, not a trained machine-learning model.

### Route planning

The pathfinding module uses an A*-style grid search with:
- Manhattan distance as its heuristic;
- horizontal, vertical and diagonal neighbour candidates;
- building cells treated as blocked;
- active hazard cells treated as blocked;
- road preference in route cost; and
- a road-only movement constraint for ground robots.

The planner returns a path, estimated distance and risk value. If the search cannot find a route within its configured search limit, the current implementation returns a straight-line fallback with a high risk value. This fallback is for simulation continuity and is **not** a verified safe route.

### Continuous adaptation

Emergency events can add hazards, change building or road state, or affect agent resources. The engine updates the simulation and handles mission and route changes according to the event logic.

## System Architecture

The application is a client-side React application. Its responsibilities are separated into presentation, simulation logic and shared domain types.

| Area | Responsibility |
|---|---|
| Presentation | Landing screen, 3D environment, dashboard panels, controls and analytics |
| Simulation logic | World initialization, mission assignment, agent updates, hazard updates, events and statistics |
| Domain types | Shared TypeScript definitions for agents, civilians, hazards, missions and simulation state |

### Core modules

| File | Responsibility |
|---|---|
| src/App.tsx | Switches between the landing experience and command center |
| src/simulation/engine.ts | Initializes the world, assigns missions, updates agents and hazards, processes events and calculates statistics |
| src/simulation/pathfinding.ts | Grid search, road/building/hazard constraints, route risk and ETA estimation |
| src/simulation/copilot.ts | Rule-based Copilot responses based on current simulation state |
| src/types/index.ts | Shared TypeScript data model |
| src/components/3d/DisasterScene.tsx | Renders the virtual disaster environment |
| src/components/dashboard/ | Operational panels and command-center interface |

## Technology Stack

| Technology | Usage |
|---|---|
| React 19 | Component-based user interface |
| TypeScript | Typed application and simulation logic |
| Vite | Development server and production bundler |
| Three.js | 3D rendering engine |
| React Three Fiber | React renderer for Three.js |
| Drei | Helpers and components for 3D scenes |
| Tailwind CSS 4 | Utility-first styling |
| Framer Motion | Interface transitions and animation |
| Recharts | Dashboard charts and analytics |
| Lucide React | Interface icons |

The current project package does not configure a separate backend service or database. Simulation state is maintained by the running front-end application.

## Getting Started

### Prerequisites

Install:
- [Node.js](https://nodejs.org/) (a current LTS release is recommended);
- npm (included with Node.js); and
- Git, if you plan to clone the repository.

Verify your installation:

~~~bash
node --version
npm --version
~~~

### 1. Clone the repository

~~~bash
git clone https://github.com/karthikeyan-crypto/AI-Powered_Multi-Agent_Disaster_Response_System.git
cd AI-Powered_Multi-Agent_Disaster_Response_System
~~~

### 2. Install dependencies

~~~bash
npm install
~~~

### 3. Start the development server

~~~bash
npm run dev
~~~

Vite prints a local URL in the terminal, usually:

~~~text
http://localhost:5173
~~~

Open the displayed URL in your browser.

### 4. Build for production

~~~bash
npm run build
~~~

This runs the TypeScript project build and creates the production bundle in the dist/ directory.

### 5. Preview the production build

~~~bash
npm run preview
~~~

### Useful commands

| Command | Purpose |
|---|---|
| npm install | Install dependencies |
| npm run dev | Start the development server |
| npm run typecheck | Run the configured TypeScript check |
| npm run build | Build the production application |
| npm run preview | Preview the production build locally |

## Command Center Walkthrough

A suggested first-time walkthrough:

1. Open the application and enter the command center.
2. Select a disaster type before starting the simulation.
3. Choose a difficulty: easy, medium, hard or extreme.
4. Configure the number of drones and ground robots.
5. Open advanced controls to adjust civilian count, hazard rate and fire spread.
6. Start the simulation and observe agents, civilians, hazards and missions.
7. Select an agent to inspect its operational information.
8. Trigger an emergency event while the simulation is running.
9. Observe mission logs, route recalculations and agent state changes.
10. Ask the Copilot supported questions, such as:
    - “Which civilian has the highest priority?”
    - “Which agent is moving?”
    - “What is the safest route?”
    - “How many critical civilians are waiting?”
    - “Show the current status.”
11. Review rescue progress, mission completion, route recalculations and agent utilization.
12. Reset, change the scenario and compare the resulting behaviour.

Simulation speed controls provide 1×, 1.5× and 2× playback.

## Project Structure

~~~text
AI-Powered_Multi-Agent_Disaster_Response_System/
├── public/
├── src/
│   ├── components/
│   │   ├── 3d/
│   │   │   └── DisasterScene.tsx
│   │   ├── dashboard/
│   │   │   ├── AICopilot.tsx
│   │   │   ├── AIDecisionPanel.tsx
│   │   │   ├── AIPipeline.tsx
│   │   │   ├── AgentPanel.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── CommandCenter.tsx
│   │   │   ├── CurrentMissionCard.tsx
│   │   │   ├── DisasterControl.tsx
│   │   │   ├── HowItWorksOverlay.tsx
│   │   │   ├── MissionLog.tsx
│   │   │   └── RescuePriority.tsx
│   │   ├── ui/
│   │   ├── Landing.tsx
│   │   ├── mode-toggle.tsx
│   │   └── theme-provider.tsx
│   ├── hooks/
│   ├── lib/
│   ├── simulation/
│   │   ├── copilot.ts
│   │   ├── engine.ts
│   │   └── pathfinding.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
~~~

The src/components/ui/ directory contains reusable interface components used across the application.

## Decision Logic

The current simulation uses typed data structures to represent:

- **Agent:** type, position, battery, health, state, route, current mission and operational counters.
- **Civilian:** position, health, urgency, hazard exposure, rescue status and detection source.
- **Hazard:** type, position, severity, spread rate, radius and active state.
- **Building:** position, dimensions, type and damage state.
- **Road:** start/end coordinates, blocked state and optional blockage reason.
- **Mission:** target, assigned agent, priority, status, route, risk, distance, ETA and route invalidations.
- **Emergency event:** event type, description, timestamp, optional location and resolution state.
- **Simulation statistics:** rescue count, completed/failed missions, route recalculations, hazard counts, response-time metrics and agent utilization.

These structures provide the shared state used by the engine, dashboard and Copilot.

## Design Decisions

### Simulation first, hardware later
A virtual environment allows coordination logic and failure scenarios to be explored without physical robots, drones, batteries or sensors. It also makes experiments easier to observe.

### Different movement constraints
The simulation treats aerial and ground agents differently. Ground robots use the road network and avoid buildings; drones are not restricted to roads. This gives the two agent classes distinct roles in the same environment.

### Explainable heuristics
The current priority and agent-selection logic uses explicit weighted scores. This makes the prototype easier to inspect, explain and improve than a black-box decision process.

### Adaptation as a first-class demonstration
Emergency-event controls let the operator change conditions during a run. Dynamic replanning and resource management are therefore central parts of the demonstration.

## Current Scope and Limitations

ARES is a prototype for learning, demonstration and experimentation. Important boundaries:

- The environment, agents, civilians and hazards are simulated in software.
- The project does not connect to physical drones, rescue robots, GPS, cameras, LiDAR, IoT devices or emergency-service networks.
- The Copilot is rule-based and uses predefined intent matching; it is not an LLM-powered assistant.
- Mission assignment and priority are heuristic-based; they are not learned from a training dataset.
- The route planner is a grid-based simulation algorithm, not a validated real-world navigation stack.
- The simulation does not provide verified medical triage or operational emergency-response recommendations.
- The current package is a front-end application; a production backend, persistent database, authentication and multi-user coordination service are not configured.
- A route-search fallback may return a straight-line path with a high risk score when the search fails. This is not a safety guarantee.

Any real-world deployment would require substantial engineering, field testing, safety analysis, domain expertise and integration with appropriate hardware and emergency-response authorities.

## Future Development

Potential extensions include:

- a backend for persistent scenarios, logs and user sessions;
- a formal agent communication and coordination layer;
- multi-objective mission allocation and optimization;
- sensor uncertainty and confidence modelling;
- richer terrain and traversability costs for route planning;
- scenario replay and reproducible random seeds;
- exportable experiment reports and performance comparisons;
- hardware-in-the-loop testing interfaces; and
- evaluation against defined simulation benchmarks.

These are possible future directions, not features claimed to be implemented today.

## Contributing

Suggestions, bug reports and pull requests are welcome.

1. Fork the repository.
2. Create a feature branch: git checkout -b feature/your-feature-name
3. Install dependencies: npm install
4. Make a focused change.
5. Run checks: npm run typecheck and npm run build
6. Commit your work: git add . && git commit -m "Describe your change"
7. Push the branch and open a pull request.

For visible interface changes, include screenshots or a short recording in the pull request.

## Disclaimer

ARES is an educational and research-oriented simulation prototype. It is not an emergency dispatch platform, certified autonomous system, medical decision tool or substitute for trained emergency responders. Simulated outputs must not be used to direct real rescue operations.

---

<p align="center">
  <strong>ARES — A virtual testbed for thinking through the hardest moments.</strong><br/>
  <sub>Built to explore how coordinated agents might respond when every decision matters.</sub>
</p>
