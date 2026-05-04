# Maze-Escape3D

Maze Escape 3D is an interactive WebGL maze exploration game created for CS 4053 Computer Graphics. The player starts inside a 3D maze, collects all required gems, and escapes through the exit door once it unlocks.

## Group Members
- Keyera Lastrap
- Reese Zimmerman

## How to Run
1. Clone or download this repository.
2. Open `index.html` in a browser.

## Controls

- `W` - Move forward
- `A` - Move left
- `S` - Move backward
- `D` - Move right
- Mouse - Look around
- Click the canvas - Re-lock mouse pointer
- `R` - Restart during play or after winning
- Restart button - Play again after escaping

## Objective

Collect all five gems hidden throughout the maze. After all collectibles are collected, the exit changes from locked to open. Reach the open exit door to win.

## Requirements Covered

### 3D Scene
The project contains a navigable 3D maze environment with maze walls, floor geometry, collectibles, decorative crates, an exit door, and an exit marker.

### User-Controlled Camera
The player uses a first-person camera controlled by keyboard movement and mouse pointer-lock looking.

### Transformations
The project uses:
- Translation to place maze walls, floor cells, collectibles, crates, the exit door, and the exit marker.
- Rotation to animate spinning collectibles and the exit marker.
- Scaling to change collectible proportions and crate proportions.

### Collision Detection
The player cannot walk through maze walls. Movement is checked against the maze grid before the camera position is updated.

### Lighting and Shading
The shader implements Phong illumination using ambient, diffuse, and specular components. The scene uses a point light positioned above the maze.

### Texturing
The project uses image textures for at least five distinct scene objects/surfaces:
- Maze walls
- Floor
- Collectible gems
- Exit door
- Exit marker
- Decorative crates

### Interaction
The player can:
1. Move through the maze.
2. Look around using the mouse.
3. Collect gems by walking near them.
4. Unlock the exit after all gems are collected.
5. Reach the exit to trigger the win screen.
6. Restart the game.

### Scene Complexity
The scene includes multiple unique objects: walls, floor, collectibles, crates, exit door, and exit marker. The maze layout and five collectibles support multiple minutes of meaningful exploration.

## File Overview
