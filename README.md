# City Watchkeeper

## 1. Game Title

**City Watchkeeper**

---

## 2. Group Members

- **Todd Crandell** — game system design, implementation of top-down movement, level design, art selection & integration.
- **Arvin Arbabi** — game system design, waves, upgrades, UI, and colorblind mode.

---

## 3. Gameplay Description & How to Play

### High-level concept

You play as the city watchkeeper of a small mausoleum at the edge of a haunted city. Spirits and skeletons pour in from the streets, trying to reach the mausoleum. Your job is to survive several “shifts” (enemy waves) and keep the mausoleum standing using a magical ward attack and slow-field totems.

### Core loop

1. Walk to the glowing **Altar** and press **E** to start a shift.
2. Survive the incoming wave of enemies while keeping them away from the mausoleum.
3. After a wave ends, return to the Altar, press **E**, and choose one of three upgrades.
4. Repeat until you beat the final boss wave or the mausoleum (or you) are destroyed.

### Controls

- **Move** – **WASD** or **Arrow Keys**
- **Ward Attack (cone in front of you)** – **Space** or **Left Mouse Button**
- **Ward Totem (slow field at your feet)** – **Shift** or **Right Mouse Button**
- **Interact (Altar / upgrades)** – **E** when near the glowing Altar
- **Pause** – **Esc** (Esc again to unpause)
- **Restart** – **R** on Game Over or Win screens

### Goal

- Keep both **your HP** and the **mausoleum HP** above zero through all waves.
- Defeat the final boss wave to **“survive the night”** and reach the win screen.

The top HUD shows:

- Player HP
- Mausoleum HP
- Totem charges
- Current wave out of total waves

The center-top text is used for short guidance messages (wave start, upgrades, etc.).

---

## 5. Features to Notice & How to Unlock Them

### Altar highlight & flow

- The altar is marked with a **pulsing yellow circle** and a floating **“Altar”** label.
- Standing near it and pressing **E** is how you **start shifts** and **open the upgrade menu** after a wave.

### Ward cone attack

- The ward is a short-range arc in front of the player, with a visible cone effect.
- It hits only enemies within a certain angle and range from your current facing direction.
- This encourages you to position and face enemies instead of just spamming a full-screen attack.

### Ward totems (slow fields)

- **Shift** / **Right-click** places a totem at your feet (limited charges).
- Enemies inside the totem radius are slowed, making it easier to ward them away from the mausoleum.
- Totems expire after a set time but charges slowly regenerate; managing them is part of the strategy.

### Upgrades between waves

- After clearing a wave, you must return to the Altar and press **E**.
- An upgrade screen appears with three options:
  - - Ward damage
  - - Movement speed
  - - Max totem charge & faster recharge
- Upgrade choices stack, leading to different “builds” (for example, a slower, tankier zoner vs. a faster glass cannon).

### Final boss wave (unlock condition)

- After you complete the three regular waves, the **final boss wave** starts.
- The boss spawns along with extra skeletons.
- Defeating the boss triggers the **blue “Night Survived!” win screen**, with instructions to press **R** to replay.

### Game Over & Restart

- If your HP or the mausoleum’s HP reaches zero:
  - The screen tints red with a big **“GAME OVER”** overlay.
  - You can press **R** to restart the entire run.

### Pause screen

- Press **Esc** at any time to pause.
- The pause overlay shows controls and instructions. Press **Esc** again to resume.

---

