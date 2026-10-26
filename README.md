# 🏎️ Street Racer: Ultimate Racing Championship

A complete, playable 3D browser-based arcade car racing game built with **Three.js**, **WebGL**, and modern JavaScript ES modules, designed as a college **Computer Graphics Project & Viva Showcase**.

---

## 🌟 Key Features

- **Procedural 3D Sports Cars**: Fully articulated vehicle hierarchy with aerodynamic chassis, front splitter, rear diffuser, GT spoiler wing, alloy rims with spokes, brake calipers, transparent tinted cabin windows, headlights, and dynamic braking tail lights.
- **Realistic Arcade Vehicle Dynamics**: Delta-time numerical physics integration including gear simulation (1-5 + Reverse), RPM tachometer, acceleration curves, speed-sensitive steering, tire drift mechanics, and suspension roll/pitch.
- **4 Progressive Playable Tracks**:
  1. **Rookie Rush** (Bright Daytime City): Wide seaside boulevard, skyscrapers, palm trees, gentle curves, time trial beginner race.
  2. **Mountain Drift** (Sunset Alpine Pass): Elevation changes, cliffs, bridges, winding hairpin turns, guardrails, rock boulders, and pine trees.
  3. **Neon Nightfall** (Futuristic Cyberpunk Metropolis): Glowing neon highway, illuminated high-rises, laser barriers, street lanterns, and fog.
  4. **Grand Championship** (World Stadium Pro Circuit): Stadium floodlight towers, spectator grandstands, multi-lap racing against 3 competitive rival AI champions!
- **Interactive 3D Racer Garage**: Real-time rotating 3D turntable viewer with 3 distinct vehicle builds (*Vortex GT*, *Apex Phantom*, *Thunder Drift*) and 6 custom metallic/glossy paint finishes.
- **Competitive AI Rivals**: Autonomous opponent cars navigating spline paths with dynamic lane positioning, speed pacing, and physical collision reaction.
- **Comprehensive Particle Effects**: Procedural tire smoke during drifts, high-velocity nitro flame jets, golden collision sparks, victory confetti shower, and screen-space hyperspeed warp lines.
- **Procedural Web Audio Engine**: Zero-asset procedural engine sound synthesized via Web Audio API (dual-oscillator pitch modulation, dynamic low-pass filtering, nitro whoosh, tire skids, crash thuds, and fanfare).
- **Pro Racing HUD**: Digital speedometer (km/h), gear indicator, RPM gauge, nitro meter, 2D canvas minimap, real-time position tracker, and lap/checkpoint timers.
- **Persistent Progression**: LocalStorage saves unlocked tracks (Tracks 2–4 unlock upon victory), personal best times, equipped vehicles, and settings.

---

## 🕹️ Controls (Desktop & Mobile)

### Desktop Keyboard
| Action | Primary Key | Alternate Key |
| :--- | :--- | :--- |
| **Accelerate** | `W` | `Up Arrow` |
| **Brake / Reverse** | `S` | `Down Arrow` |
| **Steer Left / Right** | `A` / `D` | `Left Arrow` / `Right Arrow` |
| **Handbrake / Drift** | `Spacebar` | — |
| **Nitro Boost** | `Shift` | — |
| **Reset Car onto Track** | `R` | — |
| **Switch Camera (Chase / Hood)** | `C` | — |
| **Pause / Resume Game** | `Escape` | Pause Button on HUD |

### Mobile Touch Interface
When opened on a mobile device or tablet (Android / iPhone / iPad), an intuitive on-screen touch controller is displayed:
- **Left Thumb Cluster**: Large ergonomic **LEFT** and **RIGHT** steering buttons.
- **Right Thumb Cluster**: Large **GAS** (accelerate) pedal, **BRAKE** (reverse) pedal, glowing **NITRO** boost button, and **DRIFT** handbrake button.
- **Secondary Top Controls**: **VIEW** (toggle chase/hood camera), **RESET** (re-center car onto track), and **PAUSE** (open pause menu).
- **Simultaneous Multi-Touch**: Steer while accelerating and boosting with zero gesture latency or control lockups.
- **Orientation Guide**: Recommends landscape orientation when opened in portrait mode, with seamless viewport adaptation.

---

## 🎓 Computer Graphics Concepts Demonstrated (For Viva & Presentation)

