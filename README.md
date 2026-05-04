# Maze Escape 3D

Maze Escape 3D is an interactive WebGL maze game created for CS 4053 Computer Graphics. The player explores a 3D maze, collects required objects, and unlocks the exit door after all collectibles are found.

---

## Group Members

- Reese Zimmerman
- Keyera Lastrap
---

## Project Overview

This project demonstrates core computer graphics concepts in a browser-based 3D environment. The scene includes a maze, textured objects, lighting, camera movement, collision detection, collectibles, and an exit door interaction.

The goal is to escape the maze by navigating the environment and collecting all required items before reaching the exit.

---

## Features

- Navigable 3D maze environment
- First-person style camera movement
- Keyboard-controlled player movement
- Collision detection with maze walls
- Collectible objects placed throughout the maze
- Exit door that opens after all collectibles are collected
- Textured floor, walls, collectibles, and door
- Phong lighting with ambient, diffuse, and specular components
- Object transformations using translation, rotation, and scaling
- Multiple interactive features for meaningful gameplay

---
## Controls

| Control | Action |
|---|---|
| `W` | Move forward |
| `A` | Move left |
| `S` | Move backward |
| `D` | Move right |
| Arrow Keys | Alternate movement controls |
| Mouse | Look around |
| Click Canvas | Re-lock mouse pointer |
| `L` | Cycle light color |
| `F` | Toggle flashlight / ambient lighting |
| Restart Button | Restart after escaping |

---

## How to Run

### Option 1: Run with VS Code Live Server

1. Download or clone this repository.
2. Open the project folder in **Visual Studio Code**.
3. Install the **Live Server** extension if it is not already installed.
4. Right-click `index.html`.
5. Select **Open with Live Server**.
6. Click **ENTER MAZE** on the start screen.

### Option 2: Run with Python Local Server

From inside the project folder, run:

```bash
python -m http.server 8000
```

Then open this address in your browser:

```text
http://localhost:8000
```
---

## Project Files

| File / Folder | Purpose |
|---|---|
| `index.html` / `main.html` | Main webpage for running the WebGL application |
| `function.js` | Handles scene setup, controls, rendering logic, and interactions |
| `objects.js` | Defines or stores scene object data |
| `classes.js` | Contains reusable object or shape classes |
| `WebGL.js` | WebGL setup and rendering support |
| `Textures/` | Stores image textures used on walls, floor, door, and objects |

---

## Textures and Assets

All image assets are stored in the `textures/` folder.

| Texture File | Purpose |
|---|---|
| `wall.png` | Maze wall texture |
| `wall_normal.png` | Wall normal map |
| `wall_specular.png` | Wall specular map |
| `wall_ambient.png` | Wall ambient map |
| `floor.png` | Floor texture |
| `gem.png` | Collectible gem texture |
| `gem_normal.png` | Gem normal map |
| `gem_specular.png` | Gem specular map |
| `gem_ambient.png` | Gem ambient map |
| `door_locked.png` | Locked exit door texture |
| `door_open.png` | Open exit door texture |
| `crate.png` | Decorative crate/pillar texture |
| `exit_marker.png` | Exit marker texture |

---

## Graphics Requirements Covered

| Requirement | How It Is Met |
|---|---|
| 3D Scene | Maze environment with floor, walls, door, and objects |
| Camera Control | Player can move through the maze |
| Transformations | Objects use translation, rotation, and scaling |
| Collision Detection | Player cannot pass through maze walls |
| Lighting/Shading | Phong lighting model with ambient, diffuse, and specular lighting |
| Texturing | Multiple scene objects use textures |
| Interaction | Player movement, collectible pickup, and door activation |
| Scene Complexity | Maze includes several unique objects and interactive elements |

---

## Gameplay Objective

The player starts inside the maze and must explore the environment to find all collectibles. Once every collectible has been collected, the exit door becomes active or opens, allowing the player to complete the maze escape.

---

## Troubleshooting

### The screen is black or nothing appears

Try running the project through a local server instead of opening `index.html` directly. Recommended options are VS Code Live Server or Python’s `http.server`.

### The mouse does not move the camera

Click inside the canvas or press the **ENTER MAZE** button again. The game uses pointer lock, so the browser must capture the mouse before mouse-look works.

### Textures do not appear

Make sure the `textures/` folder is in the same directory as `index.html`. If textures still do not load, run the project with Live Server or Python local server.

### Movement feels blocked

This is expected when the player reaches a wall. The maze uses collision detection to prevent walking through wall geometry.

### Door does not open

The exit only opens after all five gems have been collected. Check the HUD gem counter and make sure it shows `5 / 5`.

---

## Future Improvements

Possible improvements include:

- Add sound effects for collecting gems and opening the exit
- Add a minimap
- Add multiple maze levels
- Add enemy or obstacle behavior
- Add more advanced flashlight shading
- Add animated door opening instead of only changing the texture
- Add difficulty modes with larger maze layouts
- Add a leaderboard for fastest completion times
- Improve mobile/browser compatibility

---

## Credits

Created for **CS 4053: Computer Graphics** as a final group project.

**Project Title:** Maze Escape 3D  
**Group Members:** Keyera Lastrap and Reese Zimmerman  
**Platform:** JavaScript and WebGL  
**Development Environment:** Visual Studio Code and GitHub