This project explicitly implements and demonstrates 10 foundational computer graphics principles:

### 1. 3D Hierarchical Transformations
- **Scene Graph Hierarchy**: The player vehicle is structured as `CarGroup -> BodyGroup -> [Cabin, Spoiler, Lights, Splitter]` and `SteerPivots -> WheelSpinGroups -> [Tires, Rims, Calipers]`.
- **Matrix Composition**: Transformations ($T \cdot R \cdot S$) allow independent wheel steering on the Y-axis while rolling on the X-axis and translating along the global path.
- **Suspension Simulation**: Body roll (Z-axis tilt) and pitch (X-axis tilt) react dynamically to centrifugal cornering forces and linear acceleration.

### 2. Perspective Projection & View Frustum
- Implemented using Three.js `PerspectiveCamera` with a configurable Field of View (FOV), aspect ratio matching the browser viewport, and near/far clipping planes ($0.2\text{m}$ to $1200\text{m}$).
- Dynamic FOV expansion (from $62^\circ$ to $78^\circ$) during high-speed nitro boosts creates a visceral visual sensation of linear acceleration and optical distortion.

### 3. Camera Transformation & Viewpoint Interpolation
- **Smooth Chase Camera**: Implemented in [FollowCamera.js](file:///src/camera/FollowCamera.js) using critically damped exponential lerp ($\vec{P}_{cam} = \text{lerp}(\vec{P}_{current}, \vec{P}_{ideal}, \alpha \cdot \Delta t)$).
- **Predictive Targeting**: Look-at vector targets a point projected forward along the vehicle heading vector to keep apexes and upcoming corners visible.
- **Camera Shake**: Damped harmonic oscillation offsets applied to the view matrix during barrier impacts and collisions.
- **Multi-view Support**: Switch between 3rd-person chase camera and 1st-person hood/cockpit camera using the `C` key.

### 4. Illumination & Lighting Models
- **Ambient Light**: Provides soft ambient baseline illumination preventing pitch-black shadows.
- **Directional Sun Light with Shadows**: High-resolution ($2048 \times 2048$) PCF soft shadow maps cast across the track, barriers, and vehicle chassis.
- **Dynamic Light Cascades**: The directional sun light matrix follows the player car dynamically along the track coordinates to maximize shadow resolution.
- **SpotLights & Night Beams**: Forward-facing spotlights with conical attenuation and penumbra for nighttime courses.

### 5. Physically Based Rendering (PBR) Materials & Shading
- Materials utilize `MeshStandardMaterial` based on the Cook-Torrance microfacet specular shading model:
  - Car paint: Low roughness ($0.2$) and high metalness ($0.6$) for glossy clearcoat reflections.
  - Tires: High roughness ($0.85$) and low metalness ($0.05$) simulating vulcanized rubber.
  - Glass: High transparency ($0.85$ opacity), low roughness ($0.1$), and metalness ($0.9$).
  - Emissive surfaces: Glowing neon road boundaries, LED headlights, and dynamic brake lights that brighten during deceleration.

### 6. Frame-Rate Independent Delta-Time Animation
- Uses `requestAnimationFrame` integrated with `THREE.Clock.getDelta()`.
- Physics updates (velocity, heading, friction, drift angle) are numerically integrated with $\Delta t$, guaranteeing uniform car speed and simulation consistency regardless of display refresh rate ($60\text{Hz}$, $120\text{Hz}$, or $144\text{Hz}$).

### 7. Collision Detection & Response
- **Parametric Track Clamping**: Calculates the perpendicular Euclidean distance from the vehicle position to the nearest spline point. If distance $> \text{halfWidth}$, the vehicle is clamped to the barrier, absorbing kinetic energy and triggering sparks.
- **Sphere & AABB Bounding Volumes**: Vehicle-to-vehicle collision detection between the player car and AI rivals using swept bounding spheres with elastic impulse resolution.
- **Checkpoint Plane Crossing**: Sequential checkpoint detection verifying directional progress along the race circuit.

### 8. Parametric Curves & Procedural Ribbon Geometry
- **Catmull-Rom Splines**: Centripetal `CatmullRomCurve3` creates smooth track waypoints without self-intersecting loops.
- **Frenet-Serret Moving Frames**: Generates continuous road ribbons by sampling tangent ($\vec{T}$), normal ($\vec{N}$), and binormal ($\vec{B}$) vectors at discrete intervals $u \in [0, 1]$.
- **Procedural UV Generation**: UV coordinates mapped continuously along the curve for repeatable asphalt road textures, rumble kerb stripes, and lane divider lines.

### 9. Particle Systems
- Real-time particle emitters implemented in [ParticleEffects.js](file:///src/effects/ParticleEffects.js):
  - **Tire Smoke**: Alpha-blended spherical billboard particles with upward velocity, damping, and scale expansion.
  - **Nitro Flames**: Conical high-speed exhaust jets emitted opposite to vehicle heading.
  - **Collision Sparks**: High-velocity randomized bouncing particles with gravity.
  - **Victory Confetti**: Celebratory 3D tumbling polygon flakes with rotational velocities.
  - **2D Speed Warp Canvas**: Radial screen-space motion streak lines rendered during hyperspeed.

### 10. Atmospheric Depth & Fog
- Depth cues established using `THREE.Fog` with level-specific near and far planes ($70\text{m}$ to $600\text{m}$).
- Exponential atmospheric haze complements background sky colors, simulating Rayleigh scattering and nighttime city atmospheric depth.

---

## 🛠️ Project Structure

```
Street Racer/
├── index.html                  # HTML5 UI, Canvas containers, HUD & Modals
├── style.css                   # Cyberpunk arcade responsive styling
├── package.json                # Project dependencies & Vite scripts
├── README.md                   # Documentation & CG concept guide
└── src/
    ├── main.js                 # Entry point bootstrapping the game engine
    ├── audio/
    │   └── AudioManager.js     # Web Audio API procedural sound synthesizer
    ├── camera/
    │   └── FollowCamera.js     # Smooth 3rd-person follow camera & shake
    ├── car/
    │   ├── CarBuilder.js       # Procedural 3D sports car hierarchy & materials
    │   ├── CarPhysics.js       # Vehicle physics, gears, drift & suspension
    │   ├── PlayerCar.js        # Player vehicle controller & night lights
    │   └── AICar.js            # Autonomous rival AI racers with spline navigation
    ├── effects/
    │   └── ParticleEffects.js  # Smoke, sparks, nitro flames, confetti, speed lines
    ├── game/
    │   ├── CollisionManager.js # Track boundary, checkpoint & vehicle collisions
    │   ├── Game.js             # Master game loop & Three.js WebGL scene
    │   ├── InputManager.js     # Keyboard event handling
    │   └── ProgressManager.js  # LocalStorage persistence, car stats, records
    ├── tracks/
    │   ├── TrackBuilder.js     # Continuous road ribbon extrusion & scenery
    │   └── TrackData.js        # Spline definitions for Levels 1–4
    └── ui/
        ├── HUD.js              # Speedometer, tachometer, nitro bar, minimap
        └── MenuManager.js      # Main menu, 3D garage viewer, modals
```

---

## 🚀 Running the Project

### Prerequisites
- Node.js (version 18 or newer recommended)
- NPM

### Development Server
```bash
# 1. Install dependencies (if not already installed)
npm install

# 2. Start Vite development server
npm run dev
```

Open `http://localhost:5173` in your modern web browser (Chrome, Edge, Firefox, or Safari).

### Production Build
```bash
# Build optimized bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 🏆 Championship Progression Guide

1. **Track 1: Rookie Rush** (Open by default)
   - Goal: Beat the introductory target time ($70\text{s}$) on a wide sunny city boulevard.
   - Victory unlocks **Track 2: Mountain Drift**!
2. **Track 2: Mountain Drift**
   - Goal: Navigate winding alpine hairpin bends and bridges before time expires ($85\text{s}$).
   - Victory unlocks **Track 3: Neon Nightfall**!
3. **Track 3: Neon Nightfall**
   - Goal: Race through glowing cyberpunk city streets with high-speed reflex maneuvers ($90\text{s}$).
   - Victory unlocks the final **Track 4: Grand Championship**!
4. **Track 4: Grand Championship**
   - Goal: 2 full laps against three aggressive AI champions in a packed stadium circuit ($135\text{s}$).
   - Win to achieve the **Championship Trophy & Victory Celebration**!
